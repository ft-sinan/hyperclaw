const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const distDir = path.join(__dirname, '..', 'dist');
const repo = process.env.GITHUB_REPOSITORY || 'OWNER/REPO';
const version = process.env.APP_VERSION || process.env.GITHUB_REF_NAME || 'v0.0.0';
const normalizedVersion = version.startsWith('v') ? version.slice(1) : version;

const zipFile = fs.readdirSync(distDir).find((name) => name.endsWith('.zip'));
if (!zipFile) {
  throw new Error(`No .zip artifact found in ${distDir}`);
}

const zipPath = path.join(distDir, zipFile);
const zipBuffer = fs.readFileSync(zipPath);
const sha256 = crypto.createHash('sha256').update(zipBuffer).digest('hex');
const pubDate = new Date().toUTCString();
const releaseUrl = `https://github.com/${repo}/releases/download/v${normalizedVersion}/${zipFile}`;

const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>HyperClaw macOS Updates</title>
    <link>https://github.com/${repo}/releases</link>
    <description>HyperClaw macOS appcast feed</description>
    <language>en</language>
    <item>
      <title>Version ${normalizedVersion}</title>
      <pubDate>${pubDate}</pubDate>
      <sparkle:version>${normalizedVersion}</sparkle:version>
      <sparkle:shortVersionString>${normalizedVersion}</sparkle:shortVersionString>
      <enclosure
        url="${releaseUrl}"
        sparkle:version="${normalizedVersion}"
        sparkle:shortVersionString="${normalizedVersion}"
        length="${zipBuffer.length}"
        type="application/octet-stream"
        sparkle:edSignature=""
        sparkle:sha256="${sha256}" />
    </item>
  </channel>
</rss>
`;

const appcastPath = path.join(distDir, 'appcast.xml');
const tmpPath = `${appcastPath}.tmp`;
fs.writeFileSync(tmpPath, xml, 'utf8');
fs.renameSync(tmpPath, appcastPath);
console.log(`Generated appcast.xml for ${zipFile}`);
