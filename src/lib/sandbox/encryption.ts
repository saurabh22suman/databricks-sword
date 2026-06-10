/**
 * @file encryption.ts
 * @description Simple symmetric encryption for sandbox data at rest.
 *
 * Uses AES-256-GCM with a key derived from the ENCRYPTION_KEY environment variable.
 * Falls back to no encryption if no key is configured (for development).
 *
 * This provides application-level encryption for sensitive game state data.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32
const KEY_LENGTH = 32

/**
 * Gets the encryption key from environment or returns null for no encryption.
 */
function getEncryptionKey(): Buffer | null {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length < 32) {
    return null
  }
  // Derive a consistent key from the secret using scrypt
  return scryptSync(key, "databricks-sword-salt", KEY_LENGTH)
}

/**
 * Encrypts data using AES-256-GCM.
 *
 * @param data - Plain text string to encrypt
 * @returns Encrypted string with IV and auth tag prepended, base64 encoded
 *
 * @example
 * ```ts
 * const encrypted = encryptSandbox('{"xp": 100}')
 * // Returns: base64(IV + encrypted + authTag)
 * ```
 */
export function encryptSandbox(data: string): string {
  const key = getEncryptionKey()
  if (!key) {
    // No encryption configured - return data as-is (development mode)
    return data
  }

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // Combine: IV + authTag + encrypted data
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString("base64")
}

/**
 * Decrypts data that was encrypted with encryptSandbox.
 *
 * @param encryptedData - Base64 encoded encrypted string
 * @returns Decrypted plain text string
 * @throws Error if decryption fails
 *
 * @example
 * ```ts
 * const decrypted = decryptSandbox(encryptedString)
 * ```
 */
export function decryptSandbox(encryptedData: string): string {
  const key = getEncryptionKey()
  if (!key) {
    // No encryption configured - return data as-is (development mode)
    return encryptedData
  }

  try {
    const combined = Buffer.from(encryptedData, "base64")

    // Extract IV, authTag, and encrypted data
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ])

    return decrypted.toString("utf8")
  } catch (error) {
    throw new Error("Decryption failed - data may be corrupted or key is invalid")
  }
}

/**
 * Checks if encryption is enabled.
 *
 * @returns true if encryption key is configured
 */
export function isEncryptionEnabled(): boolean {
  return getEncryptionKey() !== null
}