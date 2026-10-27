"use client";

import { useEffect, useState } from "react";

import { countdownLabel, pad2, remainingParts, type Remaining } from "@/lib/countdown";

const UNITS = [
  { key: "days", label: "Días" },
  { key: "hours", label: "Horas" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Seg" },
] as const;

/** Contador hasta el inicio del evento. Cada evento usa su propia fecha. */
export function EventCountdown({
  startsAt,
  variant = "hero",
  surface = "dark",
}: {
  startsAt: string;
  variant?: "hero" | "compact";
  surface?: "dark" | "light";
}) {
  const target = new Date(startsAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const parts = now === null ? undefined : remainingParts(target, now);

  if (variant === "compact") {
    return <CompactCountdown parts={parts} surface={surface} />;
  }
  return <HeroCountdown parts={parts} surface={surface} />;
}

function HeroCountdown({
  parts,
  surface,
}: {
  parts: Remaining | null | undefined;
  surface: "dark" | "light";
}) {
  if (parts === null) return <StartedNotice surface={surface} />;

  const light = surface === "light";
  return (
    <div
      role="timer"
      aria-label={ariaLabel(parts)}
      className="grid grid-cols-4 gap-2"
    >
      {UNITS.map((unit) => (
        <div
          key={unit.key}
          className={
            light
              ? "flex flex-col items-center rounded-xl bg-black px-1.5 py-2.5 text-white"
              : "flex flex-col items-center rounded-xl bg-white/10 px-1.5 py-2.5 text-white ring-1 ring-white/15"
          }
        >
          <span className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
            {parts ? pad2(parts[unit.key]) : "––"}
          </span>
          <span
            className={`text-[10px] font-medium tracking-[0.16em] uppercase ${light ? "text-green-400" : "text-green-300"}`}
          >
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function CompactCountdown({
  parts,
  surface,
}: {
  parts: Remaining | null | undefined;
  surface: "dark" | "light";
}) {
  if (parts === null) return <StartedNotice surface={surface} />;

  const light = surface === "light";
  const value =
    parts === undefined
      ? "––:––:––"
      : `${parts.days > 0 ? `${parts.days}d ` : ""}${pad2(parts.hours)}:${pad2(parts.minutes)}:${pad2(parts.seconds)}`;

  return (
    <p
      role="timer"
      aria-label={ariaLabel(parts)}
      className={`inline-flex items-center gap-2 text-sm font-medium ${light ? "text-black" : "text-white"}`}
    >
      <span
        className={`text-[10px] font-semibold tracking-[0.16em] uppercase ${light ? "text-green-800" : "text-green-300"}`}
      >
        Faltan
      </span>
      <span className="font-mono tabular-nums">{value}</span>
    </p>
  );
}

function StartedNotice({ surface }: { surface: "dark" | "light" }) {
  return (
    <p
      role="timer"
      aria-label="El evento ya comenzó"
      className={`text-sm font-medium ${surface === "light" ? "text-green-800" : "text-green-300"}`}
    >
      Ya comenzó
    </p>
  );
}

function ariaLabel(parts: Remaining | null | undefined): string {
  if (parts === undefined) return "Calculando el tiempo que falta";
  if (parts === null) return "El evento ya comenzó";
  return countdownLabel(parts);
}
