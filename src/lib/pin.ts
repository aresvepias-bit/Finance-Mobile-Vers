import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// PIN disimpan sebagai "scrypt$<salt hex>$<hash hex>". PIN lama (teks biasa) masih bisa
// dipakai login sekali, lalu otomatis di-upgrade ke hash.

const scrypt = promisify(scryptCb) as (pwd: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const PREFIX = "scrypt$";

export function isHashedPin(stored: string) {
  return stored.startsWith(PREFIX);
}

export async function hashPin(pin: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(pin, salt, 32);
  return `${PREFIX}${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPin(pin: string, stored: string) {
  if (!isHashedPin(stored)) {
    const a = Buffer.from(pin);
    const b = Buffer.from(stored);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  const [, saltHex, hashHex] = stored.split("$");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(pin, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}
