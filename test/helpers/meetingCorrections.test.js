const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseMeetingCorrections,
  compileMeetingCorrections,
  applyMeetingCorrections,
} = require("../../src/helpers/meetingCorrections.cjs");

test("only accepts explicit local correction mappings", () => {
  const rules = parseMeetingCorrections([
    "# Local meeting rules; comments and plain dictionary words are ignored",
    "PLC",
    "fiber op tic => fiber optic",
    "FIBER OP TIC => anything else",
    "this line has no separator",
    "abc => ",
    "=> value",
    "oops => a => b",
    "openwhispr => OpenWhispr",
  ].join("\n"));
  assert.deepEqual(rules, [
    { heard: "fiber op tic", corrected: "fiber optic" },
    { heard: "openwhispr", corrected: "OpenWhispr" },
  ]);
});

test("replaces whole words only, case-insensitively and across repeated whitespace", () => {
  const compiled = compileMeetingCorrections("fiber op tic => fiber optic\nprofi bus => PROFIBUS");
  const input = "The PROFI BUS cable and fiber   op tic were checked. A profi buses test is unrelated.";
  assert.equal(
    applyMeetingCorrections(input, compiled),
    "The PROFIBUS cable and fiber optic were checked. A profi buses test is unrelated."
  );
});

test("respects punctuation and Unicode word boundaries", () => {
  const compiled = compileMeetingCorrections("nuvana => Nuvana");
  assert.equal(applyMeetingCorrections("(nuvana), nuvana2, cafénuvana", compiled), "(Nuvana), nuvana2, cafénuvana");
});

test("longest-match wins; inserted corrections cannot cascade", () => {
  const compiled = compileMeetingCorrections([
    "smart switch => SmartSwitch",
    "switch => Switchgear",
    "SmartSwitch => Different",
  ].join("\n"));
  assert.equal(
    applyMeetingCorrections("The smart switch and switch were checked.", compiled),
    "The SmartSwitch and Switchgear were checked."
  );
});

test("dollar signs and regex metacharacters in rules remain literal", () => {
  const compiled = compileMeetingCorrections("line (a) => Line $A\nv 1.2 => V1.2");
  assert.equal(
    applyMeetingCorrections("The line (a) is on v 1.2.", compiled),
    "The Line $A is on V1.2."
  );
});

test("no rules means original transcription is unchanged", () => {
  assert.equal(compileMeetingCorrections("Just a glossary entry"), null);
  assert.equal(applyMeetingCorrections("Unchanged transcript.", null), "Unchanged transcript.");
});

test("large rules inputs are bounded and a long transcription remains intact", () => {
  const rules = Array.from({ length: 200 }, (_, i) => "item" + i + " => Term" + i).join("\n");
  const compiled = compileMeetingCorrections(rules);
  assert.equal(compiled.count, 150);
  const longTranscript = "We checked item0. ".repeat(5000);
  const result = applyMeetingCorrections(longTranscript, compiled);
  assert.equal((result.match(/Term0/g) || []).length, 5000);
  assert.equal(result.length > 50000, true);
});
