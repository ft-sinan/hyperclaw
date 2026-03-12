/**
 * Encrypted config — at-rest encryption for hyperclaw.json.
 * Use HYPERCLAW_CONFIG_KEY (32-byte hex) to enable. When set, config is stored encrypted.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LEN = 16;
const AUTH_TAG_LEN = 16;
const KEY_LEN = 32;

function getKey(): Buffer | null {
  const raw = process.env.HYPERCLAW_CONFIG_KEY;
  if (!raw || raw.length !== 64 || !/^[0-9a-fA-F]+$/.test(raw)) return null;
  return Buffer.from(raw, 'hex');
}

export function isEncryptionAvailable(): boolean {
  return getKey() !== null;
}

export function encryptConfig(plain: string): string {
  const key = getKey();
  if (!key) throw new Error('HYPERCLAW_CONFIG_KEY not set (32-byte hex)');
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return iv.toString('base64') + ':' + tag.toString('base64') + ':' + enc.toString('base64');
}

export function decryptConfig(encrypted: string): string {
  const key = getKey();
  if (!key) throw new Error('HYPERCLAW_CONFIG_KEY not set');
  const parts = encrypted.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted config format');
  const [ivB64, tagB64, encB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const enc = Buffer.from(encB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final('utf8');
}

export function isEncryptedContent(s: string): boolean {
  return /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/.test(s.trim()) && s.split(':').every(p => p.length > 0);
}
