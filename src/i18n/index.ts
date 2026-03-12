/**
 * i18n — Japanese, Chinese locale support.
 */

import fs from 'fs-extra';
import path from 'path';

export type Locale = 'en' | 'ja' | 'zh';

const LOCALES_DIR = path.join(__dirname, '..', '..', 'locales');
let cache: Partial<Record<Locale, Record<string, any>>> = {};

export async function loadLocale(locale: Locale): Promise<Record<string, any>> {
  if (cache[locale]) return cache[locale];
  const file = path.join(LOCALES_DIR, locale === 'en' ? 'en.json' : `${locale}.json`);
  if (!(await fs.pathExists(file))) return {};
  const data = await fs.readJson(file) as Record<string, any>;
  cache[locale] = data;
  return data;
}

export function t(locale: Locale, key: string, fallback?: string): string {
  const keys = key.split('.');
  let obj: any = cache[locale] || {};
  for (const k of keys) {
    obj = obj?.[k];
    if (obj == null) return fallback ?? key;
  }
  return typeof obj === 'string' ? obj : (fallback ?? key);
}
