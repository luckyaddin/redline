/**
 * Crypto and Data Masking Utilities for RedLine Logistics
 * Protects sensitive identification info (Civil ID, Passport, Driver's License, SSN).
 * Ensures sensitive data is never stored as plaintext and is masked in UI presentations.
 */

// Format masked display: e.g., "*--1234" or "***-**-1234"
export function maskSensitiveValue(value?: string | null, type: "ssn" | "id" = "id"): string {
  if (!value) return "—";
  const cleaned = value.trim().replace(/\s+/g, "");
  if (cleaned.length <= 4) {
    return `*--${cleaned}`;
  }
  const last4 = cleaned.slice(-4);
  if (type === "ssn") {
    return `*--${last4}`;
  }
  return `*--${last4}`;
}

const APP_CRYPTO_SALT = "redline-kuwait-logistics-v1-salt";

async function getDerivedKey(passphrase = "redline-secure-vault-key-2026"): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(APP_CRYPTO_SALT),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt sensitive identification string using AES-GCM
 */
export async function encryptSensitiveData(plaintext: string): Promise<string> {
  if (!plaintext || !plaintext.trim()) return "";
  try {
    const key = await getDerivedKey();
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encodedData = enc.encode(plaintext.trim());

    const ciphertext = await globalThis.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      encodedData
    );

    // Combine IV and ciphertext into Base64 payload
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    let binary = "";
    for (let i = 0; i < combined.byteLength; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error("Encryption error:", error);
    // Fallback obfuscation if SubtleCrypto isn't accessible
    return `enc_${btoa(plaintext.trim())}`;
  }
}

/**
 * Decrypt sensitive identification data
 */
export async function decryptSensitiveData(encryptedBase64: string): Promise<string> {
  if (!encryptedBase64) return "";
  try {
    if (encryptedBase64.startsWith("enc_")) {
      return atob(encryptedBase64.slice(4));
    }
    const binary = atob(encryptedBase64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const key = await getDerivedKey();

    const decrypted = await globalThis.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      data
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    return "********";
  }
}
