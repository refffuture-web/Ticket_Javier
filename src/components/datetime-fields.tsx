"use client";

import { useId, useState } from "react";

const inputClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Props = {
  name: string;
  dateLabel?: string;
  timeLabel?: string;
  defaultValue?: string;
  required?: boolean;
  hint?: string;
};

function splitLocal(value?: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const [date = "", time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

function combine(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "00:00"}`;
}

/** Fecha (día/mes/año en el navegador) y horario por separado. */
export function DateTimeFields({
  name,
  dateLabel = "Fecha",
  timeLabel = "Horario",
  defaultValue,
  required = false,
  hint,
}: Props) {
  const baseId = useId();
  const initial = splitLocal(defaultValue);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${baseId}-date`}>
          <span className="font-medium">{dateLabel}</span>
          <input
            id={`${baseId}-date`}
            type="date"
            className={inputClass}
            value={date}
            required={required}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${baseId}-time`}>
          <span className="font-medium">{timeLabel}</span>
          <input
            id={`${baseId}-time`}
            type="time"
            className={inputClass}
            value={time}
            required={required && Boolean(date)}
            onChange={(event) => setTime(event.target.value)}
          />
        </label>
      </div>
      <input type="hidden" name={name} value={combine(date, time)} />
      {hint ? <span className="text-sm text-muted-foreground">{hint}</span> : null}
    </div>
  );
}
