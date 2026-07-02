const zlib = require('zlib');
const fs = require('fs');

function createPNG(size) {
  const width = size, height = size;
  const rawData = [];
  const cr = size * 0.22; // corner radius

  for (let y = 0; y < height; y++) {
    rawData.push(0);
    for (let x = 0; x < width; x++) {
      const cx = x - width / 2 + 0.5;
      const cy = y - height / 2 + 0.5;
      const ax = Math.abs(cx) - (width / 2 - cr);
      const ay = Math.abs(cy) - (height / 2 - cr);
      const inRect = ax <= 0 || ay <= 0 || Math.sqrt(Math.max(0, ax) ** 2 + Math.max(0, ay) ** 2) < cr;
      if (inRect) {
        rawData.push(16, 185, 129, 255); // emerald-500 #10B981
      } else {
        rawData.push(0, 0, 0, 0);
      }
    }
  }

  const raw = Buffer.from(rawData);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (const b of buf) {
      crc ^= b;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crcBuf = Buffer.concat([t, data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len, t, data, c]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
sizes.forEach(function(s) {
  fs.writeFileSync('public/icon-' + s + 'x' + s + '.png', createPNG(s));
  console.log('icon-' + s + 'x' + s + '.png');
});

fs.writeFileSync('public/apple-touch-icon.png', createPNG(180));
fs.writeFileSync('public/favicon-32x32.png', createPNG(32));
fs.writeFileSync('public/favicon-16x16.png', createPNG(16));
console.log('All icons generated');
