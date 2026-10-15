import type { Prisma } from "@prisma/client";

export async function reserveSeats(
  tx: Prisma.TransactionClient,
  ticketTypeId: string,
  eventId: string,
  quantity: number,
): Promise<boolean> {
  const updated = await tx.$executeRaw`
    UPDATE "TicketType"
    SET "reservedCount" = "reservedCount" + ${quantity}
    WHERE "id" = ${ticketTypeId}
      AND "eventId" = ${eventId}
      AND "active" = true
      AND "soldCount" + "reservedCount" + ${quantity} <= "capacity"
  `;
  return updated === 1;
}

export async function takeSoldSeats(
  tx: Prisma.TransactionClient,
  ticketTypeId: string,
  eventId: string,
  quantity: number,
): Promise<boolean> {
  const updated = await tx.$executeRaw`
    UPDATE "TicketType"
    SET "soldCount" = "soldCount" + ${quantity}
    WHERE "id" = ${ticketTypeId}
      AND "eventId" = ${eventId}
      AND "active" = true
      AND "soldCount" + "reservedCount" + ${quantity} <= "capacity"
  `;
  return updated === 1;
}

export async function confirmReservedSeats(
  tx: Prisma.TransactionClient,
  ticketTypeId: string,
  quantity: number,
): Promise<boolean> {
  const updated = await tx.$executeRaw`
    UPDATE "TicketType"
    SET "reservedCount" = "reservedCount" - ${quantity},
        "soldCount" = "soldCount" + ${quantity}
    WHERE "id" = ${ticketTypeId}
      AND "reservedCount" >= ${quantity}
  `;
  return updated === 1;
}

export async function releaseReservedSeats(
  tx: Prisma.TransactionClient,
  ticketTypeId: string,
  quantity: number,
): Promise<boolean> {
  const updated = await tx.$executeRaw`
    UPDATE "TicketType"
    SET "reservedCount" = "reservedCount" - ${quantity}
    WHERE "id" = ${ticketTypeId}
      AND "reservedCount" >= ${quantity}
  `;
  return updated === 1;
}

export async function returnSoldSeat(
  tx: Prisma.TransactionClient,
  ticketTypeId: string,
): Promise<boolean> {
  const updated = await tx.$executeRaw`
    UPDATE "TicketType"
    SET "soldCount" = "soldCount" - 1
    WHERE "id" = ${ticketTypeId}
      AND "soldCount" >= 1
  `;
  return updated === 1;
}
