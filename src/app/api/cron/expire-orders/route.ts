import { NextResponse } from "next/server";

import { env } from "@/server/env";
import { expireDueOrders } from "@/server/orders/service";

export async function GET(request: Request) {
  return expire(request);
}

export async function POST(request: Request) {
  return expire(request);
}

async function expire(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Cron no configurado" }, { status: 503 });
  }
  const header = request.headers.get("authorization");
  if (header !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const expired = await expireDueOrders(new Date());
  return NextResponse.json({ ok: true, expired });
}
