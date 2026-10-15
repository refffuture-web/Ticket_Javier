import { hash, verify } from "@node-rs/argon2";

const ARGON_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$5jWBw9b7MhBJyDdlM0UtEg$bmtIeboIMY14j4yohM4JSgPKsafvKaCUkpKNZ7mhyfA";

export function passwordPolicyError(password: string): string | null {
  if (password.length < 12) {
    return "La contraseña debe tener al menos 12 caracteres";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "La contraseña debe incluir al menos una letra y un número";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const policy = passwordPolicyError(password);
  if (policy) {
    throw new Error(policy);
  }
  return hash(password, ARGON_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password, ARGON_OPTIONS);
  } catch {
    return false;
  }
}
