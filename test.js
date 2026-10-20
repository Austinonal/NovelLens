// Self-check for index.html. Run: node test.js  (Node 18+, no install needed)
const fs = require("fs"), assert = require("assert");
const writerUtils = require(__dirname + "/writer-workspace.js");
const jsFileAvailable = typeof writerUtils.analyzeReferenceText === "function";
const html = fs.readFileSync(__dirname + "/index.html", "utf8");
const [main, studio] = html.split("<script>").slice(1).map(s => s.split("</script>")[0]);
[main, studio].forEach(s => new Function(s)); // both scripts parse

const engine = main.split("// ===== UI =====")[0];
const sample = main.match(/const SAMPLE_TEXT = (`[\s\S]*?`);/)[1];
// Network APIs are shadowed with tripwires: any call during generation fails the run
let netCalls = 0;
const trip = () => { netCalls++; throw new Error("network call"); };
const api = new Function("fetch", "XMLHttpRequest", "WebSocket", "EventSource", "navigator", engine + studio.split("// ===== Studio UI")[0] +
  `;return {analyzeStory, splitChapters, analyze, compare, count, generate, rollField, validate, similarity, storyText, inspectTextQuality, auditTextCompleteness, normalizeReadAWriteUrl, extractHtmlFromMhtml, feelEvidence, classifyEvidence, LEAN, OPPOSITE, PLOTS, STRUCTURES, ENDINGS, SAMPLE_TEXT: ${sample}}`)(trip, trip, trip, trip, {sendBeacon: trip});

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

// ReadAWrite URL normalization: percent-encoded routes are preserved, not mistaken for bad text.
assert.equal(api.normalizeReadAWriteUrl("www.readawrite.com/a/abc%25chapter").includes("/a/abc%25chapter"), true, "percent-encoded URL path is retained");
assert.equal(api.normalizeReadAWriteUrl("https://www.readawrite.com/a/%E0%B8%99%E0%B8%B4%E0%B8%A2%E0%B8%B2%E0%B8%A2").includes("%E0%B8%99"), true, "Thai percent-encoded path is retained");
assert.equal(api.normalizeReadAWriteUrl("https%3A%2F%2Fwww.readawrite.com%2Fa%2Fstory%3Fchapter%3D2"), "https://www.readawrite.com/a/story?chapter=2", "outer percent-encoded URL is normalized");
assert.equal(api.normalizeReadAWriteUrl("www.readawrite.com/a/story?x=1&amp;y=2"), "https://www.readawrite.com/a/story?x=1&y=2", "HTML-escaped query ampersand is normalized");
assert.equal(api.normalizeReadAWriteUrl("[ReadAWrite](https://www.readawrite.com/a/story?x=1)"), "https://www.readawrite.com/a/story?x=1", "Markdown-wrapped URL is accepted");
assert.equal(api.normalizeReadAWriteUrl("http://www.readawrite.com/a/story").startsWith("https://"), true, "ReadAWrite http URLs are upgraded to https");
assert.throws(()=>api.normalizeReadAWriteUrl("https://notreadawrite.com/a/story"), /ReadAWrite/, "lookalike domains are rejected");
assert.throws(()=>api.normalizeReadAWriteUrl("javascript:alert(1)"), /HTTP\/HTTPS/, "javascript URLs are rejected");

const savedArchive = [
  'MIME-Version: 1.0',
  'Content-Type: multipart/related; boundary="NL_BOUNDARY"',
  '',
  '--NL_BOUNDARY',
  'Content-Type: text/html; charset="utf-8"',
  'Content-Transfer-Encoding: quoted-printable',
  'Content-Location: https://www.readawrite.com/a/chapter%25one',
  '',
  '<!doctype html><html><body><article>Sample=20chapter=20text</article></body></html>',
  '--NL_BOUNDARY--',
  ''
].join("\r\n");
const decodedArchive = api.extractHtmlFromMhtml(savedArchive);
assert(decodedArchive.html.includes("Sample chapter text"), "MHTML quoted-printable HTML is decoded");
assert.equal(decodedArchive.contentLocation, "https://www.readawrite.com/a/chapter%25one", "MHTML source URL keeps percent encoding");


