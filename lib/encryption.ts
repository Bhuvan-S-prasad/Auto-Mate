import crypto from "crypto";

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error("ENCRYPTION_KEY is not defined");
    }
    return crypto.createHash("sha256").update(key).digest();
}

export function encrypt(plainText: string): string {
   const key = getKey();
   const iv = crypto.randomBytes(IV_LENGTH);
   const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
   
   let encrypted = cipher.update(plainText, 'utf8', 'hex');
   encrypted += cipher.final('hex');

   const tag = cipher.getAuthTag();
   if (!tag) {
    throw new Error("Failed to get auth tag");
   }
   return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
}

export function decrypt(ciphertext: string): string {
    const key = getKey();
    const [ivHex, tagHex, encryptedText] = ciphertext.split(':');
    if (!ivHex || !tagHex || !encryptedText) {
        throw new Error("Invalid ciphertext format");
    }
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;

}