// Short, human-friendly booking reference, e.g. "AB-7K2Q".
// Avoids ambiguous characters (0/O, 1/I) so it's easy to read aloud.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReference(prefix = "AB"): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}-${code}`;
}