// Input integrity and evidence checks
assert(api.inspectTextQuality(api.SAMPLE_TEXT).ok, "readable Thai sample passes text quality guard");
const qualityReport = api.auditTextCompleteness(api.SAMPLE_TEXT);
assert(Number.isFinite(qualityReport.score) && qualityReport.score >= 0 && qualityReport.score <= 100, "input completeness audit returns a bounded score");
assert(Array.isArray(qualityReport.warnings) && qualityReport.level, "input completeness audit returns explanatory warnings and a level");
assert(api.analyze(api.SAMPLE_TEXT).quality.score === qualityReport.score, "analysis includes the same input quality report");
assert(api.auditTextCompleteness("สั้นมาก").warnings.some(w => w.includes("สั้น")), "very short input is flagged for incomplete coverage");
const repeatedLines = Array(8).fill("ประโยคยาวนี้เป็นข้อความตัวอย่างที่ซ้ำกันในหน้าต้นฉบับ").join("\n");
assert(api.auditTextCompleteness(repeatedLines).duplicateLines > 0, "repeated long lines are detected");

const protectedText = "ภาษาไทยที่มองเห็นได้ " + "\uE56A".repeat(24);
const protectedResult = api.inspectTextQuality(protectedText);
assert.equal(protectedResult.ok, false, "private-use font glyphs are rejected before analysis");
assert.equal(protectedResult.issue, "protected-font", "protected-font issue is identified");
const mixedProtectedText = ("เนื้อหาไทยปกติ ".repeat(8)) + "\\uE54A".repeat(8) + (" ข้อความต่อท้าย".repeat(8));
assert.equal(api.inspectTextQuality(mixedProtectedText).ok, false, "mixed Thai and protected-font glyphs are rejected");
assert.equal(api.inspectTextQuality(mixedProtectedText).issue, "protected-font", "mixed protected-font text gets a specific diagnosis");
const escapedPua = api.inspectTextQuality(("เนื้อหาปกติ ".repeat(8)) + "\\uE54A".repeat(8) + (" ต่อท้าย".repeat(8)));
assert.equal(escapedPua.ok, false, "literal private-use escape sequences are rejected");
assert.equal(escapedPua.issue, "protected-font", "literal private-use escapes get specific diagnosis");

const invisibleText = ("ประโยคภาษาไทยที่อ่านได้ ".repeat(10)) + "\\u200B".repeat(24);
assert.equal(api.inspectTextQuality(invisibleText).issue, "invisible-characters", "excessive zero-width characters are flagged");

assert(api.inspectTextQuality("ต้นฉบับธรรมดาที่มีภาษาไทยและคำพูด \uFFFD").ok, "one replacement character is not over-blocked");
const evidence = api.feelEvidence(api.SAMPLE_TEXT);
assert(evidence.length > 0 && evidence[0].terms.length > 0, "analysis provides explicit keywords supporting a tone");
assert(api.classifyEvidence(evidence).label, "genre evidence is labelled with cautious strength");

// ReadAWrite importer UI and local-only storage contract
assert(html.includes('id="t-import"') && html.includes('id="p-import"'), "ReadAWrite library tab and panel exist");

assert(html.includes('id="t-writer"') && html.includes('id="p-writer"'), "Writer's Room tab and panel exist");
assert(html.includes('href="./writer-workspace.css"') && html.includes('src="./writer-workspace.js"'), "Writer's Room assets are linked");
assert.equal(typeof writerUtils.buildChapterPlan, "function", "Writer's Room exposes chapter planning utility");
assert.equal(typeof writerUtils.buildSchedule, "function", "Writer's Room exposes schedule utility");

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


assert(html.includes("visible-page-text") && html.includes("selected-text"), "bookmarklet supports selection and visible DOM text capture");
assert(html.includes("captureSelector") && html.includes("capturedLength"), "bookmarklet records capture diagnostics");
assert(html.includes("reviewOnly") && html.includes("data-rw-review"), "unreadable captures are preserved as review-only entries");
assert(html.includes('id="rw-import-json"') && html.includes("นำเข้าเสร็จ"), "library supports restoring a JSON backup");
assert(html.includes("แยกชุดที่รอตรวจออกจากข้อความที่อ่านได้ก่อน"), "review-only text cannot be mixed with readable text for analysis");


