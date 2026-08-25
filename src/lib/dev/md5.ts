/**
 * MD5 (RFC 1321) implementation, written from scratch against the public RFC
 * specification (https://www.rfc-editor.org/rfc/rfc1321). MD5 is a fully public,
 * unpatented, decades-old algorithm — no third-party license applies to this file.
 * See docs/LICENSING.md ("File Hash Checker" entry) for why this is vendored
 * instead of pulling in an npm package: Web Crypto does not implement MD5 natively,
 * and this avoids adding a new dependency for one small, fixed algorithm.
 *
 * Operates on a Uint8Array and returns a lowercase hex digest, matching the
 * output style already used for the Web Crypto SHA digests elsewhere on this page.
 */

function rotl(x: number, c: number): number {
  return (x << c) | (x >>> (32 - c));
}

// Per-round left-rotation amounts, as specified in RFC 1321 section 3.4.
const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

// K[i] = floor(abs(sin(i + 1)) * 2^32), precomputed per RFC 1321 section 3.4.
const K = new Int32Array([
  -680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426,
  -1473231341, -45705983, 1770035416, -1958414417, -42063, -1990404162,
  1804603682, -40341101, -1502002290, 1236535329, -165796510, -1069501632,
  643717713, -373897302, -701558691, 38016083, -660478335, -405537848,
  568446438, -1019803690, -187363961, 1163531501, -1444681467, -51403784,
  1735328473, -1926607734, -378558, -2022574463, 1839030562, -35309556,
  -1530992060, 1272893353, -155497632, -1094730640, 681279174, -358537222,
  -722521979, 76029189, -640364487, -421815835, 530742520, -995338651,
  -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606,
  -1051523, -2054922799, 1873313359, -30611744, -1560198380, 1309151649,
  -145523070, -1120210379, 718787259, -343485551,
]);

function toLittleEndianWords(bytes: Uint8Array): Int32Array {
  const bitLen = bytes.length * 8;
  // Padding: one 0x80 byte, then zeros, then the 64-bit original length in bits,
  // so the total length is a multiple of 64 bytes (RFC 1321 section 3.1/3.2).
  const paddedLen = (((bytes.length + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  // 64-bit little-endian bit length; file sizes here are well under 2^32 bits worth
  // of file content in practice, so only the low 32 bits are ever non-zero.
  view.setUint32(paddedLen - 8, bitLen >>> 0, true);
  view.setUint32(paddedLen - 4, Math.floor(bitLen / 0x100000000), true);

  const words = new Int32Array(paddedLen / 4);
  for (let i = 0; i < words.length; i++) {
    words[i] = view.getInt32(i * 4, true);
  }
  return words;
}

/** Computes the MD5 digest of `bytes` and returns it as a lowercase 32-char hex string. */
export function md5(bytes: Uint8Array): string {
  const words = toLittleEndianWords(bytes);

  let a0 = 0x67452301;
  let b0 = -0x10325477; // 0xefcdab89
  let c0 = -0x67452302; // 0x98badcfe
  let d0 = 0x10325476;

  for (let chunk = 0; chunk < words.length; chunk += 16) {
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      f = (f + a + K[i] + words[chunk + g]) | 0;
      a = d;
      d = c;
      c = b;
      b = (b + rotl(f, S[i])) | 0;
    }

    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }

  const out = new Uint8Array(16);
  const view = new DataView(out.buffer);
  view.setInt32(0, a0, true);
  view.setInt32(4, b0, true);
  view.setInt32(8, c0, true);
  view.setInt32(12, d0, true);

  return [...out].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
