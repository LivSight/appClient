const FRENCH_PARTICLES = new Set([
  "de",
  "du",
  "des",
  "d",
  "le",
  "la",
  "les",
  "l",
  "et",
  "ou",
  "à",
  "a",
  "au",
  "aux",
  "en",
  "sur",
  "sous",
]);

function shouldPreserveRaw(value: string): boolean {
  if (value.includes("@")) return true;
  if (/^\+?[\d\s().-]{8,}$/.test(value)) return true;
  if (/^TR-\w+/i.test(value)) return true;
  if (/^https?:\/\//i.test(value)) return true;
  return false;
}

function normalizeToken(token: string): string {
  if (!token) return token;
  if (/^\d/.test(token) || /^x\d+$/i.test(token)) return token;
  return token
    .split(/(-)/)
    .map((part) => {
      if (part === "-") return part;
      const lower = part.toLowerCase();
      if (!lower) return part;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

function toTitleCaseWords(text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words
    .map((word, index) => {
      const bare = word.replace(/^[^A-Za-zÀ-ÿ]+|[^A-Za-zÀ-ÿ]+$/g, "").toLowerCase();
      if (index > 0 && FRENCH_PARTICLES.has(bare)) return word.toLowerCase();
      return normalizeToken(word);
    })
    .join(" ");
}

/** Title-case user-facing text from the API (names, places, product labels). */
export function toTitleCase(input: string): string {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) return trimmed;

  return trimmed
    .split(/(\s*→\s*|\s*—\s*)/)
    .map((part) => {
      if (/^\s*→\s*$/.test(part)) return " → ";
      if (/^\s*—\s*$/.test(part)) return " — ";
      if (!part.trim()) return part;
      return toTitleCaseWords(part.trim());
    })
    .join("");
}

/** Format API / DB free text for display. Leaves emails, phones, and refs unchanged. */
export function formatDbText(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return text;
  if (shouldPreserveRaw(text)) return text;
  return toTitleCase(text);
}
