import { describe, expect, it } from "vitest";

import { originAllowed, sameOrigin } from "./origin";

describe("origen de la petición", () => {
  it("acepta el mismo origen que APP_URL", () => {
    expect(sameOrigin("http://localhost:3000", "http://localhost:3000")).toBe(true);
    expect(sameOrigin("https://evil.test", "http://localhost:3000")).toBe(false);
    expect(sameOrigin(null, "http://localhost:3000")).toBe(false);
  });

  it("acepta el host del request aunque APP_URL sea localhost", () => {
    expect(
      originAllowed(
        "https://ticket-ten-blond.vercel.app",
        "http://localhost:3000",
        "ticket-ten-blond.vercel.app",
        "https",
      ),
    ).toBe(true);
    expect(
      originAllowed(
        "https://evil.test",
        "http://localhost:3000",
        "ticket-ten-blond.vercel.app",
        "https",
      ),
    ).toBe(false);
  });
});
