// Self-check for index.html. Run: node test.js  (Node 18+, no install needed)
const fs = require("fs"), assert = require("assert");
const html = fs.readFileSync(__dirname + "/index.html", "utf8");
const [main, studio] = html.split("<script>").slice(1).map(s => s.split("</script>")[0]);
[main, studio].forEach(s => new Function(s)); // both scripts parse

const engine = main.split("// ===== UI =====")[0];
const sample = main.match(/const SAMPLE_TEXT = (`[\s\S]*?`);/)[1];
// Network APIs are shadowed with tripwires: any call during generation fails the run
let netCalls = 0;
const trip = () => { netCalls++; throw new Error("network call"); };
const api = new Function("fetch", "XMLHttpRequest", "WebSocket", "EventSource", "navigator", engine + studio.split("// ===== Studio UI")[0] +
  `;return {analyze, compare, count, generate, rollField, validate, similarity, storyText, inspectTextQuality, feelEvidence, classifyEvidence, LEAN, OPPOSITE, PLOTS, STRUCTURES, ENDINGS, SAMPLE_TEXT: ${sample}}`)(trip, trip, trip, trip, {sendBeacon: trip});

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

// Input integrity and evidence checks
assert(api.inspectTextQuality(api.SAMPLE_TEXT).ok, "readable Thai sample passes text quality guard");
const protectedText = "ภาษาไทยที่มองเห็นได้ " + "\uE56A".repeat(24);
const protectedResult = api.inspectTextQuality(protectedText);
assert.equal(protectedResult.ok, false, "private-use font glyphs are rejected before analysis");
assert.equal(protectedResult.issue, "protected-font", "protected-font issue is identified");
const mixedProtectedText = ("เนื้อหาไทยปกติ ".repeat(8)) + "\\uE54A".repeat(8) + (" ข้อความต่อท้าย".repeat(8));
assert.equal(api.inspectTextQuality(mixedProtectedText).ok, false, "mixed Thai and protected-font glyphs are rejected");
assert.equal(api.inspectTextQuality(mixedProtectedText).issue, "protected-font", "mixed protected-font text gets a specific diagnosis");
const invisibleText = ("ประโยคภาษาไทยที่อ่านได้ ".repeat(10)) + "\\u200B".repeat(24);
assert.equal(api.inspectTextQuality(invisibleText).issue, "invisible-characters", "excessive zero-width characters are flagged");

assert(api.inspectTextQuality("ต้นฉบับธรรมดาที่มีภาษาไทยและคำพูด \uFFFD").ok, "one replacement character is not over-blocked");
const evidence = api.feelEvidence(api.SAMPLE_TEXT);
assert(evidence.length > 0 && evidence[0].terms.length > 0, "analysis provides explicit keywords supporting a tone");
assert(api.classifyEvidence(evidence).label, "genre evidence is labelled with cautious strength");

