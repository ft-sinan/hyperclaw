/**
 * Backup create/verify — CLI backup and restore for local HyperClaw state.
 */

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import chalk from 'chalk';
import { getHyperClawDir } from '../infra/paths';

const BACKUP_FILES = ['hyperclaw.json', 'AGENTS.md', 'MEMORY.md', 'SOUL.md', 'USER.md', 'TOOLS.md'];
const MANIFEST = 'manifest.json';

export interface BackupManifest {
  version: string;
  createdAt: string;
  files: Record<string, { path: string; size: number; sha256: string }>;
}

export async function createBackup(outputDir?: string): Promise<string> {
  const hcDir = getHyperClawDir();
  const dest = outputDir || path.join(hcDir, 'backups');
  await fs.ensureDir(dest);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(dest, `hyperclaw-backup-${ts}`);
  await fs.ensureDir(backupDir);

  const manifest: BackupManifest = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    files: {}
  };

  for (const f of BACKUP_FILES) {
    const src = path.join(hcDir, f);
    if (await fs.pathExists(src)) {
      const content = await fs.readFile(src);
      const sha256 = crypto.createHash('sha256').update(content).digest('hex');
      const destPath = path.join(backupDir, f);
      await fs.writeFile(destPath, content);
      manifest.files[f] = { path: f, size: content.length, sha256 };
    }
  }
  await fs.writeJson(path.join(backupDir, MANIFEST), manifest, { spaces: 2 });
  return backupDir;
}

export async function verifyBackup(backupDir: string): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const manifestPath = path.join(backupDir, MANIFEST);
  if (!(await fs.pathExists(manifestPath))) {
    return { ok: false, errors: ['manifest.json not found'] };
  }
  const manifest: BackupManifest = await fs.readJson(manifestPath);
  for (const [name, meta] of Object.entries(manifest.files)) {
    const fpath = path.join(backupDir, name);
    if (!(await fs.pathExists(fpath))) {
      errors.push(`${name}: missing`);
      continue;
    }
    const content = await fs.readFile(fpath);
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    if (sha256 !== meta.sha256) errors.push(`${name}: checksum mismatch`);
  }
  return { ok: errors.length === 0, errors };
}

export async function restoreBackup(backupDir: string): Promise<void> {
  const { ok, errors } = await verifyBackup(backupDir);
  if (!ok) throw new Error('Backup verification failed: ' + errors.join(', '));
  const hcDir = getHyperClawDir();
  const manifest: BackupManifest = await fs.readJson(path.join(backupDir, MANIFEST));
  for (const name of Object.keys(manifest.files)) {
    const src = path.join(backupDir, name);
    const dest = path.join(hcDir, name);
    await fs.copy(src, dest, { overwrite: true });
  }
}