const writerCharacters = [
  {id:"wr-a",name:"มิน",role:"ตัวเอก",traits:"ช่างสังเกต, รอบคอบ",desire:"ตามหาความจริง",fear:"ถูกทอดทิ้ง",secret:"จำอดีตไม่ได้",backstory:"เติบโตมากับแม่",strengths:"จำรายละเอียด"},
  {id:"wr-b",name:"เรน",role:"คู่ขัดแย้ง",traits:"ตลกร้าย, ช่างสงสัย",desire:"ปกป้องพี่สาว",fear:"เสียอิสระ",secret:"รู้ว่าใครส่งจดหมาย",backstory:"เคยโกหก",strengths:"อ่านคนเก่ง"}
];
const writerProject = {
  id:"wr-project",title:"บททดสอบ",mode:"standalone",chapterCount:12,genre:"ลึกลับ",
  premise:"มินพบจดหมายที่ไม่มีผู้ส่ง",question:"ใครแก้ไขความทรงจำ",themes:"ความทรงจำ",
  ending:"ความจริงมีราคา",styleTraits:"ผู้เล่าที่มีอคติ",moodMix:["ลึกลับ","ตลกร้าย","เศร้า"],
  tension:60,targetWords:5000,wordsPerPage:250,wordsPerChapter:800,
  startDate:"2026-10-19",dueDate:"2026-10-30",writingDays:[1,2,3,4,5]
};
writerProject.chapters = writerUtils.buildChapterPlan(writerProject, writerCharacters);
assert.equal(writerProject.chapters.length, 12, "chapter planner creates the requested chapter count");
assert(writerProject.chapters[0].goal && writerProject.chapters.at(-1).hook, "chapter plan includes goal and ending hook");
assert(writerProject.chapters[0].scene.includes(writerProject.premise), "opening scene connects to the user's story premise");
assert(writerProject.chapters.every(c => c.scene && c.conflict), "chapter planner seeds scene and conflict guidance instead of leaving every field blank");
assert(writerProject.chapters.some(c => c.clue), "chapter plan seeds clues around planned twists");
assert(writerProject.chapters.some(c => c.twist), "chapter plan places suggested twists for a longer story");
const dazaiProject = {
  ...writerProject,
  stylePreset: "ญี่ปุ่นคลาสสิก · ดาไซ โอซามุ",
  styleTraits: "การสำรวจจิตใจและความแปลกแยก, เสียดสีสังคมอย่างขมขื่น, อารมณ์ขันสีดำแบบยับยั้ง, ความเปราะบางที่ซ่อนหลังถ้อยคำเรียบ"
};
const dazaiChapters = writerUtils.buildChapterPlan(dazaiProject, writerCharacters);
assert(dazaiChapters.some(c => ["ตลกร้าย", "เสียดสีสังคม", "ขมขื่น"].includes(c.mood)), "high-level style reference affects the chapter mood sequence");
assert(dazaiChapters.some((c, i) => c.tension !== writerProject.chapters[i].tension), "restrained style traits affect the suggested tension curve");
const blendedWriterCharacter = writerUtils.createBlend(writerCharacters,{ "wr-a":60, "wr-b":40 });
assert(blendedWriterCharacter.name.includes("มิน") && blendedWriterCharacter.name.includes("เรน"), "character blend names both source profiles");
assert(blendedWriterCharacter.traits.includes("ช่างสังเกต") && blendedWriterCharacter.traits.includes("ตลกร้าย"), "character blend combines traits");
const readiness = writerUtils.evaluatePlan(writerProject, writerCharacters);
assert(readiness.score >= 0 && readiness.score <= 100 && readiness.checklist.length >= 5, "planner readiness score is bounded and includes a checklist");
const continuityProbe = {
  ...writerProject,
  selectedCharacterIds: ["wr-a","wr-b","wr-c"],
  chapters: [
    {goal:"เริ่ม",scene:"พบจดหมาย",conflict:"ใครส่ง",clue:"",twist:"ผู้ส่งอยู่ในห้อง",hook:"ตามหาหมึก",cast:["มิน"],mood:"ลึกลับ",tension:3},
    {goal:"ตามหา",scene:"ตรวจหมึก",conflict:"ข้อมูลขัดกัน",clue:"ตราประทับ",twist:"",hook:"พบผู้ต้องสงสัย",cast:["มิน"],mood:"ลึกลับ",tension:5},
    {goal:"เผชิญหน้า",scene:"พบผู้ต้องสงสัย",conflict:"ปกป้องความลับ",clue:"",twist:"",hook:"คำสารภาพ",cast:["เรน"],mood:"ลึกลับ",tension:8},
    {goal:"เฉลย",scene:"เปิดจดหมาย",conflict:"เลือกความจริง",clue:"",twist:"",hook:"ปิดเรื่อง",cast:["มิน"],mood:"ลึกลับ",tension:7},
    {goal:"ปิดท้าย",scene:"มินเก็บจดหมาย",conflict:"เก็บความจริงไว้หรือเปิดเผย",clue:"",twist:"",hook:"จบบริบูรณ์",cast:["มิน"],mood:"ลึกลับ",tension:2}
  ]
};
const continuityWarnings = writerUtils.continuityFindings(continuityProbe, writerCharacters.concat([{id:"wr-c",name:"อิง"}]));
assert(continuityWarnings.some(x=>x.includes("เบาะแส")), "continuity audit checks whether twists are seeded");
assert(continuityWarnings.some(x=>x.includes("เปลี่ยนตัวละคร")), "continuity audit flags abrupt cast changes without a note");
assert(continuityWarnings.some(x=>x.includes("Mood เหมือนกัน")), "continuity audit spots a flat mood sequence");
assert(continuityWarnings.some(x=>x.includes("ยังไม่ปรากฏ")), "continuity audit checks selected characters against chapter cast lists");
const mysteryBoardCheck = writerUtils.buildMysteryBoard({chapters:[
  {title:"ภาพเปิด",clue:"",twist:"ตัวเอกอยู่ในความทรงจำปลอม"},
  {title:"ร่องรอย",clue:"ตราประทับสีเงิน",twist:""},
  {title:"จดหมาย",clue:"",twist:"ผู้ส่งคือเพื่อนเก่า"}
]});
assert.equal(mysteryBoardCheck.clueCount, 1, "mystery board counts chapter clues");
assert.equal(mysteryBoardCheck.twistCount, 2, "mystery board counts twists");
assert.equal(mysteryBoardCheck.twistsWithoutSetup, 1, "mystery board flags a twist with no earlier or same-chapter clue");
assert.equal(mysteryBoardCheck.timeline[0].setupStatus, "missing", "unseeded twists are marked for review");
assert.equal(mysteryBoardCheck.timeline[2].setupStatus, "prior", "twists can surface possible earlier clues for manual review");
assert(mysteryBoardCheck.timeline[2].possibleClueNumbers.includes(2), "mystery board gives candidate clue chapter numbers without claiming an exact link");
const writerSchedule = writerUtils.buildSchedule(writerProject);
assert.equal(writerSchedule.sessionCount, 10, "writing schedule respects chosen weekdays and date range");
assert.equal(writerSchedule.schedule.reduce((n,item)=>n+item.targetWords,0), writerProject.targetWords, "daily word goals sum to the planned book target");
assert(writerSchedule.schedule.every(item => [1,2,3,4,5].includes(new Date(item.date+"T12:00:00").getDay())), "schedule uses only selected writing weekdays");
assert.throws(()=>writerUtils.buildSchedule({...writerProject,dueDate:""}), /วันเริ่ม/, "schedule requires dates before preview");
assert.throws(()=>writerUtils.buildSchedule({...writerProject,writingDays:[]}), /วันเขียน/, "schedule requires at least one writing day");
const fingerprint = writerUtils.analyzeReferenceText("She is observant, sarcastic, and curious.\nA thoughtful public profile.");
assert(fingerprint.traits.includes("ช่างสังเกต") && fingerprint.traits.includes("อารมณ์ขันแห้ง/ประชด"), "reference analyzer extracts high-level traits from source notes");
// Reference links -> characters
{
  const list = writerUtils.parseUrlList("https://a.example/x\nhttps://a.example/x  not a url\nftp://b.example/y\nhttps://c.example/z", 12);
  assert.deepEqual(list.valid.map(x => x.url), ["https://a.example/x", "https://c.example/z"], "link list keeps valid unique http(s) links");
  assert.equal(list.skipped, 5, "a duplicate, the three words of \"not a url\" and the ftp link are skipped");
  assert(writerUtils.parseUrlList(Array.from({length: 13}, (_, i) => "https://a.example/" + i).join("\n"), 12).tooMany, "more than 12 links is flagged");
  assert.equal(writerUtils.wikiApiUrl("https://en.wikipedia.org/wiki/Elizabeth_Bennet").startsWith("https://en.wikipedia.org/w/api.php?"), true, "wikipedia links use the CORS API");
  assert(writerUtils.wikiApiUrl("https://en.wikipedia.org/wiki/Elizabeth_Bennet").includes("titles=Elizabeth%20Bennet") && writerUtils.wikiApiUrl("https://x.fandom.com/wiki/Foo").startsWith("https://x.fandom.com/api.php?"), "title is decoded and other wikis use /api.php");
  assert.equal(writerUtils.wikiApiUrl("https://example.com/blog/post"), "", "ordinary pages have no wiki API");
  const ok = writerUtils.characterFromSource({title: "ตัวอย่าง - Wikipedia", host: "th.wikipedia.org", url: "https://th.wikipedia.org/wiki/x", text: "She is observant, sarcastic, and curious. ".repeat(30)});
  assert.equal(ok.name, "ตัวอย่าง", "site suffix is stripped from the title");
  assert(ok.traits.includes("ช่างสังเกต") && ok.sourceUrls[0] === "https://th.wikipedia.org/wiki/x" && ok.backstory.length <= 301, "traits come from the text and only a short note is kept");
  const failed = writerUtils.characterFromSource({title: "", host: "blocked.example", url: "https://blocked.example/a", text: "", error: "CORS"});
  assert(failed.name === "blocked.example" && failed.notes.includes("อ่านหน้านี้อัตโนมัติไม่ได้") && failed.backstory === "", "an unreadable page still gives an empty character with its link");
}
const styleSample = ("ฉันนั่งอยู่ใต้แสงไฟ แล้วถามตัวเองว่าความจริงจะช่วยอะไรได้หรือไม่? " + '"เขาหัวเราะอย่างประชด" ' + "เสียงฝนยังดังอยู่\\n").repeat(5);
const styleFingerprint = writerUtils.analyzeReferenceText(styleSample);
assert(styleFingerprint.signals.averageSentenceLength > 0 && styleFingerprint.signals.averageParagraphLength > 0, "style scan reports sentence and paragraph metrics");
assert(styleFingerprint.suggestedStyleTraits.includes("เสียงเล่าแบบบุรุษที่หนึ่งเด่น"), "style scan spots a repeated first-person voice signal");
assert(Number.isFinite(styleFingerprint.signals.dialogueRatio), "style scan reports dialogue ratio");
assert(styleFingerprint.signals.repeatedWords.length >= 0, "style scan always returns a repeated-word list");
assert(jsFileAvailable === true, "style scan utility loaded from the Writer's Room module");


