import { Secret, TOTP } from "otpauth";

const ISSUER = "Boletería";

function totpFor(secret: string): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label: ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

export function createTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export function totpUri(email: string, secret: string): string {
  return new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  }).toString();
}

export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const delta = totpFor(secret).validate({
    token: normalized,
    window: 1,
    timestamp: now,
  });
  return delta !== null;
}

export function currentTotp(secret: string, now = Date.now()): string {
  return totpFor(secret).generate({ timestamp: now });
}
