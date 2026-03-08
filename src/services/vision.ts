/**
 * src/services/vision.ts
 * Image understanding via vision-capable models (Claude, GPT-4V, etc.)
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import https from 'https';
import http from 'http';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

function inferImageMediaType(ext: string): string {
  return {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  }[ext] ?? 'image/jpeg';
}

async function readValidatedImageFile(filePath: string): Promise<{ data: string; mediaType: string }> {
  const resolvedPath = path.resolve(filePath.replace(/^~/, os.homedir()));
  const ext = path.extname(resolvedPath).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported image file type: ${ext || 'unknown'}`);
  }
  const stats = await fs.stat(resolvedPath);
  if (!stats.isFile()) throw new Error('Image input must be a file');
  if (stats.size === 0) throw new Error('Image input is empty');
  if (stats.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image input exceeds ${MAX_IMAGE_BYTES} bytes`);
  }
  const buf = await fs.readFile(resolvedPath);
  return { data: buf.toString('base64'), mediaType: inferImageMediaType(ext) };
}

async function fetchValidatedRemoteImage(urlString: string): Promise<{ data: string; mediaType: string }> {
  const url = new URL(urlString);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Unsupported image URL protocol: ${url.protocol}`);
  }

  const mod = url.protocol === 'https:' ? https : http;
  const buf = await new Promise<Buffer>((resolve, reject) => {
    const req = mod.get(url, (res) => {
      if ((res.statusCode ?? 0) >= 400) {
        reject(new Error(`Image download failed with status ${res.statusCode}`));
        res.resume();
        return;
      }
      const contentLength = Number(res.headers['content-length'] ?? 0);
      if (contentLength > MAX_IMAGE_BYTES) {
        reject(new Error(`Image download exceeds ${MAX_IMAGE_BYTES} bytes`));
        res.destroy();
        return;
      }
      const chunks: Buffer[] = [];
      let total = 0;
      res.on('data', (c: Buffer) => {
        total += c.length;
        if (total > MAX_IMAGE_BYTES) {
          req.destroy(new Error(`Image download exceeds ${MAX_IMAGE_BYTES} bytes`));
          return;
        }
        chunks.push(c);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });

  const pathnameExt = path.extname(url.pathname).toLowerCase();
  return {
    data: buf.toString('base64'),
    mediaType: inferImageMediaType(ALLOWED_IMAGE_EXTENSIONS.has(pathnameExt) ? pathnameExt : '.jpg')
  };
}

async function imageToBase64(input: string): Promise<{ data: string; mediaType: string }> {
  const trimmed = input.trim();
  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (match) {
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length === 0) throw new Error('Image input is empty');
      if (buffer.length > MAX_IMAGE_BYTES) {
        throw new Error(`Image input exceeds ${MAX_IMAGE_BYTES} bytes`);
      }
      return { data: match[2], mediaType: match[1] };
    }
  }
  if (trimmed.startsWith('http')) {
    return fetchValidatedRemoteImage(trimmed);
  }
  return readValidatedImageFile(trimmed);
}

export async function analyzeImage(
  imageInput: string,
  prompt: string,
  apiKey: string,
  provider: 'anthropic' | 'openrouter' = 'anthropic'
): Promise<string> {
  const { data, mediaType } = await imageToBase64(imageInput);
  const isAnthropic = provider === 'anthropic';
  const hostname = isAnthropic ? 'api.anthropic.com' : 'openrouter.ai';
  const model = isAnthropic ? 'claude-sonnet-4-20250514' : 'openai/gpt-4o';
  const body: Record<string, unknown> = {
    model,
    max_tokens: 1024,
    messages: isAnthropic
      ? [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mediaType, data } }, { type: 'text', text: prompt || 'Describe this image.' }] }]
      : [{ role: 'user', content: [{ type: 'text', text: '[Image attached] ' + (prompt || 'Describe this image.') }, { type: 'image_url', image_url: { url: `data:${mediaType};base64,${data}` } }] }]
  };
  if (isAnthropic) (body as any).anthropic_version = '2023-06-01';

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname, port: 443, path: isAnthropic ? '/v1/messages' : '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(isAnthropic ? { 'anthropic-version': '2023-06-01' } : { 'HTTP-Referer': 'https://hyperclaw.ai' })
      }
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(raw);
          if (isAnthropic) {
            const text = j.content?.[0]?.text;
            resolve(text || j.error?.message || '(no description)');
          } else {
            const text = j.choices?.[0]?.message?.content;
            resolve(text || j.error?.message || '(no description)');
          }
        } catch {
          resolve(raw || '(parse error)');
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}
