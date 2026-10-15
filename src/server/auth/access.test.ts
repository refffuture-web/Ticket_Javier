import { describe, expect, it } from "vitest";

import {
  decideAccess,
  homeForRole,
  rolesForArea,
  safeNextPath,
  type Role,
} from "./access";

const areas = ["/admin", "/boleteria", "/validar"] as const;
const roles: Role[] = ["ADMIN", "BOLETERIA", "VALIDADOR"];

describe("permisos por rol", () => {
  it("niega todo el staff si no hay sesión", () => {
    for (const path of areas) {
      expect(decideAccess(path, null)).toBe("login");
    }
    expect(decideAccess("/api/tickets/validate", null)).toBe("login");
  });

  it("deja pasar solo el área de cada rol y al administrador en todas", () => {
    const expected: Record<
      Role,
      Record<(typeof areas)[number], "allow" | "forbidden">
    > = {
      ADMIN: { "/admin": "allow", "/boleteria": "allow", "/validar": "allow" },
      BOLETERIA: {
        "/admin": "forbidden",
        "/boleteria": "allow",
        "/validar": "forbidden",
      },
      VALIDADOR: {
        "/admin": "forbidden",
        "/boleteria": "forbidden",
        "/validar": "allow",
      },
    };

    for (const role of roles) {
      for (const path of areas) {
        expect(decideAccess(path, role)).toBe(expected[role][path]);
      }
    }
  });

  it("trata las APIs internas como admin salvo salud, webhooks, cron y validación", () => {
    expect(decideAccess("/api/health", null)).toBe("allow");
    expect(decideAccess("/api/webhooks/mercadopago", null)).toBe("allow");
    expect(decideAccess("/api/cron/expire-orders", null)).toBe("allow");
    expect(decideAccess("/api/media/cover.jpg", null)).toBe("allow");
    expect(decideAccess("/api/users", "VALIDADOR")).toBe("forbidden");
    expect(decideAccess("/api/users", "ADMIN")).toBe("allow");
    expect(decideAccess("/api/tickets/validate", "VALIDADOR")).toBe("allow");
    expect(decideAccess("/api/events/evt/attendance", "BOLETERIA")).toBe("forbidden");
    expect(decideAccess("/api/events/evt/attendance", "VALIDADOR")).toBe("allow");
  });

  it("no acepta un next externo", () => {
    expect(safeNextPath("https://evil.test", "ADMIN")).toBe(homeForRole("ADMIN"));
    expect(safeNextPath("//evil.test", "ADMIN")).toBe("/admin");
    expect(safeNextPath("/admin/usuarios", "BOLETERIA")).toBe("/boleteria");
    expect(safeNextPath("/validar", "VALIDADOR")).toBe("/validar");
  });

  it("expone los roles de cada área", () => {
    expect(rolesForArea("admin")).toEqual(["ADMIN"]);
    expect(rolesForArea("boleteria")).toEqual(["ADMIN", "BOLETERIA"]);
    expect(rolesForArea("validar")).toEqual(["ADMIN", "VALIDADOR"]);
  });
});
