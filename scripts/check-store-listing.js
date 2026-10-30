// Checks every store-listing/<lang>.md field against App Store / Google Play
// length limits. Run: node scripts/check-store-listing.js
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'store-listing');

// [label in the file, limit, unit]. Keywords are limited by bytes, which is
// what makes CJK keyword lists run out of room ~3x sooner.
const LIMITS = [
  ['Name', 30, 'chars'],
  ['Subtitle', 30, 'chars'],
  ['Keywords', 100, 'bytes'],
  ['Promotional text', 170, 'chars'],
  ['Title', 30, 'chars'],
  ['Short description', 80, 'chars'],
];

// Count user-perceived characters, not UTF-16 units, so emoji/accents match
// what the store consoles count.
const chars = s => [...s].length;
const bytes = s => Buffer.byteLength(s, 'utf8');

let failures = 0;
for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md')) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  const rows = [];

  for (const [label, limit, unit] of LIMITS) {
    const m = text.match(new RegExp(`^\\*\\*${label}:\\*\\* (.+)$`, 'm'));
    if (!m) {
      rows.push(`  ✗ ${label}: missing`);
      failures++;
      continue;
    }
    const value = m[1].trim();
    const size = unit === 'bytes' ? bytes(value) : chars(value);
    const ok = size <= limit;
    if (!ok) failures++;
    rows.push(`  ${ok ? '✓' : '✗'} ${label}: ${size}/${limit} ${unit}`);
    if (label === 'Keywords' && /,\s/.test(value)) {
      rows.push('  ✗ Keywords: remove spaces after commas (they waste bytes)');
      failures++;
    }
  }

  const desc = text.match(/\*\*Description:\*\*\n([\s\S]*?)\n## /);
  if (desc) {
    const size = chars(desc[1].trim());
    if (size > 4000) failures++;
    rows.push(`  ${size <= 4000 ? '✓' : '✗'} Description: ${size}/4000 chars`);
  }

  console.log(file);
  console.log(rows.join('\n'));
}

console.log(failures ? `\n${failures} problem(s)` : '\nAll listings within limits');
process.exit(failures ? 1 : 0);