// ReadAWrite importer UI and local-only storage contract
assert(html.includes('id="t-import"') && html.includes('id="p-import"'), "ReadAWrite library tab and panel exist");
assert(html.includes("novellens.readawrite.imports.v1"), "imports persist in browser-local storage");
assert(html.includes("saveReadAWriteImport") && html.includes("sourceUrl:location.href"), "bookmarklet sends source metadata for chapter imports");
assert(html.includes("data-rw-analyze") && html.includes("data-rw-delete"), "saved chapters can be analyzed and deleted");
assert(html.includes("ReadAWrite") && html.includes("ไม่สามารถอ่านหน้า ReadAWrite ข้ามโดเมน"), "cross-origin limitation is explained in the UI");
const importerMatch = html.match(/\/\/ ===== ReadAWrite local library[\s\S]*?(?=for \(const \[tab, panel\])/);
assert(importerMatch && !/fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|api[_-]?key/i.test(importerMatch[0]), "ReadAWrite importer does not call network or AI APIs");
// ===== Procedural engine =====
assert(!/fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|\bimport\s*\(|api[_-]?key/i.test(studio), "studio script has no network or AI-provider code");
assert.deepEqual([...html.matchAll(/<link\b[^>]*href=["'](https?:\/\/[^"']+)/ig)].map(m => m[1]).filter(u => !u.startsWith("https://fonts.googleapis.com")), [], "the only external stylesheet resource is the font stylesheet");

// Fixtures: three different story shapes, not the same plot with new names
const F = {
  // detective case: hero journey, a villain, a loyal friend, a red-herring suspect
  case: {chars: [
    {name: "ธาม", role: "ตัวเอก", job: "นักข่าวสายสืบสวน", traits: ["ช่างสังเกต", "รอบคอบ", "พูดน้อย"], flaw: "ไม่ไว้ใจใคร", want: "รู้ความจริงเรื่องอดีตของตัวเอง", fear: "ความมืด", secret: "ใช้ชื่อปลอมมาตลอด", wound: "เสียพี่ชายในอุบัติเหตุ", item: "นาฬิกาพกของพ่อ", skill: "ความจำดีเยี่ยม"},
    {name: "ใบบัว", role: "เพื่อนสนิท", traits: ["ซื่อสัตย์", "ใจดี"], want: "ปกป้องน้องชาย", family: "ลูกคนเดียวของแม่เลี้ยงเดี่ยว"},
    {name: "เมฆา", role: "ตัวร้าย", traits: ["เจ้าเล่ห์", "มั่นใจ"], want: "ได้เป็นที่หนึ่ง", secret: "เคยเป็นคนของฝ่ายศัตรู"},
    {name: "รวิ", role: "ตัวละครรอง", secret: "แอบรักคนที่ไม่ควรรัก"}],
    plot: {genre: "ลึกลับ", structure: "hero", ending: "หักมุม", conflict: "คนกับคน", chapters: 20, complexity: 3, strictness: "strict", candidates: 3, seed: "case-1"}},
  // quiet tragedy: four-beat kishotenketsu, no villain, the conflict is inside the hero
  inner: {chars: [{name: "ลลิล", role: "ตัวเอก", traits: ["ขี้อาย", "ขี้กังวล", "ใจดี"], flaw: "หนีปัญหา", want: "หนีจากชีวิตเดิม", fear: "การถูกทิ้ง", secret: "ไม่ใช่ลูกแท้ๆ ของพ่อแม่", wound: "พ่อแม่หย่ากันตอนเด็ก", item: "จดหมายที่ยังไม่ได้เปิด", skill: "วาดรูป"}],
    plot: {genre: "เศร้า", structure: "kisho", ending: "โศกนาฏกรรม", conflict: "คนกับตัวเอง", chapters: 4, complexity: 1, strictness: "normal", candidates: 1, seed: "inner-1"}},
  // comedy of rivals: two leads want the same thing and their temperaments clash
  rivals: {chars: [
    {name: "ปิ่นมุก", role: "ตัวเอก", traits: ["ใจร้อน", "มั่นใจ", "ขี้เล่น"], flaw: "อยากชนะทุกเรื่อง", want: "เปิดร้านของตัวเอง", fear: "ความล้มเหลว", skill: "ทำอาหาร", item: "สมุดบันทึกเก่า"},
    {name: "คิริน", role: "คู่พระ/นาง", traits: ["รอบคอบ", "เย็นชา"], want: "เปิดร้านของตัวเอง"}],
    plot: {genre: "ตลก", structure: "three", ending: "สุขนิยม", conflict: "คนกับคน", chapters: 10, complexity: 2, strictness: "loose", candidates: 5, seed: "rivals-1", forbidden: "ตาย"}}
};
const clone = o => JSON.parse(JSON.stringify(o));
const R = Object.fromEntries(Object.entries(F).map(([k, st]) => [k, api.generate(clone(st))]));

assert.equal(netCalls, 0, "no network calls while generating");
for (const [k, st] of Object.entries(F)) assert.equal(JSON.stringify(api.generate(clone(st)).outline), JSON.stringify(R[k].outline), `${k}: same seed gives the same plot`);
assert.notEqual(JSON.stringify(api.generate({...clone(F.case), plot: {...F.case.plot, seed: "case-2"}}).outline.map(o => o.text)), JSON.stringify(R.case.outline.map(o => o.text)), "a new seed gives a new plot");
assert.notEqual(R.case.structure, R.inner.structure, "fixtures use different structures");
assert(new Set(Object.values(R).map(r => r.conflict)).size === 3, "fixtures produce different central conflicts");
assert(R.rivals.conflict.includes("คิริน"), "rivals conflict comes from the other lead");
assert(R.inner.conflict.includes("การถูกทิ้ง"), "a lone hero gets an inner conflict from want vs fear");

for (const [k, r] of Object.entries(R)) {
  const hero = F[k].chars[0], mine = [...hero.traits, hero.flaw].map(t => api.LEAN[t]);
  r.outline.forEach((o, i) => {
    if (i) assert(o.cause.length && o.cause.every(c => c < i), `${k}: beat ${i} has an earlier cause`);
    if (o.lean && !o.arc) assert(mine.includes(o.lean), `${k}: decision "${o.lean}" fits the hero's traits`);
  });
  const climax = r.outline.find(o => o.arc);
  assert.equal(climax.lean, api.OPPOSITE[api.LEAN[hero.flaw]], `${k}: the climax choice turns away from the flaw`);
  assert(!r.issues.some(i => i.level === "error"), `${k}: no errors left after repair: ` + JSON.stringify(r.issues));
  assert(r.titles.length && r.question && r.motives.length && r.arcs.length, `${k}: structured sections present`);
}
assert(R.rivals.outline.filter(o => o.slot === "decide").length === 1 && R.case.outline.filter(o => o.slot === "decide").length === 2, "complexity adds decision beats");
assert(!R.rivals.outline.some(o => o.text.includes("ตาย")), "forbidden words are kept out");

// Twists and clues
for (let i = 0; i < 40; i++) {
  const r = api.generate({...clone(F.case), plot: {...F.case.plot, seed: "t" + i, candidates: 1}});
  const t = r.twist;
  assert(t && t.clueAt.length >= 3 && t.clueAt.every(c => c < t.reveal), "strict: three clues before the reveal");
  assert(!["identity", "betrayal", "priority"].includes(t.key), "an honest friend is not made a traitor");
  assert(t.herring && t.herring.at < t.reveal, "mysteries get a red herring before the solution");
  for (const f of ["reader", "chars", "truth", "missed", "stakes"]) assert(t[f], "twist tracks " + f);
  assert(r.outline.slice(t.reveal + 1).some(o => o.text.includes(t.stakes)) || t.reveal === r.outline.length - 1, "the reveal changes what happens next");
}
assert.equal(api.generate({...clone(F.inner), plot: {...F.inner.plot, twist: "none"}}).twist, null, "twists can be switched off");

// Validation catches broken plots
const kin = api.generate({...clone(F.case), plot: {...F.case.plot, twist: "kin"}});
assert(kin.issues.some(i => i.rule === "contradiction"), "a sibling twist contradicts an only child");
const bad = clone(R.case);
bad.outline[3].cause = []; bad.outline[2].uses = ["twist"]; bad.twist.clueAt = [bad.twist.reveal + 1];
const rules = api.validate(bad, F.case.plot).map(i => i.rule);
for (const r of ["cause", "knowledge", "setup", "timeline"]) assert(rules.includes(r), "detects " + r);
const lost = clone(R.inner); lost.outline[1].absent = ["ลลิล"]; lost.outline[2].text += " ลลิล";
assert(api.validate(lost, F.inner.plot).some(i => i.rule === "presence"), "detects a character who reappears after leaving");

// Novelty
assert.equal(api.similarity(R.case.features, R.case.features), 1);
assert(api.similarity(R.case.features, R.rivals.features) < .3, "different stories share few features");
const again = api.generate(clone(F.case), [{print: "old", features: R.case.features}]);
assert(again.score["ความใหม่"].includes("%"), "similarity to earlier plots is reported");
assert.equal(api.generate(clone(F.case), [{print: R.case.print, features: R.case.features}]).seed, R.case.seed, "the same plot is not penalised against itself");

// Persistence and export: the saved JSON still validates and exports
const saved = JSON.parse(JSON.stringify(R.case));
assert.deepEqual(api.validate(saved, F.case.plot), R.case.issues);
const txt = api.storyText(saved);
assert(txt.includes("จุดหักมุม") && txt.includes("เพราะ:") && !/undefined|\{\w+\}/.test(txt), "text export has the new sections");
assert(api.storyText({logline: "x", cast: [], links: [], outline: [], structure: "s"}).includes("x"), "old saved stories still export");
assert.equal(netCalls, 0, "still no network calls");

console.log("all checks passed");
