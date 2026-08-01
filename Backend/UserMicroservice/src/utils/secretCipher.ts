import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = 0x01;
const IV_LENGTH = 12;
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

export function decryptSecret(envelope: string): string {
  if (!envelope) return envelope;
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
    throw new Error(
      "Failed to decrypt stored secret (bad key or tampered row)",
    );
  }
}

export function looksEncrypted(value: string): boolean {
  if (!value) return false;
  let buf: Buffer;
  try {
    buf = Buffer.from(value, "base64");
  } catch {
    return false;
  }
  return buf.length >= 1 + IV_LENGTH + TAG_LENGTH + 1 && buf[0] === VERSION;
}
