/**
 * Link codes and friend codes: 6 characters from an alphabet without the
 * look-alikes 0, O, 1 and I. Mirrors private.random_code() and
 * private.normalize_code() in the database.
 */
export const CODE_LENGTH = 6;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Upper case, without spaces or dashes, as people often type them. */
export function normalizeCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

export function isCompleteCode(input: string): boolean {
  const code = normalizeCode(input);
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_CHARS.includes(c));
}

/**
 * The code in a scanned QR. Our QR holds just the code, but accept a URL
 * with a `code` parameter too, in case a later version encodes a link.
 */
export function codeFromScan(data: string): string | null {
  const fromParam = /[?&]code=([^&#]+)/.exec(data)?.[1];
  const candidate = normalizeCode(fromParam ? decodeURIComponent(fromParam) : data.trim());
  return isCompleteCode(candidate) ? candidate : null;
}

/** "ABC234" as "ABC 234", easier to read aloud and copy. */
export function formatCode(code: string): string {
  const c = normalizeCode(code);
  return c.length === CODE_LENGTH ? `${c.slice(0, 3)} ${c.slice(3)}` : c;
}
