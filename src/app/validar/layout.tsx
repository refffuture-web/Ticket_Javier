import type { ReactNode } from "react";

import { StaffShell } from "@/components/staff-shell";
import { requireArea } from "@/server/auth/guard";

export default async function ValidarLayout({ children }: { children: ReactNode }) {
  await requireArea("validar");
  return <StaffShell title="Validación">{children}</StaffShell>;
}
