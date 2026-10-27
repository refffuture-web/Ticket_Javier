export const APP_TIME_ZONE = "America/Argentina/Mendoza";

export function formatDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const hour = value.hour === "24" ? "00" : value.hour;
  return `${value.day}/${value.month}/${value.year} · ${hour}:${value.minute}`;
}

export function formatTimeWithSeconds(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatDate(date: Date): string {
  return formatDateTime(date).split(" · ")[0] ?? "";
}

export function formatTime(date: Date): string {
  return formatDateTime(date).split(" · ")[1] ?? "";
}

/** Ej. "24 oct" para banners. */
export function formatShortDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const month = (value.month ?? "").replace(/\.$/, "");
  return `${value.day} ${month}`;
}

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/;

export function mendozaLocalToUtc(value: string): Date | null {
  const match = LOCAL_INPUT.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const offset = timeZoneOffsetMs(new Date(wallAsUtc), APP_TIME_ZONE);
  const utc = wallAsUtc - offset;
  const corrected = timeZoneOffsetMs(new Date(utc), APP_TIME_ZONE);
  const result = new Date(wallAsUtc - corrected);
  if (
    utcToMendozaLocalInput(result) !==
    `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`
  ) {
    return null;
  }
  return result;
}

export function utcToMendozaLocalInput(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const hour = value.hour === "24" ? "00" : value.hour;
  return `${value.year}-${value.month}-${value.day}T${hour}:${value.minute}`;
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const hour = value.hour === "24" ? "00" : value.hour;
  const wall = Date.UTC(
    Number(value.year),
    Number(value.month) - 1,
    Number(value.day),
    Number(hour),
    Number(value.minute),
    Number(value.second),
  );
  return wall - date.getTime();
}
