const KEY_A = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const KEY_B = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=";

const loadCipher = (key?: string) => {
  jest.resetModules();
  if (key === undefined) {
    delete process.env.KEY_ENCRYPTION_KEY;
  } else {
    process.env.KEY_ENCRYPTION_KEY = key;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("./secretCipher") as typeof import("./secretCipher");
};

describe("secretCipher", () => {
  const originalKey = process.env.KEY_ENCRYPTION_KEY;

  afterEach(() => {
    process.env.KEY_ENCRYPTION_KEY = originalKey;
    jest.resetModules();
  });

  describe("round trip", () => {
    it("returns the original secret after a decrypt", () => {
      const { encryptSecret, decryptSecret } = loadCipher(KEY_A);
      const token = "sk-live-0123456789";

      expect(decryptSecret(encryptSecret(token))).toBe(token);
    });

    it("keeps the plaintext out of the stored envelope", () => {
      const { encryptSecret } = loadCipher(KEY_A);
      const token = "sk-live-0123456789";

      const envelope = encryptSecret(token);

      expect(envelope).not.toContain(token);
      expect(Buffer.from(envelope, "base64").toString("utf8")).not.toContain(
        token,
      );
    });

    it("produces a different envelope every time for the same secret", () => {
      const { encryptSecret } = loadCipher(KEY_A);

      const first = encryptSecret("same-token");
      const second = encryptSecret("same-token");

      expect(first).not.toBe(second);
    });

    it("survives a secret with non-ASCII characters", () => {
      const { encryptSecret, decryptSecret } = loadCipher(KEY_A);
      const token = "ключ-ł-字";

      expect(decryptSecret(encryptSecret(token))).toBe(token);
    });
  });

  describe("refusal to guess", () => {
    it("throws when the row was changed after it was written", () => {
      const { encryptSecret, decryptSecret } = loadCipher(KEY_A);
      const buf = Buffer.from(encryptSecret("sk-live-0123456789"), "base64");
      buf[buf.length - 1] ^= 0xff;

      expect(() => decryptSecret(buf.toString("base64"))).toThrow(
        /Failed to decrypt/,
      );
    });

    it("throws when the key no longer matches the one used to write", () => {
      const written = loadCipher(KEY_A).encryptSecret("sk-live-0123456789");
      const { decryptSecret } = loadCipher(KEY_B);

      expect(() => decryptSecret(written)).toThrow(/Failed to decrypt/);
    });

    it("refuses to start without a key at all", () => {
      const { encryptSecret } = loadCipher(undefined);

      expect(() => encryptSecret("anything")).toThrow(/KEY_ENCRYPTION_KEY/);
    });

    it("rejects a key that does not decode to 32 bytes", () => {
      const { encryptSecret } = loadCipher("dG9vLXNob3J0");

      expect(() => encryptSecret("anything")).toThrow(/32 bytes/);
    });
  });

  describe("legacy rows", () => {
    it("hands back a plaintext row untouched", () => {
      const { decryptSecret } = loadCipher(KEY_A);

      expect(decryptSecret("plain-old-token")).toBe("plain-old-token");
    });

    it("hands back an empty value untouched", () => {
      const { decryptSecret } = loadCipher(KEY_A);

      expect(decryptSecret("")).toBe("");
    });

    it("recognises its own envelopes and nothing else", () => {
      const { encryptSecret, looksEncrypted } = loadCipher(KEY_A);

      expect(looksEncrypted(encryptSecret("sk-live-0123456789"))).toBe(true);
      expect(looksEncrypted("plain-old-token")).toBe(false);
      expect(looksEncrypted("")).toBe(false);
    });

    it("does not mistake a long base64 string with a foreign version byte", () => {
      const { looksEncrypted } = loadCipher(KEY_A);
      const foreign = Buffer.alloc(40, 0);
      foreign[0] = 0x09;

      expect(looksEncrypted(foreign.toString("base64"))).toBe(false);
    });
  });

  it("accepts a hex key as well as base64", () => {
    const hexKey = "a".repeat(64);
    const { encryptSecret, decryptSecret } = loadCipher(hexKey);

    expect(decryptSecret(encryptSecret("sk-live-hex"))).toBe("sk-live-hex");
  });
});
