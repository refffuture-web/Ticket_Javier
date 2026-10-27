"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  title: string;
  text: string;
  url: string;
  subject: string;
  prepareFiles: () => Promise<File[]>;
  variant?: "secondary" | "default" | "outline";
};

const noopSubscribe = () => () => {};

export function ShareButton({
  label,
  title,
  text,
  url,
  subject,
  prepareFiles,
  variant = "secondary",
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [files, setFiles] = useState<File[] | null>(null);
  const canNativeShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const prepareRef = useRef(prepareFiles);
  const preparingRef = useRef(false);

  useEffect(() => {
    prepareRef.current = prepareFiles;
  });

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // navigator.share solo funciona dentro del gesto del usuario: las imágenes se arman
  // cuando el botón entra en pantalla para no tener que esperarlas después del toque.
  useEffect(() => {
    const node = rootRef.current;
    if (!canNativeShare || files || !node) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || preparingRef.current) return;
      preparingRef.current = true;
      observer.disconnect();
      prepareRef
        .current()
        .then(setFiles)
        .catch(() => undefined)
        .finally(() => {
          preparingRef.current = false;
        });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [canNativeShare, files]);

  const fullText = `${text}\n${url}`;
  const encodedText = encodeURIComponent(fullText);
  const encodedUrl = encodeURIComponent(url);
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodedText}` },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(text)}`,
    },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "X (Twitter)", href: `https://twitter.com/intent/tweet?text=${encodedText}` },
    {
      label: "Gmail",
      href: `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodedText}`,
    },
    {
      label: "Correo",
      href: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodedText}`,
      sameTab: true,
    },
  ];

  function shareNative() {
    setError("");
    const withFiles = files && files.length > 0 && navigator.canShare?.({ files });
    const data: ShareData = withFiles
      ? { title, text: fullText, files }
      : { title, text, url };
    navigator
      .share(data)
      .then(() => setOpen(false))
      .catch((err: Error) => {
        if (err.name !== "AbortError") setOpen(true);
      });
  }

  async function copyText() {
    setError("");
    try {
      await navigator.clipboard.writeText(fullText);
      setNotice("Copiado. Pegalo donde quieras.");
      setTimeout(() => setNotice(""), 2500);
    } catch {
      setError("No se pudo copiar.");
    }
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-2">
      <div>
        <Button
          type="button"
          variant={variant}
          size="sm"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => (canNativeShare ? shareNative() : setOpen((value) => !value))}
        >
          {label}
        </Button>
      </div>

      {open ? (
        <div
          id={panelId}
          className="w-full rounded-xl border border-border bg-background p-2 shadow-sm sm:max-w-sm"
        >
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Elegí dónde compartir</p>
          {canNativeShare ? (
            <button
              type="button"
              className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted"
              onClick={shareNative}
            >
              Apps del teléfono{files ? " (con imagen)" : "…"}
            </button>
          ) : null}
          <div className="grid grid-cols-2 gap-1">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.sameTab ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="flex items-center rounded-lg px-3 py-2.5 text-sm hover:bg-muted"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              className="flex items-center rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted"
              onClick={copyText}
            >
              Copiar texto
            </button>
          </div>
        </div>
      ) : null}

      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
