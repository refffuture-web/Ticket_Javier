"use client";

import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { formatDateTime, formatTime } from "@/lib/time";

type Result = "valid" | "used" | "void" | "wrong-event" | "invalid" | "rate-limited";

type Response = {
  result?: Result;
  ticketType?: string;
  shortCode?: string;
  usedAt?: string | null;
  usedBy?: string | null;
  remaining?: number | null;
  eventTitle?: string;
};

type Tone = "ok" | "warn" | "bad";

type Feedback = { tone: Tone; title: string; ticketType?: string; detail: string; at: Date };

type Detector = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};

const AUTO_KEY = "validar:auto";
const FEEDBACK_MS = 1800;
const SAME_CODE_MS = 4000;
const DETECTED_TTL_MS = 1500;

const autoListeners = new Set<() => void>();

function subscribeAuto(listener: () => void) {
  autoListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    autoListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function setAutoPreference(value: boolean) {
  window.localStorage.setItem(AUTO_KEY, value ? "1" : "0");
  autoListeners.forEach((listener) => listener());
}

export function Scanner({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState("");
  const [detected, setDetected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [checking, setChecking] = useState(false);
  const [history, setHistory] = useState<Feedback[]>([]);
  const auto = useSyncExternalStore(
    subscribeAuto,
    () => window.localStorage.getItem(AUTO_KEY) !== "0",
    () => true,
  );
  const autoRef = useRef(auto);
  const busyRef = useRef(false);
  const detectedRef = useRef<{ code: string; at: number } | null>(null);
  const lastAutoRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  useEffect(() => {
    autoRef.current = auto;
  }, [auto]);

  const submit = useCallback(
    async (token: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setChecking(true);
      let next: Feedback;
      try {
        const response = await fetch("/api/tickets/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, token }),
        });
        const body = (await response.json().catch(() => null)) as Response | null;
        next = describe(body);
      } catch {
        next = { tone: "bad", title: "Sin conexión", detail: "Probá de nuevo.", at: new Date() };
      }
      setChecking(false);
      setFeedback(next);
      setHistory((items) => [next, ...items].slice(0, 8));
      signal(next.tone);
      setDetected(null);
      detectedRef.current = null;
      if (next.tone === "ok") router.refresh();
      window.setTimeout(() => {
        setFeedback(null);
        busyRef.current = false;
      }, FEEDBACK_MS);
    },
    [eventId, router],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const element = video;
    let stopped = false;
    let stream: MediaStream | null = null;
    const BarcodeDetector = (
      window as unknown as {
        BarcodeDetector?: new (options: { formats: string[] }) => Detector;
      }
    ).BarcodeDetector;

    async function loop(detector: Detector) {
      if (stopped) return;
      try {
        const codes = await detector.detect(element);
        const raw = codes[0]?.rawValue?.trim();
        const now = Date.now();
        if (raw) {
          // Se actualiza aunque haya una validación en curso: un QR que sigue frente a
          // la cámara no se vuelve a enviar.
          const last = lastAutoRef.current;
          const repeated = last.code === raw && now - last.at < SAME_CODE_MS;
          lastAutoRef.current = { code: raw, at: now };
          if (!busyRef.current) {
            if (detectedRef.current?.code !== raw) setDetected(raw);
            detectedRef.current = { code: raw, at: now };
            if (autoRef.current && !repeated) await submit(raw);
          }
        } else if (detectedRef.current && now - detectedRef.current.at > DETECTED_TTL_MS) {
          detectedRef.current = null;
          setDetected(null);
        }
      } catch {
        // El cuadro todavía no está listo.
      }
      if (!stopped) window.setTimeout(() => void loop(detector), 250);
    }

    async function start() {
      if (!BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Este navegador no lee QR con la cámara. Escribí el código de la entrada.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        element.srcObject = stream;
        await element.play();
        setCameraError("");
        void loop(new BarcodeDetector({ formats: ["qr_code"] }));
      } catch {
        setCameraError("No se pudo abrir la cámara. Escribí el código de la entrada.");
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
      <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
        <span className="flex flex-col">
          <span className="text-sm font-medium">Validación automática</span>
          <span className="text-xs text-muted-foreground">
            {auto
              ? "Valida apenas la cámara ve un QR."
              : "La cámara detecta el QR y vos tocás Validar."}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={auto}
          onChange={(event) => setAutoPreference(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative h-7 w-12 shrink-0 rounded-full bg-zinc-300 transition-colors peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-ring after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
        />
      </label>

      <div className="relative overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} className="max-h-80 w-full object-cover" muted playsInline />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-6 rounded-2xl border-4 transition-colors ${
            detected ? "border-emerald-400" : "border-white/40"
          }`}
        />
      </div>

      {cameraError ? <p className="text-sm text-muted-foreground">{cameraError}</p> : null}

      {!auto ? (
        <Button
          type="button"
          size="lg"
          className="h-14 text-base"
          disabled={!detected}
          onClick={() => detected && void submit(detected)}
        >
          {detected ? "Validar QR detectado" : "Apuntá la cámara a un QR"}
        </Button>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {detected ? "Leyendo QR…" : "Esperando un QR."}
        </p>
      )}

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const token = String(new FormData(form).get("token") ?? "").trim();
          if (token) {
            void submit(token);
            form.reset();
          }
        }}
      >
        <label className="flex flex-col gap-1 text-sm" htmlFor="token">
          <span className="font-medium">Código de la entrada</span>
          <input
            id="token"
            name="token"
            autoComplete="off"
            spellCheck={false}
            placeholder="Ej. HR2MAMUX"
            className="h-10 rounded-lg border border-input px-3 font-mono uppercase"
          />
          <span className="text-muted-foreground">
            Si el QR no se lee, escribí el código corto que figura en la entrada.
          </span>
        </label>
        <Button type="submit" variant="outline">
          Validar código
        </Button>
      </form>

      {history.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Últimos intentos en este equipo</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {history.map((item, index) => (
              <li
                key={`${item.at.getTime()}-${index}`}
                className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2"
              >
                <ToneIcon tone={item.tone} className={`size-4 shrink-0 ${TONE_TEXT[item.tone]}`} />
                <span className="font-medium">{item.title}</span>
                {item.ticketType ? (
                  <span className="shrink-0 rounded-md bg-background px-1.5 py-0.5 text-xs font-semibold">
                    {item.ticketType}
                  </span>
                ) : null}
                <span className="truncate text-muted-foreground">{item.detail}</span>
                <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                  {formatTime(item.at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {checking ? (
        <div
          role="status"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-zinc-900/90 p-8 text-center text-white"
        >
          <span className="size-20 animate-spin rounded-full border-8 border-white/25 border-t-white" />
          <span className="text-3xl font-semibold tracking-tight">Validando…</span>
          <span className="text-base text-white/80">{eventTitle}</span>
        </div>
      ) : null}

      {feedback ? (
        <button
          type="button"
          onClick={() => setFeedback(null)}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-8 text-center text-white ${
            feedback.tone === "ok"
              ? "bg-emerald-600"
              : feedback.tone === "warn"
                ? "bg-amber-500"
                : "bg-red-600"
          }`}
        >
          <span className="absolute inset-x-0 top-0 px-4 py-3 text-sm font-medium text-white/85">
            {eventTitle}
          </span>
          <ToneIcon tone={feedback.tone} className="size-32 text-white" strokeWidth={2.25} />
          <span className="text-4xl font-bold tracking-tight">{feedback.title}</span>
          {feedback.ticketType ? (
            <span className="rounded-2xl bg-white px-6 py-2 text-3xl font-extrabold uppercase tracking-wide text-zinc-900">
              {feedback.ticketType}
            </span>
          ) : null}
          {feedback.detail ? (
            <span className="max-w-sm text-lg text-white/90">{feedback.detail}</span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}

function ToneIcon({
  tone,
  className,
  strokeWidth,
}: {
  tone: Tone;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = tone === "ok" ? CircleCheck : tone === "warn" ? CircleAlert : CircleX;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

const TONE_TEXT: Record<Tone, string> = {
  ok: "text-emerald-600",
  warn: "text-amber-600",
  bad: "text-red-600",
};

function describe(body: Response | null): Feedback {
  const at = new Date();
  const result = body?.result ?? "invalid";
  const code = body?.shortCode ?? "";
  const ticketType = body?.ticketType;
  if (result === "valid") {
    const remaining =
      typeof body?.remaining === "number"
        ? `${body.remaining === 1 ? "Falta" : "Faltan"} ${body.remaining} ${ticketType ?? ""} por entrar`
        : "";
    return {
      tone: "ok",
      title: "Entrada válida",
      ticketType,
      detail: [code, remaining].filter(Boolean).join(" · "),
      at,
    };
  }
  if (result === "used") {
    const when = body?.usedAt ? formatDateTime(new Date(body.usedAt)) : "";
    const who = body?.usedBy ? ` por ${body.usedBy}` : "";
    return {
      tone: "warn",
      title: "Ya ingresó",
      ticketType,
      detail: [code, when ? `entró el ${when}${who}` : ""].filter(Boolean).join(" · "),
      at,
    };
  }
  if (result === "void") {
    return { tone: "bad", title: "Entrada anulada", ticketType, detail: code, at };
  }
  if (result === "wrong-event") {
    return {
      tone: "bad",
      title: "Es de otro evento",
      ticketType,
      detail: [code, body?.eventTitle].filter(Boolean).join(" · "),
      at,
    };
  }
  if (result === "rate-limited") {
    return { tone: "warn", title: "Demasiados intentos", detail: "Esperá un momento.", at };
  }
  return { tone: "bad", title: "QR no válido", detail: "No corresponde a ninguna entrada.", at };
}

function signal(tone: Tone) {
  navigator.vibrate?.(tone === "ok" ? 150 : [90, 70, 90, 70, 90]);
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();
    const tones = tone === "ok" ? [880] : tone === "warn" ? [520, 520] : [260, 220];
    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.18;
      oscillator.frequency.value = frequency;
      oscillator.type = tone === "ok" ? "sine" : "square";
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.16);
    });
    window.setTimeout(() => void context.close(), 800);
  } catch {
    // Sin audio disponible.
  }
}
