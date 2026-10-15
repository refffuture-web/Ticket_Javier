import { z } from "zod";

const blankToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const optionalString = z.preprocess(blankToUndefined, z.string().min(1).optional());
const optionalEmail = z.preprocess(blankToUndefined, z.email().optional());
const optionalPort = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().positive().optional(),
);

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL debe ser una URL de PostgreSQL",
    ),
  APP_URL: z.url(),
  APP_SECRET: z.string().min(32),
  QR_SECRET: z.string().min(32),
  UPLOAD_DIR: optionalString,
  ADMIN_EMAIL: optionalEmail,
  ADMIN_INITIAL_PASSWORD: optionalString,
  MP_ACCESS_TOKEN: optionalString,
  MP_WEBHOOK_SECRET: optionalString,
  CRON_SECRET: optionalString,
  EMAIL_FROM: optionalEmail,
  RESEND_API_KEY: optionalString,
  SMTP_HOST: optionalString,
  SMTP_PORT: optionalPort,
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Variables de entorno inválidas: ${fields}`);
  }
  return parsed.data;
}

export const env = loadEnv();
