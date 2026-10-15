"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireArea } from "@/server/auth/guard";
import { requestContext } from "@/server/auth/request-context";
import { refundOrder, voidTicket } from "@/server/orders/service";

export async function voidTicketAction(formData: FormData): Promise<void> {
  const session = await requireArea("admin");
  const context = await requestContext();
  const ticketId = stringField(formData, "ticketId");
  const orderId = stringField(formData, "orderId");
  const reason = stringField(formData, "reason") ?? "Anulación del administrador";
  if (!context.originOk || !ticketId || !orderId) redirect("/admin/ventas?aviso=accion");
  const result = await voidTicket({
    ticketId,
    reason,
    userId: session.userId,
    ip: context.ip,
  });
  revalidatePath(`/admin/ventas/${orderId}`);
  redirect(
    result && "error" in result
      ? `/admin/ventas/${orderId}?aviso=accion`
      : `/admin/ventas/${orderId}?aviso=anulada`,
  );
}

export async function refundOrderAction(formData: FormData): Promise<void> {
  const session = await requireArea("admin");
  const context = await requestContext();
  const orderId = stringField(formData, "orderId");
  if (!context.originOk || !orderId) redirect("/admin/ventas?aviso=accion");
  const result = await refundOrder({ orderId, userId: session.userId, ip: context.ip });
  revalidatePath(`/admin/ventas/${orderId}`);
  redirect(
    result && "error" in result
      ? `/admin/ventas/${orderId}?aviso=accion`
      : `/admin/ventas/${orderId}?aviso=reembolso`,
  );
}

function stringField(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
