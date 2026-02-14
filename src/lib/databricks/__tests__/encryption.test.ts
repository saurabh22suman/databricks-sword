import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock process.env before importing encryption module
const originalEnv = process.env;

describe("encryption", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      AES_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", // 64-char hex key (32 bytes / 256-bit)
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("encryptPat and decryptPat", () => {
    it("encrypt → decrypt round-trip produces original value", async () => {
      const { encryptPat, decryptPat } = await import("../encryption");
      const originalPat = "dapiabc123xyz789secrettoken";

      const encrypted = encryptPat(originalPat);
      const decrypted = decryptPat(encrypted);

      expect(decrypted).toBe(originalPat);
    });

    it("different inputs produce different ciphertexts", async () => {
      const { encryptPat } = await import("../encryption");
      const pat1 = "dapi_first_token";
      const pat2 = "dapi_second_token";

      const encrypted1 = encryptPat(pat1);
      const encrypted2 = encryptPat(pat2);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("same input produces different ciphertexts due to random IV", async () => {
      const { encryptPat } = await import("../encryption");
      const pat = "dapi_same_token";

      const encrypted1 = encryptPat(pat);
      const encrypted2 = encryptPat(pat);

      // Both should decrypt to same value but have different ciphertext
      expect(encrypted1).not.toBe(encrypted2);
    });

    it("encrypted output contains only valid base64 characters", async () => {
      const { encryptPat } = await import("../encryption");
      const pat = "dapi_test_token_123";

      const encrypted = encryptPat(pat);

      // Base64 regex: alphanumeric, +, /, = for padding
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it("handles empty string", async () => {
      const { encryptPat, decryptPat } = await import("../encryption");

      const encrypted = encryptPat("");
      const decrypted = decryptPat(encrypted);

      expect(decrypted).toBe("");
    });

    it("handles special characters in PAT", async () => {
      const { encryptPat, decryptPat } = await import("../encryption");
      const specialPat = "dapi_!@#$%^&*()_+-={}[]|:;<>?.,";

      const encrypted = encryptPat(specialPat);
      const decrypted = decryptPat(encrypted);

      expect(decrypted).toBe(specialPat);
    });

    it("handles long PAT values", async () => {
      const { encryptPat, decryptPat } = await import("../encryption");
      const longPat = "dapi_" + "x".repeat(500);

      const encrypted = encryptPat(longPat);
      const decrypted = decryptPat(encrypted);

      expect(decrypted).toBe(longPat);
    });
  });

  describe("decryption with wrong data", () => {
    it("throws descriptive error for corrupted ciphertext", async () => {
      const { decryptPat } = await import("../encryption");

      expect(() => decryptPat("corrupted_not_valid_base64!@#")).toThrow();
    });

    it("throws descriptive error for tampered ciphertext", async () => {
      const { encryptPat, decryptPat } = await import("../encryption");
      const original = encryptPat("dapi_original");

      // Tamper by truncating the auth tag (GCM should detect this)
      const tampered = original.slice(0, -10);

      expect(() => decryptPat(tampered)).toThrow();
    });
  });

  describe("missing environment variable", () => {
    it("throws descriptive error when AES_ENCRYPTION_KEY is missing", async () => {
      vi.resetModules();
      process.env = { ...originalEnv };
      delete process.env.AES_ENCRYPTION_KEY;

      const { encryptPat } = await import("../encryption");

      expect(() => encryptPat("test")).toThrow(/AES_ENCRYPTION_KEY/i);
    });

    it("throws descriptive error when AES_ENCRYPTION_KEY is empty", async () => {
      vi.resetModules();
      process.env = { ...originalEnv, AES_ENCRYPTION_KEY: "" };

      const { encryptPat } = await import("../encryption");

      expect(() => encryptPat("test")).toThrow(/AES_ENCRYPTION_KEY/i);
    });
  });

  describe("key validation", () => {
    it("rejects 32-character hex key (128-bit) — requires 256-bit", async () => {
      vi.resetModules();
      process.env = { ...originalEnv, AES_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef" };

      const { encryptPat } = await import("../encryption");

      expect(() => encryptPat("test_pat")).toThrow(/64 hex characters/);
    });

    it("accepts valid 64-character hex key (256-bit)", async () => {
      vi.resetModules();
      process.env = {
        ...originalEnv,
        AES_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      };

      const { encryptPat, decryptPat } = await import("../encryption");
      const pat = "test_pat";

      const encrypted = encryptPat(pat);
      const decrypted = decryptPat(encrypted);

      expect(decrypted).toBe(pat);
    });
  });
});