// Whole-story analysis
{
  const A = "ฝนตกตั้งแต่บ่ายสาม พิมพ์ดาวยืนอยู่หน้าร้านหนังสือเก่า เธอมองดูภูผาที่เดินเข้ามา \"คุณมาทุกวันพุธ\" พิมพ์ดาวพูด ภูผามองพิมพ์ดาวแล้วยิ้ม พิมพ์ดาวก้มลงมองหนังสือในมือ\n";
  const B = "ภูผาเดินออกจากร้าน พิมพ์ดาวตะโกนเรียกภูผา \"อย่าไปนะ\" ภูผาหันไปมองพิมพ์ดาว ธามยืนดูอยู่ไกลๆ ธามพูดกับภูผาว่าเรื่องนี้ไม่ง่าย พิมพ์ดาวเดินตามภูผาไป\n";
  const story = [1, 2, 3].map(i => "ตอนที่ " + i + "\n" + (i === 2 ? B : A).repeat(4)).join("\n");
  const chs = api.splitChapters(story);
  assert.deepEqual(chs.map(c => c.title), ["ตอนที่ 1", "ตอนที่ 2", "ตอนที่ 3"], "chapters are split at headings");
  assert.equal(api.splitChapters(A.repeat(4)).length, 1, "no headings keeps one chapter");
  assert.deepEqual(api.splitChapters("  "), [], "empty text gives no chapters");
  const r = api.analyzeStory(chs, ["พิมพ์ดาว", "ภูผา", "ธาม"]);
  assert.equal(r.count, 3);
  assert.equal(r.perChapter.length, 3);
  assert(r.perChapter.every(c => c.summary.length && c.how.length), "each chapter has a summary and writing notes");
  assert.deepEqual(r.perChapter.map(c => c.fresh.join()), ["พิมพ์ดาว,ภูผา", "ธาม", ""], "new characters are reported where they first appear");
  assert.equal(r.cast[0].name, "พิมพ์ดาว");
  const pair = r.links.find(l => l.a === "พิมพ์ดาว" && l.b === "ภูผา");
  assert(pair && pair.scenes === 12 && pair.bToA > pair.aToB, "who acts on whom is directional");
  assert(!r.guessed && api.analyzeStory(chs).guessed, "guessed cast is flagged");
  assert.equal(api.analyzeStory([]), null, "no chapters gives no report");
}

console.log("all checks passed");
