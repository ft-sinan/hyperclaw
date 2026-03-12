import fs from 'fs-extra';
import { getHyperClawDir, getConfigPath } from '../infra/paths';

function tryEncrypt(): { encrypt: (s: string) => string; decrypt: (s: string) => string; available: boolean } {
  try {
    const m = require('../secrets/encrypt-config');
    if (m?.isEncryptionAvailable?.()) return { encrypt: m.encryptConfig, decrypt: m.decryptConfig, available: true };
  } catch { /* optional */ }
  return { encrypt: (s) => s, decrypt: (s) => s, available: false };
}

export class ConfigManager {

  async save(config: any): Promise<void> {
    const target = getConfigPath();
    const tmp = target + '.tmp';
    await fs.ensureDir(getHyperClawDir());
    const json = JSON.stringify(config, null, 2);
    const enc = tryEncrypt();
    const out = enc.available ? enc.encrypt(json) : json;
    await fs.writeFile(tmp, out, 'utf8');
    await fs.chmod(tmp, 0o600).catch(() => {});
    await fs.rename(tmp, target);
  }

  async load(): Promise<any> {
    const p = getConfigPath();
    if (!(await fs.pathExists(p))) return null;
    const raw = await fs.readFile(p, 'utf8');
    const enc = tryEncrypt();
    let isEnc = false;
    try {
      const m = require('../secrets/encrypt-config');
      if (m?.isEncryptedContent?.(raw)) {
        if (!enc.available) throw new Error('Config is encrypted. Set HYPERCLAW_CONFIG_KEY (32-byte hex) to decrypt.');
        isEnc = true;
      }
    } catch (e: any) {
      if (e?.message?.includes('encrypted')) throw e;
    }
    if (isEnc) return JSON.parse(enc.decrypt(raw));
    return JSON.parse(raw);
  }

  // M-9: sync() was a fake stub that simulated work with setTimeout.
  // Replaced with an honest not-implemented error so callers fail clearly instead
  // of silently doing nothing while printing a success message.
  async sync(_options: { to: string; encrypt: boolean }): Promise<void> {
    throw new Error(
      'ConfigManager.sync() is not implemented. ' +
      'To back up your config, copy ~/.hyperclaw/hyperclaw.json manually.'
    );
  }

  getConfigPath(): string {
    return getConfigPath();
  }
}
