export type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

/** Tiempo que falta hasta `targetMs`. `null` si el instante ya pasó o no es válido. */
export function remainingParts(targetMs: number, nowMs: number): Remaining | null {
  const diff = targetMs - nowMs;
  if (!Number.isFinite(diff) || diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function countdownLabel(parts: Remaining): string {
  return `Faltan ${plural(parts.days, "día", "días")}, ${plural(parts.hours, "hora", "horas")}, ${plural(parts.minutes, "minuto", "minutos")} y ${plural(parts.seconds, "segundo", "segundos")}`;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
