(function (global) {
  "use strict";
  const STORE_KEY = "novellens.writerroom.v1";
  const STUDIO_KEY = "novel-lens-studio";
  const DAY_NAMES = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const FULL_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const MOODS = ["ลึกลับ", "ตลกร้าย", "เศร้า", "อบอุ่น", "กดดัน", "ระทึก", "ขมขื่น", "หวัง", "สงบ", "โรแมนติก", "เสียดสีสังคม", "เหนือจริง"];
  const ROLES = ["ตัวเอก", "คู่ขัดแย้ง", "คู่รัก/คู่หู", "ผู้ช่วย", "ตัวร้าย", "ผู้ต้องสงสัย", "ผู้ชี้ทาง", "ตัวละครรอง"];
  const STYLE_PRESETS = {
    "ญี่ปุ่นคลาสสิก · ดาไซ โอซามุ": {
      traits: "ผู้เล่าที่มีมุมมองเฉพาะตัว, การสำรวจจิตใจและความแปลกแยก, เสียดสีสังคมอย่างขมขื่น, อารมณ์ขันสีดำแบบยับยั้ง, ความเปราะบางที่ซ่อนหลังถ้อยคำเรียบ",
      note: "ใช้เป็นแผนที่ของคุณลักษณะระดับสูง ไม่ใช่การคัดลอกประโยคหรือจำลองข้อความจากหนังสือโดยตรง"
    },
    "สืบสวนแบบเบาะแสยุติธรรม": {
      traits: "วางเบาะแสก่อนเฉลย, ผู้ต้องสงสัยมีแรงจูงใจ, ข้อมูลใหม่เปลี่ยนความหมายของฉากก่อนหน้า, ให้ผู้อ่านย้อนตรวจคำตอบได้",
      note: "เบาะแสสำคัญควรปรากฏก่อนเฉลยและมีคำอธิบายย้อนหลัง"
    },
    "ดราม่าภายในใจ": {
      traits: "แรงขับภายใน, ความขัดแย้งระหว่างสิ่งที่อยากได้กับสิ่งที่กลัว, รายละเอียดเล็กที่มีความหมาย, การเปลี่ยนแปลงผ่านการเลือก",
      note: "เน้นแรงจูงใจและผลของการตัดสินใจ มากกว่าการบอกอารมณ์ตรง ๆ"
    },
    "ตลกร้ายเสียดสีสังคม": {
      traits: "ความย้อนแย้งระหว่างคำพูดกับการกระทำ, สถานการณ์ชวนขำที่เผยความเหลื่อมล้ำ, บทสนทนาคมแต่ไม่อธิบายมุก, ผลลัพธ์ที่ชวนคิด",
      note: "ให้มุกเกิดจากสถานการณ์และผลประโยชน์ ไม่จำเป็นต้องทำให้ทุกตัวละครเป็นคนเลว"
    },
    "แฟนตาซีผจญภัย": {
      traits: "กฎของโลกสอดคล้อง, การตัดสินใจมีราคา, ความสามารถมีข้อจำกัด, เป้าหมายย่อยต่อกันไปสู่ความขัดแย้งหลัก",
      note: "ปูข้อจำกัดของพลังและโลกก่อนให้ใช้แก้ปัญหาสำคัญ"
    }
  };
  const BEATS = [
    { key: "opening", title: "เปิดภาพและคำถาม", moods: ["สงบ", "ลึกลับ"], tension: 2 },
    { key: "desire", title: "ความต้องการปรากฏ", moods: ["อบอุ่น", "ขมขื่น"], tension: 3 },
    { key: "inciting", title: "เหตุที่เปลี่ยนทิศ", moods: ["ลึกลับ", "กดดัน"], tension: 4 },
    { key: "choice", title: "การเลือกที่มีราคา", moods: ["กดดัน", "เศร้า"], tension: 5 },
    { key: "rising", title: "ผลกระทบเริ่มต่อเนื่อง", moods: ["ระทึก", "ตลกร้าย"], tension: 6 },
    { key: "midpoint", title: "ข้อมูลกลับความหมาย", moods: ["เหนือจริง", "ลึกลับ"], tension: 7 },
    { key: "complication", title: "ความขัดแย้งบีบเข้ามา", moods: ["กดดัน", "ขมขื่น"], tension: 7 },
    { key: "lowpoint", title: "ราคาที่ต้องจ่าย", moods: ["เศร้า", "สงบ"], tension: 8 },
    { key: "climax", title: "การตัดสินใจสูงสุด", moods: ["ระทึก", "กดดัน"], tension: 10 },
    { key: "resolution", title: "ผลลัพธ์และภาพสะท้อน", moods: ["หวัง", "ขมขื่น"], tension: 4 }
  ];
  const TRAIT_CLUES = [
    [["ช่างสังเกต","observant","detail-oriented"], "ช่างสังเกต"],
    [["เงียบ","reserved","quiet","introvert"], "เก็บตัว"],
    [["ตลกร้าย","dark humor","sarcastic","ironic"], "อารมณ์ขันแห้ง/ประชด"],
    [["ทะเยอทะยาน","ambitious"], "ทะเยอทะยาน"],
    [["เห็นอกเห็นใจ","empathetic","compassionate"], "เห็นอกเห็นใจ"],
    [["ดื้อ","stubborn","persistent"], "ดื้อ/ไม่ยอมแพ้ง่าย"],
    [["เอาใจคน","people-pleaser"], "เอาใจคนอื่น"],
    [["ใจร้อน","impulsive","hot-headed"], "ใจร้อน"],
    [["รอบคอบ","cautious","careful"], "รอบคอบ"],
    [["ขี้สงสัย","curious","inquisitive"], "ช่างสงสัย"],
    [["สมบูรณ์แบบ","perfectionist"], "ยึดติดความสมบูรณ์แบบ"],
    [["ไม่ไว้ใจ","distrustful","mistrust"], "ระแวดระวัง/ไม่ไว้ใจง่าย"],
    [["มั่นใจ","confident"], "มั่นใจ"],
    [["อ่อนไหว","sensitive"], "อ่อนไหว"],
    [["ชอบควบคุม","controlling"], "ต้องการควบคุมสถานการณ์"],
    [["ซื่อสัตย์","loyal","honest"], "ซื่อสัตย์"]
  ];

  function id(prefix) { return (prefix || "wr") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, Number(n) || 0)); }
  function splitList(value) {
    if (Array.isArray(value)) return value.map(String).map(x => x.trim()).filter(Boolean);
    return String(value || "").split(/[,;\n|•]+/).map(x => x.trim()).filter(Boolean);
  }
  function unique(values) { return Array.from(new Set(values.filter(Boolean))); }
  function todayISO(date) {
    const d = date ? new Date(date) : new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dayDiff(a, b) {
    const start = new Date(a + "T12:00:00"), end = new Date(b + "T12:00:00");
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    return Math.round((end - start) / 86400000);
  }
  function defaultProject() {
    return {
      id: id("project"), title: "นิยายเรื่องใหม่", mode: "standalone", genre: "ลึกลับ", premise: "",
      question: "", themes: "", ending: "จบแบบมีความหมายค้างอยู่", pov: "บุคคลที่หนึ่ง",
      chapterCount: 12, targetWords: 30000, wordsPerChapter: 2500, startDate: todayISO(),
      dueDate: "", writingDays: [1,2,3,4,5], wordsPerPage: 250, selectedCharacterIds: [],
      stylePreset: "", styleTraits: "", moodMix: ["ลึกลับ","ตลกร้าย","เศร้า"], humor: 55, sadness: 65,
      tension: 60, satire: 50, tenderness: 30, outlineNotes: "", chapters: [], schedule: [],
      scheduleApproved: false, updatedAt: new Date().toISOString()
    };
  }
  function defaultState() {
    return { version: 1, characters: [], references: [], projects: [], activeProjectId: "", activeCharacterId: "", view: "characters", blendSelection: [], blendWeights: {}, blendResult: null };
  }
  function normaliseState(value) {
    const base = defaultState();
    if (!value || typeof value !== "object") return base;
    return {
      ...base, ...value,
      characters: Array.isArray(value.characters) ? value.characters : [],
      references: Array.isArray(value.references) ? value.references : [],
      projects: Array.isArray(value.projects) ? value.projects : [],
      blendSelection: Array.isArray(value.blendSelection) ? value.blendSelection : [],
      blendWeights: value.blendWeights && typeof value.blendWeights === "object" ? value.blendWeights : {}
    };
  }
  function buildChapterPlan(project, characters) {
    const count = clamp(project.chapterCount, 1, 100);
    const mode = project.mode || "standalone";
    const names = (characters || []).map(c => c.name).filter(Boolean);
    const lead = characters && characters[0] || {};
    const desire = lead.desire || lead.want || "บางสิ่งที่สำคัญ";
    const fear = lead.fear || "สิ่งที่ไม่อาจควบคุม";
    const secret = lead.secret || "ข้อมูลสำคัญที่ยังไม่เปิดเผย";
    const rival = characters && characters[1] || {};
    const opposition = rival.name || "แรงต้านจากโลกของเรื่อง";
    const selectedMoods = splitList(project.moodMix);
    const result = [];
    for (let i = 0; i < count; i++) {
      const progress = count === 1 ? 0.5 : i / (count - 1);
      let beatIndex;
      if (progress < 0.1) beatIndex = 0;
      else if (progress < 0.2) beatIndex = 1;
      else if (progress < 0.32) beatIndex = 2;
      else if (progress < 0.45) beatIndex = 3;
      else if (progress < 0.58) beatIndex = 5;
      else if (progress < 0.72) beatIndex = 6;
      else if (progress < 0.84) beatIndex = 7;
      else if (progress < 0.94) beatIndex = 8;
      else beatIndex = 9;
      const beat = BEATS[beatIndex];
      const mood = selectedMoods.length ? selectedMoods[i % selectedMoods.length] : beat.moods[i % beat.moods.length];
      const tension = clamp(Math.round(beat.tension + (Number(project.tension) - 50) / 25), 1, 10);
      const isTwist = count >= 4 && [Math.round((count - 1) * 0.28), Math.round((count - 1) * 0.54), Math.round((count - 1) * 0.78)].includes(i);
      let goal = "";
      if (beat.key === "opening") goal = "แนะนำตัวละคร เป้าหมาย และความผิดปกติหนึ่งอย่าง";
      else if (beat.key === "desire") goal = (lead.name || "ตัวเอก") + " แสดงให้เห็นว่าต้องการ" + desire + " ผ่านการกระทำ";
      else if (beat.key === "inciting") goal = "เหตุการณ์หนึ่งทำให้เป้าหมายเดิมไปต่อแบบเดิมไม่ได้";
      else if (beat.key === "choice") goal = "ให้ตัวเอกเลือกทางหนึ่งและมีต้นทุนที่ชัด";
      else if (beat.key === "rising") goal = "ผลจากการเลือกก่อนหน้ากลับมากดดันเรื่อง";
      else if (beat.key === "midpoint") goal = "เปิดข้อมูลที่เปลี่ยนความหมายของสิ่งที่ผู้อ่านเข้าใจ";
      else if (beat.key === "complication") goal = opposition + " หรือสถานการณ์บีบให้ข้อเสียของตัวเอกส่งผล";
      else if (beat.key === "lowpoint") goal = "ตัวเอกต้องเผชิญสิ่งที่กลัว: " + fear;
      else if (beat.key === "climax") goal = "การเลือกครั้งสำคัญพิสูจน์ว่าตัวละครเปลี่ยนไปอย่างไร";
      else goal = mode === "serial" ? "ปิดปมย่อยหนึ่งเรื่องและเปิดคำถามถัดไป" : "ตอบคำถามหลักและแสดงผลระยะยาวของการเลือก";
      const twist = isTwist ? (beat.key === "midpoint" ? "เผยหลักฐานใหม่ที่เปลี่ยนข้อสรุปเดิม" : beat.key === "climax" ? "เฉลยความเชื่อมโยงที่ปูไว้ก่อนหน้า" : "ใส่เบาะแสที่ดูธรรมดาแต่มีความหมายภายหลัง") : "";
      const hook = i === count - 1
        ? (mode === "serial" ? "เปิดคำถามใหม่ให้ติดตามภาคต่อ" : "ปิดเส้นอารมณ์หลักพร้อมภาพหรือประโยคสะท้อนธีม")
        : "ทิ้งการตัดสินใจ คำถาม หรือผลกระทบที่พาไปตอนถัดไป";
      result.push({
        id: id("chapter"), number: i + 1, title: "ตอนที่ " + (i + 1) + " — " + beat.title,
        beat: beat.title, beatKey: beat.key, mood: mood, tension: tension,
        goal: goal, scene: "", conflict: "", clue: isTwist ? secret : "",
        twist: twist, hook: hook, cast: names.slice(0, 3), status: "ยังไม่เริ่ม", note: ""
      });
    }
    return result;
  }
  function evaluatePlan(project, characters) {
    const p = project || {}, chapters = Array.isArray(p.chapters) ? p.chapters : [];
    const fields = [p.title, p.premise, p.question, p.themes, p.ending, p.genre, p.styleTraits].filter(x => String(x || "").trim()).length;
    const headerScore = fields / 7;
    const castScore = Math.min(1, (characters || []).length / 2);
    const chapterScore = chapters.length ? chapters.reduce((sum, c) => {
      const fill = [c.goal, c.scene, c.conflict, c.hook].filter(x => String(x || "").trim()).length / 4;
      const twistCredit = c.twist ? 0.1 : 0;
      return sum + Math.min(1, fill + twistCredit);
    }, 0) / chapters.length : 0;
    const hasEarlyMiddleEnd = chapters.length >= 3 &&
      chapters.some(c => /เปิด|opening|ตั้งต้น/i.test(c.beat || "")) &&
      chapters.some(c => /กลาง|midpoint|ข้อมูล/i.test(c.beat || "")) &&
      chapters.some(c => /คลี่คลาย|resolution|จบ/i.test(c.beat || ""));
    const arcScore = chapters.length ? (hasEarlyMiddleEnd ? 1 : 0.45) : 0;
    const scheduleScore = p.scheduleApproved && p.schedule && p.schedule.length ? 1 : 0;
    const score = Math.round(100 * (headerScore * 0.25 + castScore * 0.15 + chapterScore * 0.38 + arcScore * 0.12 + scheduleScore * 0.10));
    const checklist = [
      {label:"แนวคิด/พล็อตตั้งต้น", done:!!String(p.premise || "").trim()},
      {label:"ตัวละครที่ผูกกับเรื่อง", done:(characters || []).length > 0},
      {label:"แต่ละตอนมีเป้าหมาย", done:chapters.length > 0 && chapters.every(c => String(c.goal || "").trim())},
      {label:"มีแรงขัดแย้งและทางเชื่อม", done:chapters.length > 0 && chapters.every(c => String(c.conflict || c.scene || "").trim())},
      {label:"วางจุดหักมุม/เบาะแส", done:chapters.filter(c => c.twist || c.clue).length >= Math.min(2, chapters.length)},
      {label:"มีบทสรุปตามรูปแบบเรื่อง", done:chapters.length > 0 && /จบ|ปิด|คลี่คลาย|resolution/i.test((chapters[chapters.length-1].beat || "") + " " + (chapters[chapters.length-1].hook || ""))},
      {label:"ยืนยันตารางเขียน", done:!!(p.scheduleApproved && p.schedule && p.schedule.length)}
    ];
    return {score:score, checklist:checklist};
  }
  function buildSchedule(project) {
    const p = project || {};
    if (!p.startDate || !p.dueDate) throw new Error("เลือกวันเริ่มและวันที่ต้องการเสร็จก่อนดูตัวอย่างตาราง");
    const days = dayDiff(p.startDate, p.dueDate);
    if (days < 0) throw new Error("วันที่เสร็จต้องไม่ก่อนวันเริ่ม");
    if (days > 730) throw new Error("กรุณาวางแผนระยะไม่เกิน 2 ปีในหนึ่งตาราง");
    const writingDays = unique((p.writingDays || [1,2,3,4,5]).map(Number)).filter(d => d >= 0 && d <= 6);
    if (!writingDays.length) throw new Error("เลือกวันเขียนอย่างน้อยหนึ่งวันต่อสัปดาห์");
    const totalWords = Math.max(1000, Number(p.targetWords) || Number(p.wordsPerChapter) * Math.max(1, Number(p.chapterCount)) || 30000);
    const chapterCount = Math.max(1, Number(p.chapterCount) || 1);
    const dates = [];
    for (let offset = 0; offset <= days; offset++) {
      const date = new Date(p.startDate + "T12:00:00");
      date.setDate(date.getDate() + offset);
      if (writingDays.includes(date.getDay())) dates.push(todayISO(date));
    }
    if (!dates.length) throw new Error("ไม่มีวันเขียนอยู่ในช่วงวันที่เลือก กรุณาเพิ่มวันเขียนหรือขยายกำหนดส่ง");
    const eachWords = Math.ceil(totalWords / dates.length);
    const schedule = dates.map((date, index) => {
      const chapterIndex = Math.min(chapterCount - 1, Math.floor(index * chapterCount / dates.length));
      const chapter = (p.chapters || [])[chapterIndex];
      return {
        id:id("task"), date:date, targetWords:index === dates.length - 1 ? Math.max(0,totalWords - eachWords * (dates.length - 1)) : eachWords,
        chapterNumber:chapterIndex + 1,
        title:chapter ? chapter.title : "ตอนที่ " + (chapterIndex + 1),
        task:index === dates.length - 1 ? "ทบทวนภาพรวมและปิดงานตามเป้าหมาย" : (index % 5 === 4 ? "ทบทวนความต่อเนื่องและแก้ร่าง" : "เขียนฉากหลัก / เติมเหตุและผล"),
        done:false, actualWords:0, note:""
      };
    });
    return {
      schedule:schedule, totalWords:totalWords, sessionCount:dates.length, wordsPerDay:eachWords,
      calendarDays:days + 1, wordsPerPage:Number(p.wordsPerPage)||250,
      estimatedPages:Math.ceil(totalWords/(Number(p.wordsPerPage)||250)),
      pace:eachWords > 3000 ? "หนักมาก" : eachWords > 1800 ? "ค่อนข้างหนัก" : eachWords > 1000 ? "ปานกลาง" : "เบา",
      exceeds:eachWords > 2500
    };
  }
  function createBlend(characters, weights) {
    const chars = (characters || []).filter(Boolean);
    if (chars.length < 2) throw new Error("เลือกตัวละครอย่างน้อย 2 ตัวก่อนผสม");
    const scored = chars.map(c => ({c:c,w:Math.max(1,Number(weights && weights[c.id]) || 50)}));
    scored.sort((a,b) => b.w-a.w);
    const words = [];
    for (const entry of scored) {
      const traits = unique(splitList(entry.c.traits).concat(splitList(entry.c.personality)));
      for (const trait of traits) words.push({word:trait,weight:entry.w});
    }
    const traitWeight = new Map();
    for (const item of words) traitWeight.set(item.word,(traitWeight.get(item.word)||0)+item.weight);
    const traits = Array.from(traitWeight.entries()).sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,8);
    const dominant = scored[0].c;
    const second = scored[1];
    const desireA = dominant.desire || dominant.want || "สิ่งที่เชื่อว่าตัวเองสมควรได้รับ";
    const desireB = second.c.desire || second.c.want || "สิ่งที่อีกฝ่ายไม่อยากสูญเสีย";
    return {
      id:id("character"),name:"ตัวละครผสม: "+[dominant.name,second.c.name].filter(Boolean).join(" × "),
      sourceName:"",role:dominant.role||"ตัวละครรอง",personality:traits.join(", "),
      traits:traits.join(", "),strengths:unique(scored.flatMap(x=>splitList(x.c.strengths))).slice(0,6).join(", "),
      flaws:unique(scored.flatMap(x=>splitList(x.c.flaws||x.c.flaw))).slice(0,5).join(", "),
      desire:desireA+" แต่ถูกขัดด้วยความต้องการของ"+(second.c.name||"อีกฝ่าย")+" ที่อยาก"+desireB,
      fear:unique(scored.flatMap(x=>splitList(x.c.fear))).join(" / "),
      secret:unique(scored.flatMap(x=>splitList(x.c.secret))).join(" / "),
      backstory:scored.map(x=>(x.c.name||"ตัวละคร")+": "+(x.c.backstory||x.c.wound||"ภูมิหลังยังว่าง")).join("\n"),
      voice:unique(scored.map(x=>x.c.voice||x.c.speech).filter(Boolean)).join(" + "),
      contradiction:"ภายนอกอาจดู "+(traits[0]||"มั่นคง")+" แต่เมื่อต้องเลือกระหว่าง "+desireA+" กับ "+desireB+" จะเผยด้านตรงข้าม",
      relationships:scored.map(x=>x.c.name).filter(Boolean).join(" / "),
      sourceUrls:unique(scored.flatMap(x=>splitList(x.c.sourceUrls || x.c.sourceUrl))),
      notes:"ได้จากการผสมน้ำหนัก "+scored.map(x=>(x.c.name||"ตัวละคร")+" "+x.w+"%").join(", ")+". เป็นตัวละครสมมติที่ต้องตรวจและแก้ก่อนใช้จริง"
    };
  }
  function analyzeReferenceText(text) {
    const raw=String(text||"").replace(/\r\n?/g,"\n");
    const traits=[];
    for(const pair of TRAIT_CLUES) if(pair[0].some(word=>raw.toLocaleLowerCase().includes(word.toLocaleLowerCase()))) traits.push(pair[1]);
    const paragraphs=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean);
    const sentences=raw.split(/[.!?…！？。]+|\n+/).map(x=>x.trim()).filter(x=>x.length>=5);
    const chars=Array.from(raw).filter(ch=>!/\s/u.test(ch)).length||1;
    const dialogueMatches=raw.match(/["“][^"”]{1,500}["”]|「[^」]{1,500}」|『[^』]{1,500}』/gu)||[];
    const dialogueChars=dialogueMatches.reduce((n,x)=>n+Array.from(x).filter(ch=>!/\s/u.test(ch)).length,0);
    const firstPerson=(raw.match(/(?:ฉัน|ผม|ดิฉัน|เรา|I |my |me )/gi)||[]).length;
    const questions=(raw.match(/[?？]/g)||[]).length;
    const exclamations=(raw.match(/[!！]/g)||[]).length;
    const averageParagraphLength=paragraphs.length?Math.round(paragraphs.reduce((n,x)=>n+Array.from(x).length,0)/paragraphs.length):0;
    const averageSentenceLength=sentences.length?Math.round(sentences.reduce((n,x)=>n+Array.from(x).length,0)/sentences.length):0;
    const dialogueRatio=dialogueChars/chars;
    const suggestions=[];
    if(firstPerson>=2)suggestions.push("เสียงเล่าแบบบุรุษที่หนึ่งเด่น");
    if(averageSentenceLength>0&&averageSentenceLength<45)suggestions.push("ประโยคค่อนข้างสั้นและคม");
    else if(averageSentenceLength>=100)suggestions.push("ประโยคยาวและพรรณนาต่อเนื่อง");
    if(averageParagraphLength>170)suggestions.push("ย่อหน้าพรรณนายาว");
    else if(averageParagraphLength>0&&averageParagraphLength<70)suggestions.push("ย่อหน้าสั้นและเว้นจังหวะบ่อย");
    if(dialogueRatio>=0.25)suggestions.push("บทสนทนามีน้ำหนัก");
    if(sentences.length&&questions/sentences.length>=0.12)suggestions.push("ใช้คำถามผลักความคิดหรือจังหวะเรื่อง");
    if(sentences.length&&exclamations/sentences.length>=0.08)suggestions.push("ใช้เครื่องหมายอุทานเพื่อเร่งอารมณ์");
    const lower=raw.toLocaleLowerCase();
    if(["ประชด","เสียดสี","irony","sarcastic","hypocrisy"].some(x=>lower.includes(x)))suggestions.push("มีสัญญาณเชิงคำของการประชด/เสียดสี");
    if(["เหงา","ว่างเปล่า","โดดเดี่ยว","สูญเสีย","lonely","alienation","emptiness"].some(x=>lower.includes(x)))suggestions.push("มีคำที่สื่อความโดดเดี่ยวหรือการสูญเสีย");
    let repeated=[];
    try{
      if(typeof Intl!=="undefined"&&Intl.Segmenter){
        const tokens=[...new Intl.Segmenter("th",{granularity:"word"}).segment(raw)].filter(x=>x.isWordLike).map(x=>x.segment).filter(x=>Array.from(x).length>=2);
        const counts=new Map();for(const token of tokens)counts.set(token,(counts.get(token)||0)+1);
        repeated=[...counts.entries()].filter(x=>x[1]>=3).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>({word:x[0],count:x[1]}));
      }
    }catch(_){}
    return {
      traits:unique(traits),suggestedStyleTraits:unique(suggestions),
      summary:raw.trim().slice(0,1200),
      signals:{
        characters:chars,paragraphCount:paragraphs.length,sentenceCount:sentences.length,
        averageParagraphLength:averageParagraphLength,averageSentenceLength:averageSentenceLength,
        firstPerson:firstPerson,questions:questions,exclamations:exclamations,
        dialogueRatio:Math.round(dialogueRatio*100),repeatedWords:repeated
      }
    };
  }
  const UTILS={buildChapterPlan:buildChapterPlan,evaluatePlan:evaluatePlan,buildSchedule:buildSchedule,createBlend:createBlend,analyzeReferenceText:analyzeReferenceText,normalizeDate:todayISO};
  if (typeof module === "object" && module.exports) module.exports=UTILS;
  if (typeof document === "undefined") return;
  const $=id=>document.getElementById(id);
  const root=$("writer-room-root");
  if(!root)return;

  function h(tag,cls,text,...children){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined&&text!==null){
      if(text&&typeof text==="object"&&text.nodeType)node.append(text);
      else node.textContent=String(text);
    }
    for(const child of children.flat())if(child!==undefined&&child!==null){
      if(child&&typeof child==="object"&&child.nodeType)node.append(child);
      else node.append(document.createTextNode(String(child)));
    }
    return node;
  }
  function add(parent,...nodes){for(const node of nodes.flat())if(node)parent.append(node);return parent;}
  function btn(text,fn,cls){
    const b=h("button","wr-btn "+(cls||""),text);
    b.type="button";b.addEventListener("click",fn);return b;
  }
  function link(url,text){
    const a=h("a","wr-link",text||url);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a;
  }
  function card(title,subtitle){
    const c=h("section","wr-card");
    if(title)add(c,h("h3","wr-card-title",title));
    if(subtitle)add(c,h("p","wr-muted",subtitle));
    return c;
  }
  function field(label,value,onChange,opts){
    opts=opts||{};
    const wrap=h("div","wr-field");
    const lab=h("label","",label);
    const node=document.createElement(opts.multiline?"textarea":opts.select?"select":"input");
    node.id=opts.id||id("field");
    lab.htmlFor=node.id;
    if(opts.multiline){node.rows=opts.rows||3;node.value=value||"";node.placeholder=opts.placeholder||"";}
    else if(opts.select){
      for(const option of opts.options||[]){
        const item=h("option","",option.label===undefined?option.value:option.label);
        item.value=option.value;item.selected=String(option.value)===String(value||"");
        node.append(item);
      }
    }else{
      node.type=opts.type||"text";node.value=value===undefined||value===null?"":value;
      if(opts.min!==undefined)node.min=opts.min;
      if(opts.max!==undefined)node.max=opts.max;
      if(opts.step!==undefined)node.step=opts.step;
      if(opts.placeholder)node.placeholder=opts.placeholder;
    }
    if(opts.required)node.required=true;
    node.addEventListener(opts.select?"change":"input",()=>onChange(opts.type==="number"?Number(node.value):node.value,node));
    if(opts.help)add(wrap,h("small","wr-help",opts.help));
    add(wrap,lab,node);
    return {wrap:wrap,node:node};
  }
  function textareaField(label,value,onChange,placeholder,rows){
    return field(label,value,onChange,{multiline:true,placeholder:placeholder||"",rows:rows||3});
  }
  function badge(text,kind){return h("span","wr-badge "+(kind||""),text);}
  function empty(text){return h("div","wr-empty",text);}
  function readJson(key,fallback){
    try{const value=JSON.parse(localStorage.getItem(key)||"null");return value===null?fallback:value;}
    catch(_){return fallback;}
  }
  let state=normaliseState(readJson(STORE_KEY,defaultState()));
  let calendarMonth=todayISO().slice(0,7);
  let activeView=state.view||"characters";
  let statusMessage="";
  let pendingSchedule=null;
  function save(){
    try{localStorage.setItem(STORE_KEY,JSON.stringify(state));}
    catch(_){statusMessage="พื้นที่จัดเก็บเบราว์เซอร์อาจเต็ม โปรดส่งออกโปรเจกต์/คลังแล้วลบรายการที่ไม่ใช้";}
  }
  function status(parent,text,kind){
    const s=h("div","wr-status "+(kind||""),text);parent.append(s);return s;
  }
  function allProjects(){return state.projects;}
  function project(){
    let p=state.projects.find(x=>x.id===state.activeProjectId);
    if(!p&&state.projects.length){p=state.projects[0];state.activeProjectId=p.id;}
    if(!p){p=defaultProject();state.projects.push(p);state.activeProjectId=p.id;save();}
    return p;
  }
  function getCharacter(charId){return state.characters.find(c=>c.id===charId);}
  function getProjectCharacters(p){return (p.selectedCharacterIds||[]).map(getCharacter).filter(Boolean);}
  function characterFromStudio(c){
    return {
      id:id("character"),name:String(c.name||c.nick||"ตัวละครใหม่"),sourceName:"",
      role:String(c.role||"ตัวละครรอง"),age:String(c.age||""),job:String(c.job||""),
      personality:splitList(c.traits).join(", "),traits:splitList(c.traits).join(", "),
      strengths:String(c.skill||""),flaws:String(c.flaw||""),desire:String(c.want||""),
      fear:String(c.fear||""),secret:String(c.secret||""),backstory:String(c.wound||c.family||""),
      voice:String(c.speech||""),contradiction:"",relationships:"",notes:String(c.note||""),
      sourceUrls:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
    };
  }
  function ensureStudioCharacters(){
    const old=readJson(STUDIO_KEY,null);
    if(!old||!Array.isArray(old.chars)||!old.chars.length)return {added:0,found:false};
    const names=new Set(state.characters.map(c=>String(c.name||"").toLocaleLowerCase()));
    let added=0;
    for(const c of old.chars){
      if(!c||!String(c.name||"").trim())continue;
      if(names.has(String(c.name).toLocaleLowerCase()))continue;
      state.characters.push(characterFromStudio(c));names.add(String(c.name).toLocaleLowerCase());added++;
    }
    save();return {added:added,found:true};
  }
  function navHeader(){
    const head=h("header","wr-hero");
    const intro=h("div","wr-hero-copy");
    add(intro,h("span","wr-kicker","NOVELLENS · WRITER'S ROOM"),
      h("h2","wr-hero-title","จากไอเดียกระจัดกระจาย สู่เรื่องที่มีโครง"),
      h("p","wr-muted","คลังตัวละคร แหล่งอ้างอิง พล็อตรายตอน กราฟอารมณ์ และตารางเขียนที่คุณตรวจอนุมัติก่อน"));
    const summary=h("div","wr-hero-summary");
    const characters=state.characters.length, projects=state.projects.length;
    add(summary,h("div","wr-kpi",String(characters)),h("span","wr-muted","ตัวละครที่เก็บ"),
      h("div","wr-kpi",String(projects)),h("span","wr-muted","โปรเจกต์"));
    add(head,intro,summary);return head;
  }
  function navTabs(){
    const nav=h("div","wr-tabs");
    const items=[
      ["characters","คลังตัวละคร","◈"],["blend","ผสมตัวละคร","✳"],["references","โต๊ะอ้างอิง","⌕"],
      ["planner","Story Planner","▤"],["calendar","ปฏิทินเขียน","▦"]
    ];
    for(const [value,label,symbol] of items){
      const b=btn(symbol+"  "+label,()=>{activeView=value;state.view=value;save();render();},"wr-tab"+(activeView===value?" active":""));
      b.setAttribute("aria-pressed",String(activeView===value));nav.append(b);
    }
    return nav;
  }
  function render(){
    save();
    root.replaceChildren();
    add(root,navHeader(),navTabs());
    const area=h("div","wr-view");
    root.append(area);
    if(activeView==="characters")renderCharacters(area);
    else if(activeView==="blend")renderBlend(area);
    else if(activeView==="references")renderReferences(area);
    else if(activeView==="calendar")renderCalendar(area);
    else renderPlanner(area);
    if(statusMessage){const s=status(area,statusMessage,"warn");setTimeout(()=>{if(s.isConnected)s.remove();},5500);statusMessage="";}
  }

  function renderCharacters(area){
    const layout=h("div","wr-two-col wr-character-layout");
    const left=card("คลังตัวละคร","บันทึกตัวละครที่เขียนเองหรือตัวละครสมมติที่พัฒนาจากแหล่งอ้างอิง");
    const tools=h("div","wr-inline");
    add(tools,btn("+ สร้างตัวละคร",()=>{
      const c={id:id("character"),name:"ตัวละครใหม่",role:"ตัวเอก",traits:"",personality:"",strengths:"",flaws:"",desire:"",fear:"",secret:"",backstory:"",voice:"",contradiction:"",relationships:"",sourceUrls:[],notes:"",createdAt:new Date().toISOString()};
      state.characters.unshift(c);state.activeCharacterId=c.id;save();render();
    }),btn("นำเข้าจากตัวสร้างเดิม",()=>{
      const result=ensureStudioCharacters();
      statusMessage=result.found?"นำเข้า/ตรวจเทียบเสร็จ เพิ่มตัวละครใหม่ "+result.added+" ตัว": "ยังไม่พบข้อมูลตัวละครเดิมในเครื่องนี้";
      render();
    },"secondary"),btn("ส่งออกคลัง",exportCharacters,"secondary"));
    const importInput=h("input");
    importInput.type="file";importInput.accept=".json,application/json";importInput.hidden=true;
    importInput.addEventListener("change",async()=>{
      const file=importInput.files&&importInput.files[0];importInput.value="";
      if(!file)return;
      if(file.size>5*1024*1024){statusMessage="ไฟล์คลังตัวละครใหญ่กว่า 5 MB";render();return;}
      try{
        const payload=JSON.parse(await file.text());
        const incoming=Array.isArray(payload)?payload:(payload&&Array.isArray(payload.characters)?payload.characters:null);
        if(!incoming)throw new Error("ไม่พบรายการ characters ในไฟล์นี้");
        const known=new Set(state.characters.map(c=>String(c.name||"").trim().toLocaleLowerCase()).filter(Boolean));
        let imported=0,skipped=0;
        for(const raw of incoming.slice(0,500)){
          if(!raw||typeof raw!=="object"){skipped++;continue;}
          const name=String(raw.name||"").trim();
          if(!name||known.has(name.toLocaleLowerCase())){skipped++;continue;}
          const cleanText=value=>typeof value==="string"?value.slice(0,20000):Array.isArray(value)?value.map(String).slice(0,100):"";
          state.characters.unshift({
            id:id("character"),name:name.slice(0,180),sourceName:String(raw.sourceName||"").slice(0,180),
            role:String(raw.role||"ตัวละครรอง").slice(0,80),age:String(raw.age||"").slice(0,40),job:String(raw.job||"").slice(0,180),
            personality:cleanText(raw.personality),traits:cleanText(raw.traits),strengths:cleanText(raw.strengths),
            flaws:cleanText(raw.flaws||raw.flaw),desire:cleanText(raw.desire||raw.want),fear:cleanText(raw.fear),
            secret:cleanText(raw.secret),backstory:cleanText(raw.backstory||raw.wound),voice:cleanText(raw.voice||raw.speech),
            contradiction:cleanText(raw.contradiction),relationships:cleanText(raw.relationships),
            sourceUrls:Array.isArray(raw.sourceUrls)?raw.sourceUrls.map(String).filter(x=>/^https?:\/\//i.test(x)).slice(0,50):[],
            notes:cleanText(raw.notes||raw.note),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
          });
          known.add(name.toLocaleLowerCase());imported++;
        }
        save();statusMessage="นำเข้าตัวละคร "+imported+" ตัว · ข้าม "+skipped+" รายการที่ซ้ำหรือข้อมูลไม่ครบ";render();
      }catch(error){statusMessage="นำเข้าคลังตัวละครไม่สำเร็จ: "+String(error&&error.message||error);render();}
    });
    add(tools,btn("นำเข้าคลัง JSON",()=>importInput.click(),"secondary"),importInput);
    left.append(tools);
    const filter=field("ค้นหาตัวละคร","",value=>{
      const list=left.querySelector(".wr-character-list");
      if(list)Array.from(list.children).forEach(node=>node.hidden=!node.dataset.search.includes(value.toLocaleLowerCase()));
    },{placeholder:"ชื่อ นิสัย บทบาท หรือแท็ก"});
    left.append(filter.wrap);
    const list=h("div","wr-character-list");
    if(!state.characters.length)list.append(empty("ยังไม่มีตัวละคร ลองสร้างใหม่ หรือนำเข้าจากตัวสร้างตัวละครเดิม"));
    for(const c of state.characters){
      const search=[c.name,c.role,c.personality,c.traits,c.desire,c.notes].join(" ").toLocaleLowerCase();
      const item=btn("",()=>{state.activeCharacterId=c.id;save();render();},"wr-character-card"+(state.activeCharacterId===c.id?" active":""));
      item.dataset.search=search;
      const name=h("strong","",c.name||"ตัวละครไม่มีชื่อ");
      const role=h("span","wr-muted",c.role||"บทบาทยังไม่ระบุ");
      const traits=h("p","",splitList(c.traits||c.personality).slice(0,4).join(" · ")||"เพิ่มนิสัยเพื่อให้ผสม/วางพล็อตได้แม่นขึ้น");
      add(item,name,role,traits);list.append(item);
    }
    left.append(list);
    const right=card("แฟ้มตัวละคร","กรอกได้เท่าที่รู้ ทุกช่องแก้ไขและบันทึกในเบราว์เซอร์นี้");
    const c=getCharacter(state.activeCharacterId)||state.characters[0];
    if(!c)right.append(empty("สร้างหรือนำเข้าตัวละครก่อนเพื่อเปิดแฟ้ม"));
    else{
      state.activeCharacterId=c.id;
      const grid=h("div","wr-form-grid");
      const specs=[
        ["name","ชื่อที่ใช้ในนิยาย"],["sourceName","ชื่อบุคคล/ตัวละครต้นแบบ"],["role","บทบาท"],["age","อายุในเรื่อง"],
        ["job","อาชีพ/หน้าที่"],["personality","ภาพรวมบุคลิก"],["traits","นิสัยหลัก (คั่นด้วยจุลภาค)"],
        ["strengths","จุดแข็ง"],["flaws","ข้อเสีย/จุดบอด"],["desire","สิ่งที่ต้องการ"],["fear","สิ่งที่กลัว"],
        ["secret","ความลับ/ข้อมูลที่ซ่อน"],["backstory","ภูมิหลังและบาดแผล"],["voice","วิธีพูด/จังหวะภาษา"],
        ["contradiction","ความย้อนแย้งภายใน"],["relationships","ความสัมพันธ์กับตัวละครอื่น"],["sourceUrls","URL อ้างอิง (หลายลิงก์ คั่นบรรทัด)"],
        ["notes","บันทึกเพิ่มเติม"]
      ];
      for(const [key,label] of specs){
        const multi=["personality","traits","strengths","flaws","desire","fear","secret","backstory","voice","contradiction","relationships","sourceUrls","notes"].includes(key);
        const f=field(label,Array.isArray(c[key])?c[key].join("\n"):c[key]||"",value=>{
          c[key]=key==="sourceUrls"?value.split(/\n+/).map(x=>x.trim()).filter(Boolean):value;
          c.updatedAt=new Date().toISOString();save();
        },{multiline:multi,rows:multi?2:1,placeholder:key==="sourceName"?"เช่น นักแสดง/นักเขียน/ตัวละครจากผลงานที่ใช้เป็นแรงบันดาลใจ":""});
        if(key==="name"||key==="personality"||key==="desire"||key==="backstory"||key==="notes")f.wrap.classList.add("wr-span-2");
        grid.append(f.wrap);
      }
      right.append(grid);
      const actions=h("div","wr-inline wr-action-row");
      add(actions,btn("บันทึกตัวละคร",()=>{c.updatedAt=new Date().toISOString();save();statusMessage="บันทึกตัวละครแล้ว";render();}),
        btn("นำไปใช้ใน Story Planner",()=>{
          const p=project();if(!p.selectedCharacterIds.includes(c.id))p.selectedCharacterIds.push(c.id);
          activeView="planner";state.view="planner";save();render();
        },"secondary"),
        btn("ลบตัวละคร",()=>{
          if(!confirm("ลบแฟ้มตัวละครนี้หรือไม่? โปรเจกต์ที่เคยเลือกจะยังเก็บข้อมูลอ้างอิง id ไว้จนกว่าคุณจะแก้รายชื่อ"))return;
          state.characters=state.characters.filter(x=>x.id!==c.id);state.activeCharacterId=state.characters[0]?.id||"";save();render();
        },"danger"));
      right.append(actions);
      if(c.sourceName)add(right,status(right,"มีต้นแบบอ้างอิง: "+c.sourceName+" · แนะนำให้เปลี่ยนชื่อและปรับรายละเอียดให้เป็นตัวละครใหม่", "info"));
    }
    add(layout,left,right);area.append(layout);
    const footer=card("เวิร์กโฟลว์ที่แนะนำ","จากข้อมูลตัวละครหนึ่งตัว ไปสู่ตัวละครและเรื่องที่ใช้งานได้จริง");
    add(footer,h("p","wr-muted","สร้างต้นแบบ → เติมแรงปรารถนา/ความกลัว/ข้อเสีย → ทดลองผสมใน “ผสมตัวละคร” → เลือกตัวที่เหมาะกับโปรเจกต์ → วางบทบาทในแต่ละตอน"));
    area.append(footer);
  }

  function exportCharacters(){
    const payload={format:"NovelLens Character Vault",version:1,exportedAt:new Date().toISOString(),characters:state.characters};
    download("novellens-character-vault.json",JSON.stringify(payload,null,2),"application/json");
  }
  function download(filename,text,mime){
    const blob=new Blob([text],{type:mime||"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  function renderBlend(area){
    const left=card("เลือกตัวละครมาตั้งแต่ 2 ตัว","ระบบจะผสมตามข้อมูลและน้ำหนักที่กำหนด ไม่ใช่สุ่มบุคลิกทั้งหมดใหม่");
    if(state.characters.length<2)left.append(empty("ต้องมีตัวละครอย่างน้อย 2 ตัวในคลังก่อนจึงจะผสมได้"));
    const chosen=new Set(state.blendSelection||[]);
    const selectBox=h("div","wr-blend-picks");
    for(const c of state.characters){
      const label=h("label","wr-check-row");
      const cb=h("input");cb.type="checkbox";cb.checked=chosen.has(c.id);
      cb.addEventListener("change",()=>{
        const next=new Set(state.blendSelection||[]);
        if(cb.checked){if(next.size>=4){cb.checked=false;statusMessage="เลือกผสมได้ไม่เกิน 4 ตัวในหนึ่งครั้ง";return;}next.add(c.id);}
        else next.delete(c.id);
        state.blendSelection=Array.from(next);save();render();
      });
      add(label,cb,h("span","",c.name||"ไม่มีชื่อ"),h("small","wr-muted",c.role||"บทบาทยังไม่ระบุ"));selectBox.append(label);
      if(chosen.has(c.id)){
        const weight=state.blendWeights[c.id]===undefined?50:state.blendWeights[c.id];
        const wf=field("อิทธิพลของ "+(c.name||"ตัวละคร"),weight,value=>{state.blendWeights[c.id]=clamp(value,0,100);save();const out=$("wr-weight-"+c.id);if(out)out.textContent=value+"%";},{type:"range",min:0,max:100,step:5});
        wf.wrap.classList.add("wr-weight");
        const count=h("strong","wr-weight-value",weight+"%");count.id="wr-weight-"+c.id;wf.wrap.append(count);selectBox.append(wf.wrap);
      }
    }
    left.append(selectBox,btn("ผสมเป็นตัวละครใหม่",()=>{
      const chars=state.blendSelection.map(getCharacter).filter(Boolean);
      try{
        state.blendResult=UTILS.createBlend(chars,state.blendWeights);save();render();
      }catch(e){statusMessage=e.message;render();}
    }));
    area.append(left);
    const result=state.blendResult;
    if(result){
      const right=card("ตัวละครผสม · แก้ไขได้ก่อนบันทึก","แนวคิดและฉากตั้งต้นจะช่วยให้เห็นว่าแรงปรารถนาของทั้งสองฝ่ายส่งเสริม/ขัดกันอย่างไร");
      const form=h("div","wr-form-grid");
      const specs=[["name","ชื่อใหม่"],["role","บทบาท"],["personality","บุคลิกผสม"],["traits","นิสัย"],["strengths","จุดแข็ง"],["flaws","ข้อเสีย"],["desire","แรงปรารถนาและแรงปะทะ"],["fear","ความกลัว"],["secret","ความลับ"],["backstory","ภูมิหลังผสม"],["voice","วิธีพูด"],["contradiction","ความย้อนแย้ง"],["relationships","ความสัมพันธ์"],["notes","บันทึก"]];
      for(const [key,label] of specs){
        const multi=["personality","traits","strengths","flaws","desire","fear","secret","backstory","voice","contradiction","relationships","notes"].includes(key);
        const f=field(label,result[key]||"",value=>{result[key]=value;save();},{multiline:multi,rows:multi?2:1});
        if(["name","personality","desire","backstory","notes"].includes(key))f.wrap.classList.add("wr-span-2");
        form.append(f.wrap);
      }
      right.append(form);
      const premise=h("div","wr-combo-premise");
      const names=state.blendSelection.map(getCharacter).filter(Boolean).map(c=>c.name);
      const desireA=result.desire||"ความต้องการที่ขัดกัน";
      const seed="เมื่อ "+names.join(" และ ")+" มีสิ่งที่ต้องการไม่ตรงกัน ("+desireA+") พวกเขาต้องเลือกว่าจะรักษาความเชื่อเดิม หรือเปลี่ยนความสัมพันธ์ด้วยการเปิดเผยความจริงบางอย่าง";
      add(premise,h("span","wr-kicker","SEED STORY"),h("p","",seed),
        h("p","wr-muted","ลองให้ตัวละครทั้งสองต้องร่วมมือกันในสิ่งที่ฝ่ายหนึ่งถนัด แต่อีกฝ่ายกลัว แล้วกำหนดราคาที่ต้องเสียหากเลือกผิด"));
      right.append(premise,btn("บันทึกเข้าคลังตัวละคร",()=>{
        const saved={...result,id:id("character"),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),sourceUrls:result.sourceUrls||[]};
        state.characters.unshift(saved);state.activeCharacterId=saved.id;state.blendResult=null;state.blendSelection=[];activeView="characters";state.view=activeView;save();render();
      }),btn("ล้างผลผสม",()=>{state.blendResult=null;save();render();},"secondary"));
      area.append(right);
    }else{
      const help=card("สิ่งที่เครื่องมือผสมจะทำ");
      add(help,h("p","wr-muted","ให้น้ำหนักกับนิสัยและแรงขับของตัวละครที่เลือก รวมแรงปรารถนา ความกลัว ความลับ และประวัติให้กลายเป็นตัวละครใหม่ พร้อมไอเดียความขัดแย้งตั้งต้น คุณสามารถแก้ทุกช่องก่อนบันทึก"));
      area.append(help);
    }
  }

  function renderReferences(area){
    const searchCard=card("ค้นคว้าบุคคลสาธารณะ / ตัวละครต้นแบบ","ค้นสรุปจาก Wikipedia ไทยและอังกฤษ แล้วเปิดแหล่งต้นทางตรวจสอบก่อนนำข้อมูลมาสร้างตัวละคร · หลีกเลี่ยงข้อมูลส่วนตัว/อ่อนไหวของบุคคลทั่วไป");
    const query=field("ชื่อที่ต้องการค้น","",()=>{}, {placeholder:"ชื่อบุคคลสาธารณะ / นักเขียน / นักแสดง / ตัวละครสมมติ"});
    query.node.id="wr-ref-query";
    const results=h("div","wr-ref-results");
    const searchStatus=h("p","wr-muted","การค้นอัตโนมัติใช้แหล่งที่อนุญาตให้เรียกจากเบราว์เซอร์เท่านั้น ไม่สามารถรวบรวมทุกเว็บโดยอัตโนมัติ");
    const searchBtn=btn("ค้น Wikipedia ไทย + อังกฤษ",async()=>{
      const name=query.node.value.trim();
      if(!name){searchStatus.textContent="ใส่ชื่อก่อนค้น";return;}
      searchBtn.disabled=true;searchBtn.textContent="กำลังค้น…";results.replaceChildren();searchStatus.textContent="กำลังอ่านสรุปจากแหล่งสาธารณะ…";
      const langs=["th","en"];
      const settled=await Promise.allSettled(langs.map(async lang=>{
        const url="https://"+lang+".wikipedia.org/w/api.php?action=query&generator=search&gsrsearch="+encodeURIComponent(name)+"&gsrnamespace=0&gsrlimit=5&prop=extracts%7Cinfo&inprop=url&exintro=1&explaintext=1&format=json&origin=*";
        const response=await fetch(url,{method:"GET",credentials:"omit"});
        if(!response.ok)throw new Error("HTTP "+response.status);
        const data=await response.json();
        return Object.values(data.query&&data.query.pages||{}).map(page=>({title:page.title,url:page.fullurl||("https://"+lang+".wikipedia.org/wiki/"+encodeURIComponent(page.title.replace(/ /g,"_"))),extract:String(page.extract||"").slice(0,2500),lang:lang,source:"Wikipedia "+lang}));
      }));
      const pages=settled.flatMap(x=>x.status==="fulfilled"?x.value:[]);
      searchBtn.disabled=false;searchBtn.textContent="ค้น Wikipedia ไทย + อังกฤษ";
      if(!pages.length){searchStatus.textContent="แหล่งข้อมูลอัตโนมัติไม่ตอบกลับในขณะนี้ ลองเปิดค้นหาภายนอกหรือเพิ่มลิงก์ด้วยตัวเอง";return;}
      searchStatus.textContent="พบ "+pages.length+" หน้าสรุป · ตรวจทุกแหล่งก่อนนำข้อมูลไปใช้";
      for(const page of pages){
        const item=card(page.title,page.source);
        add(item,h("p","wr-ref-extract",page.extract||"หน้านี้ไม่มีสรุปเปิดเผย"));
        const actions=h("div","wr-inline");
        add(actions,link(page.url,"อ่านแหล่งต้นทาง"),btn("เก็บเป็นแหล่งอ้างอิง",()=>{
          const ref={id:id("reference"),title:page.title,url:page.url,source:page.source,excerpt:page.extract,notes:"",createdAt:new Date().toISOString()};
          state.references.unshift(ref);save();statusMessage="เก็บแหล่งอ้างอิงแล้ว: "+page.title;render();
        }),btn("สร้างแฟ้มตัวละครจากสรุป",()=>{
          const analysis=UTILS.analyzeReferenceText(page.extract);
          const character={id:id("character"),name:"",sourceName:page.title,role:"ตัวละครต้นแบบ",personality:analysis.traits.join(", "),traits:analysis.traits.join(", "),
            strengths:"",flaws:"",desire:"",fear:"",secret:"",backstory:page.extract,voice:"",
            contradiction:"",relationships:"",sourceUrls:[page.url],notes:"สรุปอ้างอิงจาก "+page.source+" เมื่อ "+new Date().toLocaleDateString()+" · แนะนำให้ตั้งชื่อใหม่และปรับข้อมูลให้เป็นตัวละครสมมติ"};
          state.characters.unshift(character);state.activeCharacterId=character.id;activeView="characters";state.view=activeView;save();render();
        },"secondary"));
        item.append(actions);results.append(item);
      }
    });
    const external=h("div","wr-inline");
    const externalSearch=(label,makeUrl)=>btn(label,()=>{
      const name=query.node.value.trim();if(!name){searchStatus.textContent="ใส่ชื่อก่อนเปิดการค้นหา";return;}
      window.open(makeUrl(encodeURIComponent(name)),"_blank","noopener,noreferrer");
    },"secondary");
    add(external,externalSearch("ค้นเว็บทั่วไป",q=>"https://www.google.com/search?q="+q),
      externalSearch("ค้นข่าว/บทสัมภาษณ์",q=>"https://www.google.com/search?tbm=nws&q="+q),
      externalSearch("ค้น Wikidata",q=>"https://www.wikidata.org/w/index.php?search="+q));
    searchCard.append(query.wrap,searchBtn,external,searchStatus,results);
    area.append(searchCard);

    const sourceCard=card("เพิ่มหลายแหล่งพร้อมกัน","วาง URL หลายบรรทัดได้จากทุกเว็บไซต์ ระบบจะบันทึกลิงก์ให้ ส่วนเว็บที่ไม่เปิด CORS ต้องคัดข้อความสำคัญที่คุณมีสิทธิ์ใช้มาใส่เอง");
    const urls=textareaField("URL อ้างอิง (หนึ่งลิงก์ต่อบรรทัด)","","","https://example.com/biography\nhttps://example.com/interview",4);
    const manualTitle=field("ชื่อชุดแหล่งอ้างอิง","",()=>{},{placeholder:"เช่น บุคลิกและบทสัมภาษณ์"});
    const excerpt=textareaField("ข้อความสรุป/บันทึกจากแหล่งที่คุณตรวจแล้ว","","","จดประเด็นที่เห็นซ้ำหลายแหล่ง รวมทั้งข้อขัดแย้งที่ควรตรวจเพิ่ม",4);
    sourceCard.append(urls.wrap,manualTitle.wrap,excerpt.wrap,btn("บันทึกแหล่งอ้างอิงทั้งหมด",()=>{
      const linkLines=urls.node.value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
      let added=0,skipped=0;
      for(const raw of linkLines){
        try{
          const u=new URL(raw);
          if(!["https:","http:"].includes(u.protocol)){skipped++;continue;}
          state.references.unshift({id:id("reference"),title:manualTitle.node.value.trim()||u.hostname,url:u.href,source:u.hostname,excerpt:excerpt.node.value.trim(),notes:"",createdAt:new Date().toISOString()});added++;
        }catch(_){skipped++;}
      }
      save();statusMessage="บันทึก "+added+" แหล่ง · ข้าม "+skipped+" URL ที่ไม่ถูกต้อง";render();
    }));
    area.append(sourceCard);

    const saved=card("แหล่งอ้างอิงที่บันทึกไว้",String(state.references.length)+" รายการ · ลิงก์และบันทึกเก็บในเบราว์เซอร์");
    if(!state.references.length)saved.append(empty("ยังไม่มีแหล่งอ้างอิง กดเก็บจากผลค้นหรือวาง URL หลายบรรทัด"));
    for(const ref of state.references){
      const rcard=h("article","wr-reference-card");
      add(rcard,h("strong","",ref.title||ref.url),h("small","wr-muted",ref.source||new URL(ref.url).hostname),link(ref.url,"เปิดแหล่งอ้างอิง"));
      const f=textareaField("สรุป/บันทึกของแหล่งนี้",ref.excerpt||"",value=>{ref.excerpt=value;save();},"สรุปเฉพาะข้อมูลที่ตรวจแหล่งแล้ว",3);
      rcard.append(f.wrap);
      const n=field("บันทึกเพิ่มเติม",ref.notes||"",value=>{ref.notes=value;save();},{placeholder:"ข้อสังเกต / ความน่าเชื่อถือ / จุดที่ควรเทียบกับแหล่งอื่น"});
      rcard.append(n.wrap);
      add(rcard,btn("สร้าง/อัปเดตตัวละครจากข้อมูลนี้",()=>{
        const name=ref.title||"ตัวละครต้นแบบ";
        const analysis=UTILS.analyzeReferenceText((ref.excerpt||"")+" "+(ref.notes||""));
        const character={id:id("character"),name:"",sourceName:name,role:"ตัวละครต้นแบบ",
          personality:analysis.traits.join(", "),traits:analysis.traits.join(", "),strengths:"",flaws:"",desire:"",fear:"",secret:"",
          backstory:ref.excerpt||"",voice:"",contradiction:"",relationships:"",sourceUrls:[ref.url],
          notes:"อ้างอิงจากแหล่งที่ผู้ใช้เก็บไว้ · ตั้งชื่อใหม่และแยกข้อเท็จจริงออกจากการตีความก่อนใช้"};
        state.characters.unshift(character);state.activeCharacterId=character.id;activeView="characters";state.view=activeView;save();render();
      }),btn("ลบแหล่งนี้",()=>{
        if(!confirm("ลบแหล่งอ้างอิงนี้หรือไม่?"))return;
        state.references=state.references.filter(x=>x.id!==ref.id);save();render();
      },"danger"));
      saved.append(rcard);
    }
    area.append(saved);
  }

  function projectPicker(parent){
    const row=h("div","wr-project-toolbar");
    const sel=document.createElement("select");
    for(const p of state.projects){
      const op=h("option","",p.title||"โปรเจกต์ไม่มีชื่อ");op.value=p.id;op.selected=p.id===state.activeProjectId;sel.append(op);
    }
    sel.addEventListener("change",()=>{state.activeProjectId=sel.value;pendingSchedule=null;save();render();});
    const newBtn=btn("+ โปรเจกต์ใหม่",()=>{
      const p=defaultProject();state.projects.unshift(p);state.activeProjectId=p.id;pendingSchedule=null;save();render();
    });
    const importBtn=btn("ดึงพล็อตจากตัวสร้างเดิม",()=>importExistingStory(),"secondary");
    add(row,sel,newBtn,importBtn);parent.append(row);
  }
  function renderPlanner(area){
    project();
    projectPicker(area);
    const p=project();
    const top=card("ตั้งโจทย์เรื่อง","เลือกว่าจะจบในเล่มเดียวหรือเดินเป็นซีรีส์ แล้วใส่ข้อมูลที่มีอยู่ ระบบจะต่อเป็นแผนให้แก้ได้");
    const grid=h("div","wr-form-grid");
    const specs=[
      ["title","ชื่อโปรเจกต์",{placeholder:"ชื่อเรื่องชั่วคราว"}],
      ["mode","รูปแบบเรื่อง",{select:true,options:[{value:"standalone",label:"จบในเล่มเดียว"},{value:"serial",label:"ซีรีส์/เรื่องต่อเนื่อง"}]}],
      ["genre","แนวหลัก",{select:true,options:["ลึกลับ","สืบสวน","ดราม่า","ตลกร้าย","เสียดสีสังคม","โรแมนติก","แฟนตาซี","สยองขวัญ","ผจญภัย","วรรณกรรมชีวิต","ผสมแนว"].map(x=>({value:x,label:x}))}],
      ["chapterCount","จำนวนตอน/บท",{type:"number",min:1,max:100,step:1}],
      ["targetWords","เป้าหมายจำนวนคำทั้งเล่ม",{type:"number",min:1000,max:1000000,step:500}],
      ["wordsPerChapter","เป้าหมายคำต่อบท",{type:"number",min:100,max:20000,step:100}],
      ["startDate","วันเริ่มเขียน",{type:"date"}],
      ["dueDate","วันที่อยากเสร็จ",{type:"date"}],
      ["pov","มุมมองหลัก",{select:true,options:["บุคคลที่หนึ่ง","บุคคลที่สามใกล้ชิด","บุคคลที่สามรอบรู้","สลับหลายมุมมอง"].map(x=>({value:x,label:x}))}],
      ["ending","ภาพรวมตอนจบ",{placeholder:"เช่น ปิดคดี แต่ทิ้งคำถามทางศีลธรรม"}],
      ["question","คำถามหลักของเรื่อง",{placeholder:"เช่น ใครมีสิทธิ์เป็นผู้กำหนดความจริง?"}],
      ["premise","พล็อตตั้งต้น",{multiline:true,rows:4,placeholder:"ใครต้องการอะไร อะไรขวางอยู่ และถ้าแพ้จะเสียอะไร"}],
      ["themes","ธีม/สิ่งที่อยากพูดถึง",{multiline:true,rows:3,placeholder:"ความยุติธรรม ความโดดเดี่ยว ชนชั้น ความทรงจำ ฯลฯ"}],
      ["outlineNotes","ข้อห้าม/สิ่งที่ต้องเกิด",{multiline:true,rows:3,placeholder:"เหตุการณ์ที่ต้องมี, สิ่งที่ห้ามขัดกัน, ปมที่ต้องเฉลย"}]
    ];
    for(const [key,label,opts] of specs){
      const f=field(label,p[key],value=>{
        p[key]=value;
        if(key==="chapterCount")p.chapterCount=clamp(value,1,100);
        p.scheduleApproved=false;
        p.updatedAt=new Date().toISOString();
        save();
      },{...opts});
      if(["title","premise","themes","outlineNotes","question"].includes(key))f.wrap.classList.add("wr-span-2");
      grid.append(f.wrap);
    }
    top.append(grid);
    const weekdays=card("วันเขียนประจำสัปดาห์","ใช้คำนวณวันเขียนจริงในตาราง ไม่รวมวันพัก");
    const weekrow=h("div","wr-weekdays");
    for(let d=1;d<=6;d++){
      const label=h("label","wr-check-row");const cb=h("input");cb.type="checkbox";cb.checked=(p.writingDays||[]).includes(d);
      cb.addEventListener("change",()=>{p.writingDays=(p.writingDays||[]).filter(x=>x!==d);if(cb.checked)p.writingDays.push(d);p.writingDays.sort();p.scheduleApproved=false;save();});
      add(label,cb,h("span","",FULL_DAYS[d]));weekrow.append(label);
    }
    const sun=h("label","wr-check-row");const sunCb=h("input");sunCb.type="checkbox";sunCb.checked=(p.writingDays||[]).includes(0);
    sunCb.addEventListener("change",()=>{p.writingDays=(p.writingDays||[]).filter(x=>x!==0);if(sunCb.checked)p.writingDays.push(0);p.writingDays.sort();p.scheduleApproved=false;save();});
    add(sun,sunCb,h("span","","อาทิตย์"));weekrow.append(sun);
    weekdays.append(weekrow);top.append(weekdays);
    const styles=card("ลายเซ็นของเรื่อง","เลือก mood และคุณลักษณะการเล่าได้หลายมิติ ไม่ได้เปลี่ยนเรื่องให้เป็นผลงานของคนอื่น");
    const presetOpts=[{value:"",label:"ไม่มี preset — เขียนคำอธิบายเอง"}].concat(Object.keys(STYLE_PRESETS).map(x=>({value:x,label:x})));
    const preset=field("แนวทางสไตล์อ้างอิง",p.stylePreset||"",value=>{
      p.stylePreset=value;
      if(value&&STYLE_PRESETS[value])p.styleTraits=STYLE_PRESETS[value].traits;
      save();render();
    },{select:true,options:presetOpts});
    styles.append(preset.wrap);
    if(p.stylePreset&&STYLE_PRESETS[p.stylePreset])styles.append(status(styles,STYLE_PRESETS[p.stylePreset].note,"info"));
    const styleText=textareaField("คุณลักษณะการเล่าที่ต้องการ",p.styleTraits||"",value=>{p.styleTraits=value;save();},"เช่น ผู้เล่าที่ไม่น่าเชื่อถือ, ตลกร้าย, ประโยคสั้นในฉากกดดัน, มู้ดเศร้าสงบ",3);
    styles.append(styleText.wrap);
    const fingerprint=card("สแกนลายมือจากตัวอย่างข้อความที่คุณมีสิทธิ์ใช้","วางตัวอย่างสั้น ๆ เพื่อวัดลักษณะเชิงรูปแบบในเครื่อง ไม่ได้ส่งข้อความไปหา AI/API และไม่ได้พิสูจน์ว่าเป็นเอกลักษณ์ของผู้เขียนคนใด");
    const sampleField=textareaField("ตัวอย่างข้อความอ้างอิง",p.styleSample||"",value=>{p.styleSample=value;save();},"วางตัวอย่างที่คุณมีสิทธิ์ใช้ตรงนี้ เช่น ย่อหน้าสั้น ๆ ไม่จำเป็นต้องวางทั้งบท",5);
    fingerprint.append(sampleField.wrap);
    fingerprint.append(btn("วิเคราะห์ลักษณะการเล่า",()=>{
      const sample=String(p.styleSample||"").trim();
      if(sample.length<80){statusMessage="ตัวอย่างสั้นเกินไป ลองวางอย่างน้อย 80 ตัวอักษรที่คุณมีสิทธิ์ใช้";render();return;}
      p.styleFingerprint=UTILS.analyzeReferenceText(sample);
      const suggestions=p.styleFingerprint.suggestedStyleTraits||[];
      p.styleTraits=unique(splitList(p.styleTraits).concat(suggestions)).join(", ");
      statusMessage="วิเคราะห์ลักษณะเชิงรูปแบบแล้ว · ตรวจผลและแก้สไตล์ที่นำไปใช้ก่อนเขียน";save();render();
    }),btn("ล้างตัวอย่าง",()=>{p.styleSample="";p.styleFingerprint=null;save();render();},"secondary"));
    if(p.styleFingerprint&&p.styleFingerprint.signals){
      const sig=p.styleFingerprint.signals;
      const stats=h("div","wr-schedule-summary");
      add(stats,
        h("div","wr-statbox",h("strong","",sig.averageSentenceLength),h("span","","ตัวอักษร/ประโยค")),
        h("div","wr-statbox",h("strong","",sig.averageParagraphLength),h("span","","ตัวอักษร/ย่อหน้า")),
        h("div","wr-statbox",h("strong","",sig.dialogueRatio+"%"),h("span","","สัดส่วนบทสนทนาโดยประมาณ")),
        h("div","wr-statbox",h("strong","",sig.questions),h("span","","เครื่องหมายคำถาม")),
        h("div","wr-statbox",h("strong","",sig.exclamations),h("span","","เครื่องหมายอุทาน")));
      fingerprint.append(stats);
      if(p.styleFingerprint.suggestedStyleTraits&&p.styleFingerprint.suggestedStyleTraits.length){
        fingerprint.append(h("strong","","ลักษณะที่ระบบเสนอ"));
        const chips=h("div","wr-inline");
        p.styleFingerprint.suggestedStyleTraits.forEach(x=>chips.append(badge(x,"info")));
        fingerprint.append(chips);
      }
      if(p.styleFingerprint.traits&&p.styleFingerprint.traits.length){
        fingerprint.append(h("p","wr-muted","คำ/สัญญาณที่ตรวจพบ: "+p.styleFingerprint.traits.join(" · ")));
      }
      if(sig.repeatedWords&&sig.repeatedWords.length){
        fingerprint.append(h("p","wr-muted","คำที่ปรากฏซ้ำในตัวอย่าง: "+sig.repeatedWords.map(x=>x.word+" ×"+x.count).join(" · ")));
      }
      fingerprint.append(h("p","wr-muted","ตัวเลขเป็นการวัดเบื้องต้นจากตัวอย่างนี้เท่านั้น ไม่สามารถยืนยันตัวตนผู้เขียนหรือสรุปสไตล์จากหนังสือทั้งเล่มได้"));
    }
    styles.append(fingerprint);
    const sliders=h("div","wr-slider-grid");
    for(const [key,label] of [["humor","ตลกร้าย"],["sadness","ความเศร้า"],["tension","แรงกดดัน"],["satire","เสียดสีสังคม"],["tenderness","ความอบอุ่น"]]){
      const f=field(label+" · "+(p[key]||0)+"%",p[key]===undefined?50:p[key],value=>{p[key]=value;save();const t=f.wrap.querySelector("label");if(t)t.textContent=label+" · "+value+"%";},{type:"range",min:0,max:100,step:5});
      sliders.append(f.wrap);
    }
    styles.append(sliders);
    const moods=h("div","wr-mood-grid");
    for(const mood of MOODS){
      const label=h("label","wr-mood-choice");const cb=h("input");cb.type="checkbox";cb.checked=(p.moodMix||[]).includes(mood);
      cb.addEventListener("change",()=>{p.moodMix=(p.moodMix||[]).filter(x=>x!==mood);if(cb.checked)p.moodMix.push(mood);save();});
      add(label,cb,h("span","",mood));moods.append(label);
    }
    styles.append(h("strong","","Mood ประจำเรื่อง"),moods);
    const cast=card("ตัวละครที่ใช้ในโปรเจกต์",String(state.characters.length)+" ตัวในคลัง");
    if(!state.characters.length)cast.append(empty("เพิ่มตัวละครในคลังก่อน หรือใช้ปุ่มนำเข้าจากตัวสร้างเดิมในแท็บคลังตัวละคร"));
    const castGrid=h("div","wr-cast-grid");
    for(const c of state.characters){
      const label=h("label","wr-check-row");const cb=h("input");cb.type="checkbox";cb.checked=(p.selectedCharacterIds||[]).includes(c.id);
      cb.addEventListener("change",()=>{p.selectedCharacterIds=(p.selectedCharacterIds||[]).filter(x=>x!==c.id);if(cb.checked)p.selectedCharacterIds.push(c.id);p.scheduleApproved=false;save();});
      add(label,cb,h("span","",c.name),h("small","wr-muted",c.role||""));castGrid.append(label);
    }
    cast.append(castGrid);
    const actions=h("div","wr-inline");
    add(actions,btn("สร้าง/ปรับแผนรายตอน",()=>{
      if(!String(p.premise||"").trim()&&!getProjectCharacters(p).length){statusMessage="ใส่พล็อตตั้งต้น หรือเลือกตัวละครอย่างน้อยหนึ่งตัวก่อนสร้างแผน";render();return;}
      const chars=getProjectCharacters(p);
      const next=UTILS.buildChapterPlan(p,chars);
      const old=p.chapters||[];
      p.chapters=next.map((c,i)=>old[i]?{...c,...old[i],id:old[i].id,number:i+1}:c);
      p.scheduleApproved=false;p.schedule=[];pendingSchedule=null;p.updatedAt=new Date().toISOString();
      statusMessage="สร้างโครง "+p.chapters.length+" ตอนแล้ว · เติม/แก้เป้าหมาย ฉาก ปม และ hook ของแต่ละตอน";save();render();
    }),btn("นำเข้าร่างจากคลังอ้างอิง",()=>{
      const refs=state.references;
      if(!refs.length){statusMessage="ยังไม่มีแหล่งอ้างอิงในโต๊ะอ้างอิง";render();return;}
      p.themes=(p.themes? p.themes+"\n":"")+refs.slice(0,5).map(x=>x.title+" — "+(x.excerpt||"ยังไม่มีบันทึก")).join("\n");
      save();statusMessage="เพิ่มบันทึกอ้างอิงลงธีมแล้ว";render();
    },"secondary"),btn("ลบโปรเจกต์",()=>{
      if(!confirm("ลบโปรเจกต์นี้และตารางเขียนที่ผูกอยู่หรือไม่?"))return;
      state.projects=state.projects.filter(x=>x.id!==p.id);state.activeProjectId=state.projects[0]?.id||"";pendingSchedule=null;save();render();
    },"danger"));
    top.append(styles,cast,actions);area.append(top);

    if(p.chapters&&p.chapters.length){
      renderPlanScore(area,p);
      renderChapters(area,p);
      renderSchedulePreview(area,p);
      const exportCard=card("ส่งออกแผน","ดาวน์โหลดได้ทั้งไฟล์ JSON เพื่อเก็บงานต่อ และ Markdown สำหรับอ่าน/พิมพ์");
      add(exportCard,btn("ส่งออกโปรเจกต์ JSON",()=>download("novellens-project-"+slug(p.title)+".json",JSON.stringify(p,null,2),"application/json")),
        btn("ส่งออก Planner เป็น Markdown",()=>download("novellens-planner-"+slug(p.title)+".md",projectMarkdown(p),"text/markdown;charset=utf-8"),"secondary"));
      area.append(exportCard);
    }else{
      const hint=card("ขั้นตอนถัดไป","เมื่อพร้อม กดสร้างแผนรายตอน ระบบจะตั้งโครงต้นเรื่อง กลางเรื่อง จุดหักมุม ไคลแมกซ์ และบทสรุปเป็นร่าง");
      add(hint,h("p","wr-muted","ร่างที่สร้างเป็นจุดเริ่มต้น ไม่ใช่ข้อสรุปสุดท้าย แก้แต่ละตอนให้สะท้อนเหตุและผลของตัวละครของคุณก่อนสร้างตารางเขียน"));
      area.append(hint);
    }
  }
  function slug(value){return String(value||"novel").normalize("NFKD").replace(/[^\p{L}\p{N}-]+/gu,"-").replace(/^-+|-+$/g,"").slice(0,60)||"novel";}
  function renderPlanScore(area,p){
    const chars=getProjectCharacters(p),score=UTILS.evaluatePlan(p,chars);
    const cardBox=card("ความพร้อมของแผน · "+score.score+"%","คะแนนนี้วัดความครบขององค์ประกอบที่กรอก ไม่ใช่คะแนนคุณภาพวรรณกรรมหรือคำรับรองว่าเรื่องจะสมบูรณ์แน่นอน");
    const bar=h("div","wr-progress");const fill=h("span","");fill.style.width=score.score+"%";bar.append(fill);
    const checks=h("div","wr-checklist");
    for(const item of score.checklist){const row=h("div","wr-check-item");add(row,h("span",item.done?"wr-check-icon done":"wr-check-icon",item.done?"✓":"○"),h("span","",item.label));checks.append(row);}
    add(cardBox,bar,checks);area.append(cardBox);
  }
  function renderChapters(area,p){
    const box=card("Planner รายตอน",p.chapters.length+" ตอน · เป้าหมาย "+Number(p.targetWords||0).toLocaleString()+" คำทั้งเรื่อง");
    const graph=h("div","wr-graph-wrap");graph.id="wr-arc-graph";box.append(graph);drawGraph(graph,p);
    const continuity=h("div","wr-continuity");
    const findings=continuityFindings(p);
    add(continuity,h("strong","","จุดเชื่อม/ความต่อเนื่องที่ควรตรวจ"),findings.length?h("ul","",...findings.map(x=>h("li","",x))):h("p","wr-muted","ยังไม่พบสัญญาณเตือนจากกฎพื้นฐาน แต่ควรตรวจเหตุและผลด้วยตัวเอง"));
    box.append(continuity);
    for(let index=0;index<p.chapters.length;index++){
      const c=p.chapters[index];
      const detail=h("details","wr-chapter");if(index<2)detail.open=true;
      const sum=h("summary","wr-chapter-summary");
      add(sum,h("span","wr-chapter-num",String(index+1).padStart(2,"0")),h("span","wr-chapter-title",c.title||"ตอนที่ "+(index+1)),badge(c.mood||"ยังไม่มี mood"),badge("แรงกดดัน "+c.tension));
      detail.append(sum);
      const form=h("div","wr-form-grid");
      const specs=[
        ["title","ชื่อตอน",{placeholder:"ชื่อที่แก้ได้"}],
        ["beat","หน้าที่ของตอน",{placeholder:"เหตุการณ์/หน้าที่เชิงโครงสร้าง"}],
        ["mood","Mood ของตอน",{select:true,options:MOODS.map(x=>({value:x,label:x}))}],
        ["status","สถานะงาน",{select:true,options:["ยังไม่เริ่ม","กำลังวางแผน","กำลังเขียน","แก้ไข","เสร็จแล้ว"].map(x=>({value:x,label:x}))}],
        ["goal","เป้าหมายเชิงเรื่อง",{multiline:true,rows:2,placeholder:"เมื่อจบตอน ผู้อ่านรู้/ตัวละครเปลี่ยนอะไร"}],
        ["scene","ฉาก/เหตุการณ์หลัก",{multiline:true,rows:3,placeholder:"จะเกิดอะไรขึ้น และฉากนี้ส่งผลต่อตอนถัดไปอย่างไร"}],
        ["conflict","ความขัดแย้งและต้นทุน",{multiline:true,rows:2,placeholder:"ใคร/อะไรขวาง ใครต้องเสียอะไรถ้าเลือกผิด"}],
        ["clue","เบาะแส/ข้อมูลที่ต้องปู",{multiline:true,rows:2,placeholder:"ข้อมูลนี้ต้องกลับมามีความหมายตอนไหน"}],
        ["twist","Plot twist / การเปลี่ยนความเข้าใจ",{multiline:true,rows:2,placeholder:"มีจุดเปลี่ยนหรือไม่ ถ้ามี ต้องปูข้อมูลอะไรล่วงหน้า"}],
        ["hook","จุดดึงไปตอนต่อไป",{multiline:true,rows:2,placeholder:"คำถาม การตัดสินใจ ผลกระทบ หรือภาพสุดท้าย"}],
        ["cast","ตัวละครในตอน (คั่นด้วยจุลภาค)",{multiline:true,rows:2}],
        ["note","บันทึก/จุดเชื่อมกับตอนอื่น",{multiline:true,rows:2,placeholder:"เชื่อมกับฉากเก่า เบาะแส หรือความสัมพันธ์ใด"}]
      ];
      for(const [key,label,opts] of specs){
        const current=Array.isArray(c[key])?c[key].join(", "):c[key]===undefined?"":c[key];
        const f=field(label,key==="mood"?(current||c.mood):current,value=>{
          c[key]=key==="cast"?splitList(value):value;
          if(key==="tension")c.tension=clamp(value,1,10);
          p.scheduleApproved=false;save();
          const heading=detail.querySelector(".wr-chapter-title");if(heading&&key==="title")heading.textContent=value;
        },opts);
        if(["goal","scene","conflict","clue","twist","hook","note"].includes(key))f.wrap.classList.add("wr-span-2");
        form.append(f.wrap);
      }
      const tension=field("ระดับแรงกดดัน · "+c.tension,c.tension,value=>{
        c.tension=clamp(value,1,10);p.scheduleApproved=false;save();
        const labels=detail.querySelectorAll(".wr-chapter-summary .wr-badge");
        if(labels.length>1)labels[1].textContent="แรงกดดัน "+c.tension;
        const title=tension.wrap.querySelector("label");if(title)title.textContent="ระดับแรงกดดัน · "+c.tension;
        drawGraph(graph,p);
      },{type:"range",min:1,max:10,step:1});
      form.append(tension.wrap);
      const remove=btn("ลบตอนนี้",()=>{
        if(!confirm("ลบตอนที่ "+(index+1)+" หรือไม่?"))return;
        p.chapters.splice(index,1);p.chapterCount=p.chapters.length;p.scheduleApproved=false;save();render();
      },"danger");
      const addBefore=btn("เพิ่มตอนก่อนหน้า",()=>{
        p.chapters.splice(index,0,{id:id("chapter"),number:index+1,title:"ตอนใหม่",beat:"เชื่อมเหตุและผล",beatKey:"custom",mood:"ลึกลับ",tension:5,goal:"",scene:"",conflict:"",clue:"",twist:"",hook:"",cast:[],status:"ยังไม่เริ่ม",note:""});
        p.chapters.forEach((x,i)=>x.number=i+1);p.chapterCount=p.chapters.length;p.scheduleApproved=false;save();render();
      },"secondary");
      add(detail,form,h("div","wr-inline",remove,addBefore));box.append(detail);
    }
    const actions=h("div","wr-inline");
    add(actions,btn("+ เพิ่มตอนท้าย",()=>{
      const n=p.chapters.length+1;p.chapters.push({id:id("chapter"),number:n,title:"ตอนที่ "+n+" — ตอนเสริม",beat:"เหตุการณ์เชื่อม",beatKey:"custom",mood:"ลึกลับ",tension:5,goal:"",scene:"",conflict:"",clue:"",twist:"",hook:"",cast:[],status:"ยังไม่เริ่ม",note:""});
      p.chapterCount=p.chapters.length;p.scheduleApproved=false;save();render();
    }),btn("อัปเดตกราฟ/ตรวจความต่อเนื่อง",()=>{render();statusMessage="อัปเดตกราฟและรายการตรวจแล้ว";},"secondary"));
    box.append(actions);area.append(box);
  }
  function drawGraph(host,p){
    if(!host)return;host.replaceChildren();
    const ns="http://www.w3.org/2000/svg",w=760,hg=240,pad=34;
    const svg=document.createElementNS(ns,"svg");svg.setAttribute("viewBox","0 0 "+w+" "+hg);svg.setAttribute("role","img");svg.setAttribute("aria-label","กราฟแรงกดดันและจุดหักมุมรายตอน");
    const chapters=p.chapters||[], n=Math.max(1,chapters.length);
    const point=(i,v)=>({x:pad+(w-pad*2)*(n===1?0.5:i/(n-1)),y:hg-pad-(hg-pad*2)*(clamp(v,1,10)-1)/9});
    for(let value=1;value<=10;value+=3){
      const pt=point(0,value),line=document.createElementNS(ns,"line");line.setAttribute("x1",pad);line.setAttribute("x2",w-pad);line.setAttribute("y1",pt.y);line.setAttribute("y2",pt.y);line.setAttribute("class","wr-gridline");svg.append(line);
      const label=document.createElementNS(ns,"text");label.setAttribute("x","8");label.setAttribute("y",String(pt.y+4));label.setAttribute("class","wr-axis-label");label.textContent=String(value);svg.append(label);
    }
    const pts=chapters.map((c,i)=>point(i,c.tension||5));
    const poly=document.createElementNS(ns,"polyline");poly.setAttribute("points",pts.map(pt=>pt.x+","+pt.y).join(" "));poly.setAttribute("class","wr-curve");svg.append(poly);
    pts.forEach((pt,i)=>{
      const c=chapters[i],circle=document.createElementNS(ns,"circle");circle.setAttribute("cx",pt.x);circle.setAttribute("cy",pt.y);circle.setAttribute("r",c.twist?6:4);circle.setAttribute("class",c.twist?"wr-point twist":"wr-point");svg.append(circle);
      if(i===0||i===n-1||n<=14||i%Math.ceil(n/12)===0){
        const label=document.createElementNS(ns,"text");label.setAttribute("x",pt.x);label.setAttribute("y",hg-7);label.setAttribute("text-anchor","middle");label.setAttribute("class","wr-axis-label");label.textContent=String(i+1);svg.append(label);
      }
    });
    host.append(svg);
    const legend=h("div","wr-graph-legend");add(legend,h("span","","● แรงกดดัน 1–10"),h("span","","◆ จุดที่มีข้อความ twist"));host.append(legend);
  }
  function continuityFindings(p){
    const chapters=p.chapters||[],findings=[];
    if(!chapters.length)return ["สร้างแผนรายตอนก่อน"];
    if(!chapters[0].goal)findings.push("ตอนต้นยังไม่มีเป้าหมายที่ชัด");
    const twistAt=chapters.map((c,i)=>c.twist?i:-1).filter(i=>i>=0);
    for(const index of twistAt){
      if(index>0&&!chapters.slice(0,index).some(c=>String(c.clue||"").trim()))findings.push("ตอน "+(index+1)+" มี twist แต่ยังไม่พบช่องเบาะแสที่กรอกในตอนก่อนหน้า");
    }
    for(let i=0;i<chapters.length;i++){
      if(!chapters[i].hook&&i<chapters.length-1)findings.push("ตอน "+(i+1)+" ยังไม่มี hook หรือผลที่ดันไปตอนต่อไป");
      if(i>0&&chapters[i].goal&&!chapters[i-1].conflict&&!chapters[i-1].scene)findings.push("เชื่อมตอน "+i+" → "+(i+1)+": ตอนก่อนหน้ายังไม่ระบุผลที่ส่งต่อมา");
    }
    if(!chapters[chapters.length-1].hook)findings.push("ตอนสุดท้ายยังไม่มีบทสรุป/คำถามปิดเรื่อง");
    if(twistAt.length===0)findings.push("ยังไม่ได้ระบุจุดหักมุม ให้เลือกจุดเปลี่ยนที่มาจากเบาะแส ไม่ใช่ข้อมูลที่เพิ่งโผล่");
    if(chapters.every(c=>!c.conflict&&!c.scene))findings.push("ทุกตอนยังขาดเหตุการณ์/ความขัดแย้ง จึงประเมินความต่อเนื่องได้จำกัด");
    return unique(findings).slice(0,12);
  }
  function renderSchedulePreview(area,p){
    const box=card("วางตารางเขียนจนถึงวันส่ง","ระบบจะคำนวณตามช่วงวันที่และวันเขียนที่คุณเลือก แต่จะยังไม่เพิ่มงานในปฏิทินจนกว่าคุณจะกดยืนยัน");
    const preview=btn("คำนวณตารางและดูตัวอย่าง",()=>{
      try{pendingSchedule=UTILS.buildSchedule(p);statusMessage="ดูตัวอย่างแล้ว ตรวจภาระงานก่อนกดยืนยันใช้ตาราง";render();}catch(e){statusMessage=e.message;render();}
    });
    box.append(preview);
    if(pendingSchedule){
      const q=pendingSchedule;
      const summary=h("div","wr-schedule-summary");
      add(summary,
        h("div","wr-statbox",h("strong","",q.sessionCount),h("span","","วันเขียน")),
        h("div","wr-statbox",h("strong","",q.totalWords.toLocaleString()),h("span","","คำเป้าหมาย")),
        h("div","wr-statbox",h("strong","",q.wordsPerDay.toLocaleString()),h("span","","คำ/วัน")),
        h("div","wr-statbox",h("strong","",q.estimatedPages.toLocaleString()),h("span","","หน้าโดยประมาณ")));
      box.append(summary,status(box,"ระดับภาระ: "+q.pace+(q.exceeds?" · สูงกว่า 2,500 คำในวันเขียนเฉลี่ย โปรดพิจารณาขยายเวลา/ลดเป้าหมาย":"")+" · วันเขียน "+q.schedule[0].date+" ถึง "+q.schedule[q.schedule.length-1].date, q.exceeds?"warn":"info"));
      const table=h("div","wr-table-wrap"),tbl=h("table","wr-table");
      const thead=h("thead"),tr=h("tr");
      ["วันที่","งานเป้าหมาย","ตอน","คำเป้าหมาย"].forEach(x=>tr.append(h("th","",x)));thead.append(tr);tbl.append(thead);
      const tbody=h("tbody");
      const sample=q.schedule.length<=12?q.schedule:q.schedule.slice(0,5).concat(q.schedule.slice(-3));
      sample.forEach(task=>{
        const row=h("tr");add(row,h("td","",task.date),h("td","",task.task),h("td","","ตอน "+task.chapterNumber),h("td","",task.targetWords.toLocaleString()));tbody.append(row);
      });
      if(q.schedule.length>sample.length){const row=h("tr");const td=h("td","","… อีก "+(q.schedule.length-sample.length)+" วัน");td.colSpan=4;row.append(td);tbody.append(row);}
      tbl.append(tbody);table.append(tbl);box.append(table);
      const confirmWrap=h("div","wr-confirm-plan");
      add(confirmWrap,h("p","","ตรวจแล้วว่าภาระต่อวันเหมาะกับชีวิตจริงหรือยัง ก่อนกดยืนยันตารางจะถูกบันทึกลงโปรเจกต์นี้"),
        btn("ยืนยันและบันทึกตาราง",()=>{
          if(!confirm("ยืนยันใช้ตารางนี้หรือไม่? ระบบจะบันทึกงานรายวันลงปฏิทินของโปรเจกต์นี้"))return;
          p.schedule=q.schedule;p.scheduleApproved=true;p.updatedAt=new Date().toISOString();pendingSchedule=null;save();activeView="calendar";state.view=activeView;save();render();
        }),btn("ยังไม่ใช้ — กลับไปปรับแผน",()=>{pendingSchedule=null;save();render();},"secondary"));
      box.append(confirmWrap);
    }
    if(p.scheduleApproved&&p.schedule&&p.schedule.length){
      box.append(status(box,"มีตารางที่ยืนยันแล้ว "+p.schedule.length+" วัน · ปรับกำหนดส่งหรือเป้าหมายได้ แล้วคำนวณตารางใหม่อีกครั้ง","success"));
      box.append(btn("เปิดปฏิทินเขียน",()=>{activeView="calendar";state.view=activeView;save();render();},"secondary"));
    }
    area.append(box);
  }
  function importExistingStory(){
    const old=readJson(STUDIO_KEY,null),story=old&&old.story;
    if(!story||!Array.isArray(story.outline)||!story.outline.length){statusMessage="ยังไม่พบพล็อตที่สร้างไว้ในตัวสร้างเดิม ลองสร้างพล็อตในแท็บเดิมก่อน";render();return;}
    const p=project();
    if(!confirm("นำพล็อต \""+(story.titles&&story.titles[0]||story.genre||"พล็อตเดิม")+"\" เข้ามาเป็นร่างของโปรเจกต์ \""+p.title+"\" หรือไม่? การดำเนินการนี้แทนที่รายการตอนเดิมของโปรเจกต์นี้"))return;
    p.title=story.titles&&story.titles[0]||p.title;
    p.premise=story.logline||story.premise||p.premise;
    p.genre=story.genre||p.genre;
    p.chapters=story.outline.map((o,i)=>({
      id:id("chapter"),number:i+1,title:o.title||"ตอนที่ "+(i+1),beat:o.slot||o.title||"เหตุการณ์หลัก",
      beatKey:o.slot||"custom",mood:(p.moodMix||["ลึกลับ"])[i%(p.moodMix||["ลึกลับ"]).length],tension:Math.min(10,3+Math.round(i*7/Math.max(1,story.outline.length-1))),
      goal:o.why||o.base||o.text||"",scene:o.text||"",conflict:(o.why||""),clue:(o.add||[]).filter(x=>/เบาะแส/.test(x)).join(" "),
      twist:(o.add||[]).filter(x=>/เฉลย|ความจริงเปิดเผย/.test(x)).join(" "),hook:o.title||"",cast:o.actors||[],status:"ยังไม่เริ่ม",note:"นำเข้าจากตัวสร้างพล็อตเดิม"
    }));
    p.chapterCount=p.chapters.length;p.schedule=[];p.scheduleApproved=false;
    if(Array.isArray(story.cast)){
      for(const original of story.cast){
        if(!original||!original.name)continue;
        let existing=state.characters.find(c=>String(c.name).toLocaleLowerCase()===String(original.name).toLocaleLowerCase());
        if(!existing){
          existing=characterFromStudio(original);existing.notes=(existing.notes?existing.notes+"\n":"")+"นำเข้าจากตัวสร้างพล็อตเดิม";state.characters.unshift(existing);
        }
        if(!p.selectedCharacterIds.includes(existing.id))p.selectedCharacterIds.push(existing.id);
      }
    }
    activeView="planner";state.view=activeView;statusMessage="นำเข้าพล็อตเดิมแล้ว ตรวจและแก้ข้อมูลรายตอนก่อนทำตาราง";save();render();
  }
  function projectMarkdown(p){
    const chars=getProjectCharacters(p);
    const lines=["# "+p.title,"","- รูปแบบ: "+(p.mode==="serial"?"ซีรีส์/เรื่องต่อเนื่อง":"จบในเล่มเดียว"),"- แนว: "+p.genre,"- จำนวนตอน: "+p.chapters.length,"- เป้าคำ: "+Number(p.targetWords||0).toLocaleString(),"","## เรื่องย่อ / คำถามหลัก",p.premise||"ยังไม่กรอก","", "## ธีม",p.themes||"ยังไม่กรอก","","## ตัวละคร",...chars.map(c=>"- "+c.name+" — "+(c.personality||c.traits||"ยังไม่มีบุคลิก")),"","## รายตอน"];
    for(const c of p.chapters)lines.push("### "+c.number+". "+c.title,"- หน้าที่: "+c.beat,"- Mood: "+c.mood,"- เป้าหมาย: "+(c.goal||"ยังไม่กรอก"),"- ฉาก: "+(c.scene||"ยังไม่กรอก"),"- ความขัดแย้ง: "+(c.conflict||"ยังไม่กรอก"),"- เบาะแส: "+(c.clue||"—"),"- Plot twist: "+(c.twist||"—"),"- Hook: "+(c.hook||"—"),"- บันทึก: "+(c.note||"—"),"");
    if(p.scheduleApproved)lines.push("## ตารางเขียน",...p.schedule.map(t=>"- [ ] "+t.date+" · "+t.task+" · ตอน "+t.chapterNumber+" · เป้า "+t.targetWords+" คำ"));
    return lines.join("\n");
  }

  function renderCalendar(area){
    const p=project();
    const head=card("ปฏิทินงานเขียน",p.title+" · งานจะปรากฏตรงนี้หลังคุณตรวจและยืนยันตารางใน Story Planner");
    const controls=h("div","wr-inline");
    add(controls,btn("← เดือนก่อน",()=>shiftMonth(-1),"secondary"),h("strong","",calendarMonth),btn("เดือนถัดไป →",()=>shiftMonth(1),"secondary"));
    function shiftMonth(delta){
      const d=new Date(calendarMonth+"-15T12:00:00");d.setMonth(d.getMonth()+delta);calendarMonth=todayISO(d).slice(0,7);render();
    }
    head.append(controls);
    if(!p.scheduleApproved||!p.schedule||!p.schedule.length){
      head.append(empty("ยังไม่มีตารางที่ยืนยันแล้ว ไปที่ Story Planner → คำนวณตารางและดูตัวอย่าง → ตรวจภาระงาน → กดยืนยันก่อน"));
      head.append(btn("ไปที่ Story Planner",()=>{activeView="planner";state.view=activeView;save();render();}));
      area.append(head);return;
    }
    const tasks=p.schedule.filter(t=>String(t.date||"").slice(0,7)===calendarMonth);
    const [year,month]=calendarMonth.split("-").map(Number);
    const firstDay=new Date(year,month-1,1,12).getDay(),lastDate=new Date(year,month,0,12).getDate();
    const grid=h("div","wr-calendar");
    for(const d of DAY_NAMES)grid.append(h("div","wr-calendar-dayname",d));
    for(let i=0;i<firstDay;i++)grid.append(h("div","wr-calendar-empty"));
    for(let date=1;date<=lastDate;date++){
      const iso=year+"-"+String(month).padStart(2,"0")+"-"+String(date).padStart(2,"0");
      const dayTasks=tasks.filter(t=>t.date===iso);
      const cell=h("div","wr-calendar-cell"+(dayTasks.length?" has-task":""));
      add(cell,h("strong","wr-calendar-date",date));
      dayTasks.forEach(task=>{
        const taskBox=h("div","wr-calendar-task"+(task.done?" done":""));
        const check=h("input");check.type="checkbox";check.checked=!!task.done;check.setAttribute("aria-label","ทำเสร็จแล้ว: "+task.title);
        check.addEventListener("change",()=>{task.done=check.checked;save();render();});
        const target=h("span","",task.title+" · "+Number(task.targetWords||0).toLocaleString()+" คำ");
        add(taskBox,check,target);cell.append(taskBox);
      });
      grid.append(cell);
    }
    head.append(grid);
    const stats=h("div","wr-schedule-summary");
    const done=p.schedule.filter(t=>t.done).length;
    const wordDone=p.schedule.reduce((n,t)=>n+(Number(t.actualWords)||0),0);
    add(stats,h("div","wr-statbox",h("strong","",done+"/"+p.schedule.length),h("span","","วันทำเสร็จ")),
      h("div","wr-statbox",h("strong","",Math.round(done/p.schedule.length*100)+"%"),h("span","","ความคืบหน้าตามวัน")),
      h("div","wr-statbox",h("strong","",wordDone.toLocaleString()),h("span","","คำที่กรอกว่าทำจริง")));
    head.append(stats);
    const taskList=card("บันทึกความคืบหน้ารายวัน","ติ๊กงานที่เสร็จแล้ว และจดจำนวนคำจริงเพื่อให้การประเมินแผนสะท้อนความคืบหน้า");
    const upcoming=[...p.schedule].sort((a,b)=>a.date.localeCompare(b.date));
    for(const task of upcoming){
      const d=h("details","wr-task-detail");
      const sum=h("summary","",task.date+" · "+task.title+" · เป้า "+Number(task.targetWords||0).toLocaleString()+" คำ"+(task.done?" · เสร็จแล้ว":""));
      const grid=h("div","wr-form-grid");
      const actual=field("จำนวนคำที่เขียนจริง",task.actualWords||0,value=>{task.actualWords=clamp(value,0,100000);save();},{type:"number",min:0,max:100000,step:50});
      const taskName=field("งานเป้าหมาย",task.task||"",value=>{task.task=value;save();},{});
      const note=textareaField("บันทึก",task.note||"",value=>{task.note=value;save();},"ฉากที่เขียนได้ / ติดอะไร / สิ่งที่จะทำต่อ",2);
      add(grid,actual.wrap,taskName.wrap,note.wrap);add(d,sum,grid);taskList.append(d);
    }
    head.append(taskList,btn("กลับไปปรับแผนหรือวันส่ง",()=>{activeView="planner";state.view=activeView;save();render();},"secondary"));
    area.append(head);
  }

  function exportReferenceBundle(){
    download("novellens-reference-desk.json",JSON.stringify({format:"NovelLens Reference Desk",version:1,references:state.references},null,2),"application/json");
  }
  // Let imported HTML/bookmarklet sources re-use character records without overwriting existing storage.
  const navTab=$("t-writer");
  if(navTab){
    navTab.addEventListener("click",()=>{
      for(const pair of [["t-analyze","p-analyze"],["t-studio","p-studio"],["t-import","p-import"],["t-writer","p-writer"]]){
        const tab=$(pair[0]),panel=$(pair[1]);if(tab)tab.setAttribute("aria-selected",String(pair[0]==="t-writer"));if(panel)panel.hidden=pair[0]!=="t-writer";
      }
    });
    for(const pair of [["t-analyze","p-analyze"],["t-studio","p-studio"],["t-import","p-import"]]){
      const tab=$(pair[0]);if(tab)tab.addEventListener("click",()=>{const panel=$("p-writer");if(panel)panel.hidden=true;const current=$("t-writer");if(current)current.setAttribute("aria-selected","false");});
    }
  }
  ensureStudioCharacters();
  if(!state.projects.length){const p=defaultProject();state.projects.push(p);state.activeProjectId=p.id;save();}
  render();
  global.NovelLensWriterRoom={version:1,utils:UTILS,exportReferenceBundle:exportReferenceBundle};
})(typeof window!=="undefined"?window:globalThis);
