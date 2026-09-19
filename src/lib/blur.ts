import "server-only";

import { deflateSync } from "node:zlib";
import { decode } from "blurhash";

/**
 * Turn a stored blurhash into a `blurDataURL` for next/image. Decoded at
 * 24x30 (4:5) into an uncompressed-filter PNG; ~600 bytes, memoised per hash
 * so a grid of the same product costs one decode.
 */
const cache = new Map<string, string>();
const W = 24;
const H = 30;

export function blurDataUrl(hash: string | null | undefined): string | undefined {
  if (!hash) return undefined;
  const hit = cache.get(hash);
  if (hit) return hit;
  let pixels: Uint8ClampedArray;
  try {
    pixels = decode(hash, W, H, 1);
  } catch {
    return undefined;
  }
  const url = `data:image/png;base64,${png(pixels, W, H).toString("base64")}`;
  cache.set(hash, url);
  return url;
}

// ---- minimal PNG encoder (RGB, filter 0) ---------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = (CRC_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(rgba: Uint8ClampedArray, width: number, height: number): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const o = row + 1 + x * 3;
      raw[o] = rgba[i] ?? 0;
      raw[o + 1] = rgba[i + 1] ?? 0;
      raw[o + 2] = rgba[i + 2] ?? 0;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array(0))]);
}
