import { describe, expect, it } from "vitest";

import { decryptString, encryptString } from "./secret-box";

describe("cifrado del secreto TOTP", () => {
  it("recupera el texto y falla con otra clave", () => {
    const key = "app-secret-de-prueba-con-32-chars";
    const encrypted = encryptString("SECRETOBASE32", key);
    expect(decryptString(encrypted, key)).toBe("SECRETOBASE32");
    expect(decryptString(encrypted, "otra-clave-distinta-de-32-caracteres")).toBeNull();
  });
});
