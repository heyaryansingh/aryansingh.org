/**
 * moderation.ts — cheap spam/abuse guard for anonymous UGC.
 *
 * Not a content-policy engine. Blocks obvious slurs/spam and link-stuffing so a
 * personal guestbook stays usable. Owner can hide anything that slips through
 * via /api/moderate.
 */

// Collapse leetspeak + repeats so "f_u_c_k" / "fuuuck" normalize before matching.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z ]/g, "")
    .replace(/(.)\1{2,}/g, "$1$1"); // 3+ repeats -> 2
}

// Kept intentionally short: the worst slurs + common spam. Substring match on
// the normalized string. This is a deterrent, not a guarantee.
const BLOCKLIST = [
  "nigger", "nigga", "faggot", "retard", "kike", "chink", "spic", "wetback",
  "cunt", "fuck", "shit", "bitch", "asshole", "dick", "pussy", "bastard",
  "viagra", "cialis", "porn", "casino", "crypto giveaway", "free money",
];

const URL_RE = /https?:\/\/|www\.|\.(com|net|org|io|ru|xyz|top|shop)\b/gi;

export interface ModerationVerdict {
  clean: boolean;
  reason?: string;
}

export function moderate(text: string): ModerationVerdict {
  const norm = normalize(text);
  for (const bad of BLOCKLIST) {
    if (norm.includes(normalize(bad))) {
      return { clean: false, reason: "Message flagged by the language filter." };
    }
  }
  // Link-stuffing: a couple links is spammy on a guestbook.
  const links = text.match(URL_RE);
  if (links && links.length > 2) {
    return { clean: false, reason: "Too many links." };
  }
  return { clean: true };
}
