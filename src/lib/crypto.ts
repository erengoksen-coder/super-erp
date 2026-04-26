import crypto from 'crypto';

/**
 * Super ERP - Crypto Utilities
 * Implements AES-256-GCM encryption/decryption for sensitive data like webhook secrets.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// The encryption key should be exactly 32 bytes (256 bits).
// In production, ENCRYPTION_KEY must be a 64-character hex string.
const getEncryptionKey = (): Buffer => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('FATAL: ENCRYPTION_KEY is missing in production.');
        }
        // Dev fallback (exactly 32 bytes)
        return Buffer.from('super-erp-dev-encryption-key-2026'.slice(0, 32));
    }
    return Buffer.from(key, 'hex');
};

/**
 * Encrypts a string using AES-256-GCM.
 * Returns a base64 encoded string containing [iv][tag][ciphertext]
 */
export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypts a base64 encoded string encrypted with AES-256-GCM.
 */
export function decrypt(encryptedData: string): string {
    const buffer = Buffer.from(encryptedData, 'base64');
    
    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
}
