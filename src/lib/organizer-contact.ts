export const EVENT_TYPES = [
  "Recital / concierto",
  "Fiesta / boliche",
  "Teatro / stand up",
  "Festival",
  "Evento deportivo",
  "Evento corporativo",
  "Otro",
] as const;

export const AUDIENCES = [
  "Hasta 200 personas",
  "200 a 500",
  "500 a 1.000",
  "1.000 a 5.000",
  "Más de 5.000",
] as const;

export type ContactFormState = { ok: boolean; error: string };
