import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const args = process.argv.slice(2);
const write = args.includes('--write');
const positional = args.filter((arg) => arg !== '--write');

const textExtensions = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.css', '.scss', '.html', '.json', '.md', '.mdx',
  '.yml', '.yaml', '.xml', '.txt', '.sh', '.ps1',
  '.kt', '.kts', '.swift', '.plist'
]);

const excludedDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  'vendor',
  '.next',
  'static'
]);

const suspiciousPatterns = [
  /β€”/g,
  /β”/g,
  /β/g,
  /β/g,
  /β—/g,
  /Β·/g,
  /π/g,
  /Ξ²β/g,
  /Ο€/g,
  /οΈ/g
];

const decoders = [
  { name: 'windows-1253', decoder: new TextDecoder('windows-1253') },
  { name: 'windows-1252', decoder: new TextDecoder('windows-1252') }
];

const reverseMaps = new Map(decoders.map(({ name, decoder }) => [name, buildReverseMap(decoder)]));

function buildReverseMap(decoder) {
  const map = new Map();
  for (let i = 0; i < 256; i += 1) {
    const ch = decoder.decode(Uint8Array.from([i]));
    if (!map.has(ch)) map.set(ch, i);
  }
  return map;
}

function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function mojibakeScore(text) {
  let score = 0;
  for (const pattern of suspiciousPatterns) score += countMatches(text, pattern) * 6;
  score += countMatches(text, /\uFFFD/g) * 8;
  score += countMatches(text, /[\u0080-\u009F]/g) * 3;
  return score;
}

function repairText(text, encoding) {
  const reverseMap = reverseMaps.get(encoding);
  const bytes = [];

  for (const ch of text) {
    if (reverseMap.has(ch)) {
      bytes.push(reverseMap.get(ch));
      continue;
    }

    const codePoint = ch.codePointAt(0);
    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    bytes.push(...Buffer.from(ch, 'utf8'));
  }

  return Buffer.from(bytes).toString('utf8');
}

function getBestRepair(text) {
  const originalScore = mojibakeScore(text);
  let best = { text, encoding: null, score: originalScore };

  for (const { name } of decoders) {
    const candidate = repairText(text, name);
    const candidateScore = mojibakeScore(candidate);
    if (candidate !== text && candidateScore < best.score) {
      best = { text: candidate, encoding: name, score: candidateScore };
    }
  }

  return best.encoding ? best : null;
}

function looksBinary(buffer) {
  const limit = Math.min(buffer.length, 2048);
  for (let i = 0; i < limit; i += 1) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

function collectFiles(entryPath, out = []) {
  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    if (textExtensions.has(path.extname(entryPath).toLowerCase())) out.push(entryPath);
    return out;
  }

  if (excludedDirs.has(path.basename(entryPath))) return out;

  for (const child of fs.readdirSync(entryPath)) {
    collectFiles(path.join(entryPath, child), out);
  }
  return out;
}

const targets = positional.length ? positional.map((p) => path.resolve(cwd, p)) : [cwd];
const files = [...new Set(targets.flatMap((target) => collectFiles(target)))].filter((file) => path.basename(file) !== 'fix-mojibake.mjs');
const changed = [];

for (const file of files) {
  const buffer = fs.readFileSync(file);
  if (looksBinary(buffer)) continue;

  const original = buffer.toString('utf8');
  if (mojibakeScore(original) === 0) continue;

  const best = getBestRepair(original);
  if (!best) continue;

  const relative = path.relative(cwd, file) || path.basename(file);
  changed.push({
    file,
    relative,
    before: mojibakeScore(original),
    after: best.score,
    encoding: best.encoding
  });

  if (write) {
    fs.writeFileSync(file, best.text, 'utf8');
  }
}

if (changed.length === 0) {
  console.log('No suspicious mojibake found.');
  process.exit(0);
}

for (const item of changed) {
  console.log(`${write ? 'fixed' : 'preview'} ${item.relative} (${item.before} -> ${item.after}, ${item.encoding})`);
}

console.log(`\n${write ? 'Updated' : 'Would update'} ${changed.length} file(s).`);
if (!write) console.log('Run with --write to apply the fixes.');
