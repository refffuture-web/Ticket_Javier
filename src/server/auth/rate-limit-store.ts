import { db } from "@/server/db";

import type { RateLimitStore } from "./rate-limit";

const DAY_MS = 24 * 60 * 60 * 1000;

export function prismaRateLimitStore(): RateLimitStore {
  return {
    async increment(key, bucketStart) {
      const row = await db.rateLimitBucket.upsert({
        where: { key_windowStart: { key, windowStart: bucketStart } },
        create: { key, windowStart: bucketStart, count: 1 },
        update: { count: { increment: 1 } },
      });
      if (row.count === 1) {
        await db.rateLimitBucket.deleteMany({
          where: { windowStart: { lt: new Date(bucketStart.getTime() - DAY_MS) } },
        });
      }
      return row.count;
    },
  };
}
