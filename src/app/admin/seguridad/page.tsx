import { Suspense } from "react";
import Link from "next/link";
import QRCode from "qrcode";

import { startTotpAction } from "@/app/admin/seguridad/actions";
import {
  ConfirmTotpForm,
  DisableTotpForm,
  PasswordForm,
} from "@/app/admin/seguridad/security-forms";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/server/auth/guard";
import { decryptString } from "@/server/auth/secret-box";
import { totpUri } from "@/server/auth/totp";
import { db } from "@/server/db";
import { env } from "@/server/env";

export const instant = false;

export default function SecurityPage() {
  return (
    <Suspense fallback={null}>
      <SecurityContent />
    </Suspense>
  );
}

async function SecurityContent() {
  const session = await requireArea("admin");
  const user = await db.user.findUnique({ where: { id: session.userId } });
  const secret =
    user?.totpSecretEnc && !user.totpEnabled
      ? decryptString(user.totpSecretEnc, env.APP_SECRET)
      : null;
  const qr = secret ? await QRCode.toDataURL(totpUri(session.email, secret)) : null;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Contraseña</h2>
        <PasswordForm />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Autenticación en dos pasos</h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          Recomendado para el administrador. Usá una aplicación como Google Authenticator
          o Authy.
        </p>
        {user?.totpEnabled ? (
          <DisableTotpForm />
        ) : secret && qr ? (
          <div className="flex flex-col gap-4">
            {/* El QR es un data URL generado en el momento. next/image no lo optimiza. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="Código QR para configurar la autenticación en dos pasos"
              width={180}
              height={180}
            />
            <p className="max-w-md break-all font-mono text-xs text-muted-foreground">
              {secret}
            </p>
            <ConfirmTotpForm />
          </div>
        ) : (
          <form action={startTotpAction}>
            <Button type="submit">Configurar</Button>
          </form>
        )}
      </section>
      <Link href="/admin" className="text-sm underline-offset-4 hover:underline">
        Volver al panel
      </Link>
    </div>
  );
}
