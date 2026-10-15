import { describe, expect, it } from "vitest";

import { sameOrigin } from "./origin";

describe("origen", () => {
  it("acepta solo el origen de la aplicación", () => {
    expect(sameOrigin("http://localhost:3000", "http://localhost:3000")).toBe(true);
    expect(sameOrigin("https://evil.test", "http://localhost:3000")).toBe(false);
    expect(sameOrigin(null, "http://localhost:3000")).toBe(false);
  });
});
