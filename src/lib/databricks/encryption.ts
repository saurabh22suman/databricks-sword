/**
 * PAT Encryption Module
 * AES-256-GCM encryption for Databricks Personal Access Tokens
 *
 * Uses Node.js crypto module with:
 * - AES-256-GCM for authenticated encryption
 * - Random 12-byte IV per encryption
 * - 16-byte auth tag for integrity verification
 *
 * Format: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext, all base64 encoded
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Gets the encryption key from environment variable.
 * Requires a proper 256-bit (64-char hex) key for AES-256.
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.AES_ENCRYPTION_KEY;

  if (!keyHex || keyHex.trim() === "") {
    throw new Error(
      "AES_ENCRYPTION_KEY environment variable is not set. " +
        "Please set a 64-character hex string (256-bit key) for encryption."
    );
  }

  // Convert hex string to buffer
  const keyBuffer = Buffer.from(keyHex, "hex");

  if (keyBuffer.length !== 32) {
    throw new Error(
      `AES_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes / 256-bit). ` +
        `Got ${keyHex.length} characters (${keyBuffer.length} bytes). ` +
        `Generate one with: openssl rand -hex 32`
    );
  }

  return keyBuffer;
}

/**
 * Encrypts a PAT using AES-256-GCM
 * @param pat - The plaintext Personal Access Token
 * @returns Base64-encoded ciphertext (IV + AuthTag + encrypted data)
 */
export function encryptPat(pat: string): string {
  const key = getEncryptionKey();

  // Generate random IV for each encryption
  const iv = randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  // Encrypt
  const encrypted = Buffer.concat([cipher.update(pat, "utf8"), cipher.final()]);

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Combine: IV + AuthTag + Ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);

  // Return as base64
  return combined.toString("base64");
}

/**
 * Decrypts a PAT that was encrypted with encryptPat
 * @param encryptedPat - Base64-encoded ciphertext from encryptPat
 * @returns The original plaintext PAT
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decryptPat(encryptedPat: string): string {
  const key = getEncryptionKey();

  // Decode base64
  const combined = Buffer.from(encryptedPat, "base64");

  // Check minimum length (IV + AuthTag + at least 0 bytes of ciphertext)
  const minLength = IV_LENGTH + AUTH_TAG_LENGTH;
  if (combined.length < minLength) {
    throw new Error(
      `Invalid encrypted data: too short. Expected at least ${minLength} bytes, got ${combined.length}.`
    );
  }

  // Extract parts
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  // Decrypt
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString("utf8");
}
