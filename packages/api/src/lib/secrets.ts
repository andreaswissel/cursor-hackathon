import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ENCRYPTED_PREFIX = "enc:v1";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getSecretKey(): Buffer {
  const rawKey =
    process.env.DATA_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "dev-secret-change-in-production";
  return createHash("sha256").update(rawKey, "utf8").digest();
}

export function isEncryptedSecret(value: string | null | undefined): value is string {
  return !!value && value.startsWith(`${ENCRYPTED_PREFIX}:`);
}

export function encryptSecret(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  if (isEncryptedSecret(plaintext)) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getSecretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptSecret(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  if (!isEncryptedSecret(ciphertext)) return ciphertext;

  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 5) {
      throw new Error("Invalid encrypted secret format");
    }

    const [, version, ivB64, tagB64, payloadB64] = parts;
    if (version !== "v1") {
      throw new Error(`Unsupported secret version: ${version}`);
    }

    const iv = Buffer.from(ivB64, "base64url");
    const authTag = Buffer.from(tagB64, "base64url");
    const payload = Buffer.from(payloadB64, "base64url");

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error("Invalid encrypted secret payload");
    }

    const decipher = createDecipheriv("aes-256-gcm", getSecretKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);

    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Failed to decrypt secret:", error);
    return null;
  }
}
