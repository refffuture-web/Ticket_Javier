import "dotenv/config";
import { hashPassword, passwordPolicyError } from "../src/server/auth/password";
import { db } from "../src/server/db";
import { env } from "../src/server/env";

async function main() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_INITIAL_PASSWORD) {
    console.log("Seed omitido: faltan ADMIN_EMAIL o ADMIN_INITIAL_PASSWORD");
    return;
  }

  const policy = passwordPolicyError(env.ADMIN_INITIAL_PASSWORD);
  if (policy) {
    throw new Error(policy);
  }

  const existing = await db.user.findUnique({ where: { email: env.ADMIN_EMAIL } });
  if (existing) {
    console.log("El administrador ya existe");
    return;
  }

  await db.user.create({
    data: {
      name: "Administrador",
      email: env.ADMIN_EMAIL,
      passwordHash: await hashPassword(env.ADMIN_INITIAL_PASSWORD),
      role: "ADMIN",
    },
  });
  console.log("Administrador creado");
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "No se pudo crear el administrador",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
