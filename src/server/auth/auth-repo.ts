import { db } from "@/server/db";

import type { AuthRepo } from "./authenticate";
import { prismaRateLimitStore } from "./rate-limit-store";

export function prismaAuthRepo(): AuthRepo {
  return {
    async findByEmail(email) {
      const user = await db.user.findUnique({ where: { email } });
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        active: user.active,
        failedLoginCount: user.failedLoginCount,
        lockedUntil: user.lockedUntil,
        totpEnabled: user.totpEnabled,
        role: user.role,
      };
    },
    async updateLoginState(id, state) {
      await db.user.update({ where: { id }, data: state });
    },
    rateLimit: prismaRateLimitStore(),
  };
}
