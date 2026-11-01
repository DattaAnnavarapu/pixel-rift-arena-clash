/** Fixed version 5-L QR (37×37, 106-byte capacity), generated offline. */
export const QR_SIZE = 37;
export const QR_MAX_BYTES = 106;

export function inviteUrl(origin: string, roomCode: string): string {
  return new URL(`/?room=${encodeURIComponent(roomCode)}`, origin).href;
}

function multiply(x: number, y: number): number {
  let result = 0;
  for (let i = 7; i >= 0; i--) {
    result = (result << 1) ^ ((result >>> 7) * 0x11d);
    result ^= ((y >>> i) & 1) * x;
  }
  return result;
}

function rsRemainder(data: number[], count: number): number[] {
  const divisor = Array(count).fill(0);
  divisor[count - 1] = 1;
  let root = 1;
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      divisor[j] = multiply(divisor[j], root);
      if (j + 1 < count) divisor[j] ^= divisor[j + 1];
    }
    root = multiply(root, 2);
  }
  const remainder = Array(count).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder.shift()!;
    remainder.push(0);
    for (let i = 0; i < count; i++) remainder[i] ^= multiply(divisor[i], factor);
  }
  return remainder;
}

/** Null means the URL is longer than this fixed-size code supports; invite text still works. */
export function qrMatrix(value: string): boolean[][] | null {
  const utf8 = new TextEncoder().encode(value);
  if (utf8.length > QR_MAX_BYTES) return null;
  const bits: number[] = [];
  const append = (val: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  append(4, 4);
  append(utf8.length, 8);
  for (const byte of utf8) append(byte, 8);
  append(0, Math.min(4, 108 * 8 - bits.length));
  while (bits.length % 8 !== 0) append(0, 1);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    data.push(bits.slice(i, i + 8).reduce((n, bit) => (n << 1) | bit, 0));
  }
  while (data.length < 108) data.push(data.length % 2 === 0 ? 0xec : 0x11);
  const all = [...data, ...rsRemainder(data, 26)];
  const cells = Array.from({ length: QR_SIZE }, () => Array<boolean>(QR_SIZE).fill(false));
  const fixed = Array.from({ length: QR_SIZE }, () => Array<boolean>(QR_SIZE).fill(false));
  const set = (x: number, y: number, dark: boolean) => {
    if (x >= 0 && y >= 0 && x < QR_SIZE && y < QR_SIZE) {
      cells[y][x] = dark;
      fixed[y][x] = true;
    }
  };
  for (let i = 0; i < QR_SIZE; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      set(cx + dx, cy + dy, dist !== 2 && dist !== 4);
    }
  };
  finder(3, 3);
  finder(QR_SIZE - 4, 3);
  finder(3, QR_SIZE - 4);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    set(30 + dx, 30 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  let format = 8; // Error correction L, mask pattern zero
  let rem = format;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  format = ((format << 10) | rem) ^ 0x5412;
  const bit = (i: number) => ((format >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) set(8, i, bit(i));
  set(8, 7, bit(6));
  set(8, 8, bit(7));
  set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(QR_SIZE - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) set(8, QR_SIZE - 15 + i, bit(i));
  set(8, QR_SIZE - 8, true);
  let offset = 0;
  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < QR_SIZE; vertical++) {
      const y = ((right + 1) & 2) === 0 ? QR_SIZE - 1 - vertical : vertical;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (fixed[y][x]) continue;
        const value = offset < all.length * 8 && ((all[offset >>> 3] >>> (7 - (offset & 7))) & 1) !== 0;
        cells[y][x] = value !== ((x + y) % 2 === 0);
        offset++;
      }
    }
  }
  return cells;
}
