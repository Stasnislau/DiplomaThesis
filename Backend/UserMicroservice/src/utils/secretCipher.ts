import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Symmetric encryption for at-rest secrets (currently: user-supplied
 * AI provider tokens).
 *
 * Wire format: a single base64 string of [12-byte IV][16-byte tag][ciphertext].
 * The plaintext leaves the process only when the request is authorised
 * to read it (Bridge with the internal-service-key, after a fresh JWT
 * round-trip).
 *
 * KEY_ENCRYPTION_KEY: 32 raw bytes encoded as base64 (64 hex digits also
 * accepted as a fallback). Generate with `openssl rand -base64 32`.
 *
 * The format is versioned via a 1-byte prefix so future rotations can
 * coexist with old rows in the DB without an in-place re-encrypt.
 */

const VERSION = 0x01;
const IV_LENGTH = 12; // GCM standard
const TAG_LENGTH = 16;

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.KEY_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "KEY_ENCRYPTION_KEY is not set. Generate one with " +
        "`openssl rand -base64 32` and put it in .env.",
    );
  }
  // Accept either base64 or hex.
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== 32) {
    throw new Error(
      `KEY_ENCRYPTION_KEY must decode to 32 bytes; got ${key.length}`,
    );
  }
  cachedKey = key;
  return key;
}

/** Encrypt a plaintext secret. Returns a base64 envelope safe to
 *  store in a Postgres `String` column. */
export function encryptSecret(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([VERSION]), iv, tag, enc]).toString(
    "base64",
  );
}

/** Decrypt an envelope produced by `encryptSecret`. Falls back to the
 *  raw input if it doesn't look like an envelope — that's how we read
 *  legacy plaintext rows during the on-the-fly migration window. */
export function decryptSecret(envelope: string): string {
  if (!envelope) return envelope;
  // Best-effort detection: a real envelope is base64-only and at least
  // version + iv + tag + 1 byte of ciphertext.
  let buf: Buffer;
  try {
    buf = Buffer.from(envelope, "base64");
  } catch {
    return envelope;
  }
  if (buf.length < 1 + IV_LENGTH + TAG_LENGTH + 1) return envelope;
  if (buf[0] !== VERSION) return envelope;

  const iv = buf.subarray(1, 1 + IV_LENGTH);
  const tag = buf.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + TAG_LENGTH);
  const data = buf.subarray(1 + IV_LENGTH + TAG_LENGTH);

  const key = loadKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    // Auth tag mismatch — most likely the env key changed or the row
    // was tampered with. Caller must NOT silently treat the cipher
    // text as a token.
    throw new Error("Failed to decrypt stored secret (bad key or tampered row)");
  }
}

/** Heuristic: does a string look like an already-encrypted envelope?
 *  Used by the lazy migration on read so we don't double-encrypt. */
export function looksEncrypted(value: string): boolean {
  if (!value) return false;
  let buf: Buffer;
  try {
    buf = Buffer.from(value, "base64");
  } catch {
    return false;
  }
  return (
    buf.length >= 1 + IV_LENGTH + TAG_LENGTH + 1 && buf[0] === VERSION
  );
}
