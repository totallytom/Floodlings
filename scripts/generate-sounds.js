const fs   = require('fs');
const path = require('path');

// Minimal valid silent WAV (44-byte header, 0 samples)
const silent = Buffer.from([
  0x52,0x49,0x46,0x46, 0x24,0x00,0x00,0x00,
  0x57,0x41,0x56,0x45,
  0x66,0x6D,0x74,0x20, 0x10,0x00,0x00,0x00,
  0x01,0x00, 0x01,0x00,
  0x44,0xAC,0x00,0x00, 0x88,0x58,0x01,0x00,
  0x02,0x00, 0x10,0x00,
  0x64,0x61,0x74,0x61, 0x00,0x00,0x00,0x00,
]);

const dir = path.join(__dirname, '..', 'assets', 'sounds');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// move   — subtle whoosh when a color is selected
// combo  — rewarding chime when a combo fires
// clear  — celebratory fanfare when the board is flooded
// timeup — low failure sound when time runs out
// tick   — urgent tick for the last 8 seconds
['move', 'combo', 'clear', 'timeup', 'tick'].forEach(name => {
  const file = path.join(dir, `${name}.wav`);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, silent);
    console.log(`Created placeholder: assets/sounds/${name}.wav`);
  } else {
    console.log(`Already exists:      assets/sounds/${name}.wav`);
  }
});

console.log('\nDone. Replace each .wav with a real sound file.');
