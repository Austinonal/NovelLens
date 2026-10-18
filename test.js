// Self-check for index.html. Run: node test.js  (Node 18+, no install needed)
const fs = require("fs"), assert = require("assert");
const html = fs.readFileSync(__dirname + "/index.html", "utf8");
const [main, studio] = html.split("<script>").slice(1).map(s => s.split("</script>")[0]);
[main, studio].forEach(s => new Function(s)); // both scripts parse

const engine = main.split("// ===== UI =====")[0];
const sample = main.match(/const SAMPLE_TEXT = (`[\s\S]*?`);/)[1];
const api = new Function(engine + studio.split("// ===== Studio UI")[0] +
  `;return {analyze, compare, count, generate, rollField, PLOTS, STRUCTURES, ENDINGS, SAMPLE_TEXT: ${sample}}`)();

// Analyzer
const a = api.analyze(api.SAMPLE_TEXT);
assert.equal(api.count("เธอไม่เศร้าเลย แต่เขาเศร้า", "เศร้า"), 1, "negation is skipped");
assert(a.pov.startsWith("บุคคลที่สาม"), "point of view");
assert.equal(a.cast[0]?.name, "พิมพ์ดาว", "lead character found");
assert(!a.cast.some(c => c.name === "ร้าน"), "a place is not a character");
assert(a.summary.length === 3 && a.curve.length === 6, "summary and emotion arc");
assert.equal(api.compare(a, a).score, 100, "text matches itself");
const action = api.analyze('"มึงจะไปไหนวะ" กูตะโกน ผมวิ่งหนีสุดชีวิต ดาบฟันลงมา ระเบิดดังสนั่น ศัตรูไล่ล่า\n'.repeat(5));
assert(api.compare(a, action).score < 50, "different styles score low");

// Plot generator: every genre × structure × ending
for (const genre of Object.keys(api.PLOTS)) for (const structure of Object.keys(api.STRUCTURES)) for (const ending of Object.keys(api.ENDINGS)) {
  const hero = {role: "ตัวเอก"};
  for (const k of ["name", "job", "traits", "flaw", "want", "fear", "secret", "wound", "item", "skill"]) api.rollField(hero, k);
  const r = api.generate({chars: [hero, {name: "ภูผา", role: "ตัวร้าย"}], plot: {genre, structure, ending, conflict: "คนกับคน", chapters: 12, setting: "", premise: ""}});
  const text = r.logline + r.outline.map(o => o.text).join("");
  assert(!/\{\w+\}|undefined|null/.test(text), `unfilled template in ${genre}/${structure}/${ending}`);
  assert(r.outline.at(-1).chapters.endsWith("12"), "last beat reaches the last chapter");
}
assert.equal(api.generate({chars: [{}], plot: {}}), null, "needs at least one named character");

console.log("all checks passed");
