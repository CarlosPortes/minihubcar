const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation
function makeCRCTable() {
  let c;
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  return crcTable;
}

const crcTable = makeCRCTable();

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function writeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createIconPNG(size, outputPath) {
  // RGBA buffer: each scanline starts with filter byte 0x00, followed by size * 4 bytes
  const rowLen = 1 + size * 4;
  const rawData = Buffer.alloc(rowLen * size);

  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < size; y++) {
    const rowStart = y * rowLen;
    rawData[rowStart] = 0; // Filter: None

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowStart + 1 + x * 4;

      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded squircle / background
      // Subtle gradient from deep slate #0f172a (15, 23, 42) to dark navy #020617 (2, 6, 23)
      const gradRatio = (x + y) / (size * 2);
      let r = Math.round(15 * (1 - gradRatio) + 2 * gradRatio);
      let g = Math.round(23 * (1 - gradRatio) + 6 * gradRatio);
      let b = Math.round(42 * (1 - gradRatio) + 23 * gradRatio);
      let a = 255;

      // Outer border glow
      const margin = size * 0.06;
      const cornerRadius = size * 0.22;
      const inBoxX = x >= margin && x <= size - margin;
      const inBoxY = y >= margin && y <= size - margin;

      // Inside icon badge (accent circle or sports car silhouette)
      // Car body silhouette in center:
      // Height 35% of size, width 65% of size
      const cy = y - center;
      const cx = x - center;

      const isCarBody = (
        cy >= -size * 0.08 && cy <= size * 0.16 &&
        cx >= -size * 0.32 && cx <= size * 0.32
      );

      const isCabin = (
        cy >= -size * 0.22 && cy < -size * 0.08 &&
        cx >= -size * 0.18 && cx <= size * 0.16 &&
        (cy - (-size * 0.08)) <= (size * 0.14)
      );

      const isWheel1 = Math.sqrt(Math.pow(cx - (-size * 0.18), 2) + Math.pow(cy - (size * 0.16), 2)) <= size * 0.075;
      const isWheel2 = Math.sqrt(Math.pow(cx - (size * 0.18), 2) + Math.pow(cy - (size * 0.16), 2)) <= size * 0.075;

      // Cyan / Electric Blue accent (#3b82f6 -> #60a5fa -> #38bdf8)
      if (isWheel1 || isWheel2) {
        // Wheel rim
        r = 248; g = 113; b = 113; // Sporty Red rim
      } else if (isCabin) {
        // Windshield
        r = 147; g = 197; b = 253; // Sky blue
      } else if (isCarBody) {
        // Electric Blue sports car body
        r = 59; g = 130; b = 246; // Primary blue
      } else {
        // Background accent ring
        if (Math.abs(dist - radius) < size * 0.02) {
          r = 59; g = 130; b = 246; // Glow ring
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // PNG Signature
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = writeChunk('IHDR', ihdr);

  // IDAT
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = writeChunk('IDAT', compressed);

  // IEND
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  const png = Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, png);
  console.log(`Generated PNG: ${outputPath} (${size}x${size}, ${png.length} bytes)`);
}

const iconsDir = path.resolve('c:/Projetos/minihubcar/frontend/public/icons');
createIconPNG(192, path.join(iconsDir, 'icon-192.png'));
createIconPNG(512, path.join(iconsDir, 'icon-512.png'));
createIconPNG(180, path.join(iconsDir, 'apple-touch-icon.png'));
