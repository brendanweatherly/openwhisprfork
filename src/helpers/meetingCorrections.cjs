"use strict";

// Local-only, opt-in corrections for meeting speech-to-text output.
// No customer vocabulary or transcript data belongs in this source file.
// Each rule is a literal "heard phrase => intended phrase" (not a regex).
const MAX_RULES = 150;
const MAX_SOURCE_LENGTH = 16000;
const MAX_PHRASE_LENGTH = 90;

function normalizedKey(value) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

function parseMeetingCorrections(input) {
  if (typeof input !== "string" || !input.trim()) return [];
  const rules = [];
  const seen = new Set();

  for (const sourceLine of input.slice(0, MAX_SOURCE_LENGTH).split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || line.startsWith("#")) continue;
    const divider = line.indexOf("=>");
    if (divider < 0 || divider !== line.lastIndexOf("=>")) continue;

    const heard = line.slice(0, divider).trim().normalize("NFC");
    const corrected = line.slice(divider + 2).trim().normalize("NFC");
    if (
      heard.length < 3 ||
      heard.length > MAX_PHRASE_LENGTH ||
      corrected.length < 1 ||
      corrected.length > MAX_PHRASE_LENGTH ||
      /[\u0000-\u001f<>]/u.test(heard + corrected) ||
      heard === corrected
    ) continue;

    const key = normalizedKey(heard);
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push({ heard, corrected });
    if (rules.length >= MAX_RULES) break;
  }
  return rules;
}

function escapedPhrase(value) {
  return value
    .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
}

function compileMeetingCorrections(input) {
  const rules = parseMeetingCorrections(input);
  if (!rules.length) return null;

  // Longer phrases take precedence over nested shorter phrases.
  rules.sort((a, b) => b.heard.length - a.heard.length);
  const alternates = rules.map((rule) => escapedPhrase(rule.heard)).join("|");
  const matcher = new RegExp(
    "(?<![\\p{L}\\p{M}\\p{N}_])(?:" + alternates + ")(?![\\p{L}\\p{M}\\p{N}_])",
    "giu"
  );
  return {
    count: rules.length,
    matcher,
    replacements: new Map(rules.map((rule) => [normalizedKey(rule.heard), rule.corrected])),
  };
}

function applyMeetingCorrections(text, compiled) {
  if (typeof text !== "string" || !compiled?.matcher) return text;
  compiled.matcher.lastIndex = 0;
  // Function replacement preserves literal "$" in company/product names and
  // ensures replacements cannot cascade within the same transcription chunk.
  return text.replace(
    compiled.matcher,
    (match) => compiled.replacements.get(normalizedKey(match)) ?? match
  );
}

module.exports = { parseMeetingCorrections, compileMeetingCorrections, applyMeetingCorrections };
