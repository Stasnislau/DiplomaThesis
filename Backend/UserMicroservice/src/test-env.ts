// Test-only env shims. The encrypt-at-rest helper refuses to run
// without KEY_ENCRYPTION_KEY, which is correct for prod but would
// force every spec to populate it manually otherwise.
process.env.KEY_ENCRYPTION_KEY =
  process.env.KEY_ENCRYPTION_KEY ??
  // 32 bytes of base64 = 44 chars; this is a deterministic test key,
  // never used outside of jest.
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

process.env.INTERNAL_SERVICE_KEY =
  process.env.INTERNAL_SERVICE_KEY ?? "test-internal-key";
