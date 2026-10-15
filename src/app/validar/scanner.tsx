"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type Result = "valid" | "used" | "void" | "wrong-event" | "invalid" | "rate-limited";

export function Scanner({ eventId }: { eventId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState("Esperando un QR.");
  const [tone, setTone] = useState<"ok" | "bad" | "idle">("idle");
  const [cameraError, setCameraError] = useState("");
  const lastToken = useRef("");

  const submit = useCallback(
    async (token: string) => {
      const response = await fetch("/api/tickets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, token }),
      });
      const body = (await response.json().catch(() => null)) as {
        result?: Result;
        ticketType?: string;
        shortCode?: string;
      } | null;
      const result = body?.result ?? "invalid";
      if (result === "valid") {
        setTone("ok");
        setMessage(
          `Entrada válida · ${body?.ticketType ?? ""} · ${body?.shortCode ?? ""}`,
        );
        return;
      }
      setTone("bad");
      setMessage(resultText(result));
    },
    [eventId],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const element = video;
    let stopped = false;
    let stream: MediaStream | null = null;
    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (options: { formats: string[] }) => {
          detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
        };
      }
    ).BarcodeDetector;

    async function loop(detector: {
      detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
    }) {
      if (stopped) return;
      try {
        const codes = await detector.detect(element);
        const raw = codes[0]?.rawValue;
        if (raw && raw !== lastToken.current) {
          lastToken.current = raw;
          await submit(raw);
        }
      } catch {
        // El cuadro todavía no está listo.
      }
      if (!stopped) window.setTimeout(() => void loop(detector), 400);
    }

    async function start() {
      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Este navegador no lee la cámara. Pegá el código del QR.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        element.srcObject = stream;
        await element.play();
        void loop(new Detector({ formats: ["qr_code"] }));
      } catch {
        setCameraError("No se pudo abrir la cámara. Pegá el código del QR.");
      }
    }

    void start();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [eventId, submit]);

  return (
    <div className="flex flex-col gap-4">
      <video
        ref={videoRef}
        className="max-h-72 w-full rounded-lg bg-black"
        muted
        playsInline
      />
      {cameraError ? (
        <p className="text-sm text-muted-foreground">{cameraError}</p>
      ) : null}
      <p
        className={
          tone === "ok"
            ? "text-sm font-medium"
            : tone === "bad"
              ? "text-sm text-destructive"
              : "text-sm"
        }
      >
        {message}
      </p>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const token = String(data.get("token") ?? "").trim();
          if (token) void submit(token);
        }}
      >
        <label className="flex flex-col gap-1 text-sm" htmlFor="token">
          <span className="font-medium">Código del QR</span>
          <input
            id="token"
            name="token"
            className="h-10 rounded-lg border border-input px-3"
          />
        </label>
        <Button type="submit">Validar</Button>
      </form>
    </div>
  );
}

function resultText(result: Result): string {
  if (result === "used") return "Esa entrada ya ingresó.";
  if (result === "void") return "Esa entrada está anulada.";
  if (result === "wrong-event") return "Esa entrada es de otro evento.";
  if (result === "rate-limited") return "Demasiados intentos. Esperá un momento.";
  return "El QR no es válido.";
}
