import { headers } from "next/headers";

import { env } from "@/server/env";

import { originAllowed } from "./origin";

export async function requestContext(): Promise<{
  ip: string;
  userAgent: string | null;
  originOk: boolean;
}> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = (forwarded || headerStore.get("x-real-ip") || "desconocida").slice(0, 64);
  return {
    ip: ip.length > 0 ? ip : "desconocida",
    userAgent: headerStore.get("user-agent"),
    originOk: originAllowed(
      headerStore.get("origin"),
      env.APP_URL,
      headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
      headerStore.get("x-forwarded-proto"),
    ),
  };
}
