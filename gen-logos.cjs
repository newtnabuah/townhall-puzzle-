/**
 * Generates 7 solid-color 400×400 placeholder PNG logos.
 * Run: node gen-logos.cjs
 * Pure Node.js, no dependencies.
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 table
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function uint32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const dataBytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const crc = crc32(Buffer.concat([typeBytes, dataBytes]));
  return Buffer.concat([uint32be(dataBytes.length), typeBytes, dataBytes, uint32be(crc)]);
}

function makePNG(r, g, b, width = 400, height = 400) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.concat([
    uint32be(width),
    uint32be(height),
    Buffer.from([8, 2, 0, 0, 0]), // 8-bit depth, RGB, deflate, no filter, no interlace
  ]);

  // Build raw image data (one filter byte per scanline + RGB pixels)
  const scanlineSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * scanlineSize);
  for (let y = 0; y < height; y++) {
    const offset = y * scanlineSize;
    rawData[offset] = 0; // filter type: None
    for (let x = 0; x < width; x++) {
      rawData[offset + 1 + x * 3] = r;
      rawData[offset + 1 + x * 3 + 1] = g;
      rawData[offset + 1 + x * 3 + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const COLORS = [
  { name: 'logo1', r: 99, g: 102, b: 241 },   // Indigo
  { name: 'logo2', r: 16, g: 185, b: 129 },   // Emerald
  { name: 'logo3', r: 245, g: 158, b: 11 },   // Amber
  { name: 'logo4', r: 239, g: 68, b: 68 },    // Red
  { name: 'logo5', r: 6, g: 182, b: 212 },    // Cyan
  { name: 'logo6', r: 168, g: 85, b: 247 },   // Purple
  { name: 'logo7', r: 236, g: 72, b: 153 },   // Pink
];

const outDir = path.join(__dirname, 'client', 'public', 'logos');
fs.mkdirSync(outDir, { recursive: true });

for (const color of COLORS) {
  const png = makePNG(color.r, color.g, color.b);
  const file = path.join(outDir, `${color.name}.png`);
  fs.writeFileSync(file, png);
  console.log(`Created ${file} (${png.length} bytes)`);
}

console.log('Done!');
