import type { ReactNode } from "react";

import { StaffShell } from "@/components/staff-shell";
import { requireArea } from "@/server/auth/guard";

export default async function BoleteriaLayout({ children }: { children: ReactNode }) {
  await requireArea("boleteria");
  return <StaffShell title="Boletería">{children}</StaffShell>;
}
