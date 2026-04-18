export function sanitizeForLog(value: unknown, maxLength = 200): string {
  const raw = typeof value === 'string'
    ? value
    : value === null || value === undefined
      ? ''
      : String(value);

  let cleaned = '';
  let previousWasWhitespace = false;

  for (const char of raw) {
    const charCode = char.charCodeAt(0);
    const isControl = charCode < 32 || charCode === 127;
    const normalized = isControl ? ' ' : char;
    const isWhitespace = /\s/.test(normalized);

    if (isWhitespace) {
      if (previousWasWhitespace) continue;
      cleaned += ' ';
      previousWasWhitespace = true;
      continue;
    }

    cleaned += normalized;
    previousWasWhitespace = false;
  }

  cleaned = cleaned.trim();

  return cleaned.slice(0, maxLength);
}
