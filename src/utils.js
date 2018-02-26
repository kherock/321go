import crypto from 'crypto';

const digits = '0123456789';
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const charset = [digits, letters, letters.toLowerCase()].join('');

export function isBase62(str) {
  return /^[0-9A-Za-z]*$/.test(str);
}

export function randomBase62(length) {
  return crypto
    .randomBytes(length)
    .map(b => charset.charCodeAt(Math.floor(b * charset.length / 256)))
    .toString();
}
