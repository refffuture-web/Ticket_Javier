"use server";

import type { ContactStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { writeAudit } from "@/server/audit";
import { requireArea } from "@/server/auth/guard";
import { requestContext } from "@/server/auth/request-context";
import { db } from "@/server/db";

const STATUSES: ContactStatus[] = ["NUEVO", "CONTACTADO", "ARCHIVADO"];

export async function setContactStatusAction(formData: FormData): Promise<void> {
  const session = await requireArea("admin");
  const context = await requestContext();
  const id = formData.get("id");
  const status = formData.get("status");
  if (
    !context.originOk ||
    typeof id !== "string" ||
    !STATUSES.includes(status as ContactStatus)
  ) {
    return;
  }
  await db.organizerContact.update({
    where: { id },
    data: { status: status as ContactStatus },
  });
  await writeAudit({
    userId: session.userId,
    action: "contact.status",
    entity: "OrganizerContact",
    entityId: id,
    metadata: { status: status as string },
    ip: context.ip,
  });
  revalidatePath("/admin/contactos");
}
