(() => {
  "use strict";
  const input = document.getElementById("analyzer-image-input");
  const queueRoot = document.getElementById("analyzer-image-queue");
  const status = document.getElementById("analyzer-image-status");
  let pending = [];
  const say = message => { if (status) status.textContent = message; };
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const make = (tag, attrs={}, ...children) => {
    const node = document.createElement(tag);
    for (const [key,value] of Object.entries(attrs)) {
      if (key === "class") node.className = value;
      else if (key === "disabled") node.disabled = Boolean(value);
      else node.setAttribute(key,value);
    }
    for (const child of children.flat()) if (child !== null && child !== undefined && child !== "") node.append(child);
    return node;
  };
  function revoke(item){ if(item && item.url) URL.revokeObjectURL(item.url); }
  function draw(item){
    const c=item.canvas,im=item.image;
    const scale=Math.min(1,1600/im.naturalWidth,6500/im.naturalHeight,Math.sqrt(5000000/(im.naturalWidth*im.naturalHeight)));
    c.width=Math.max(1,Math.round(im.naturalWidth*scale));
    c.height=Math.max(1,Math.round(im.naturalHeight*scale));
    const ctx=c.getContext("2d",{alpha:false});
    ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);
    ctx.drawImage(im,0,0,c.width,c.height);
  }
  function overlay(item){
    if(!item.canvas||!item.selection)return;
    const r=item.canvas.getBoundingClientRect(),c=item.crop;
    if(!c||!r.width||!r.height){item.selection.style.display="none";return;}
    item.selection.style.display="block";
    item.selection.style.left=(c.x/item.canvas.width*r.width)+"px";
    item.selection.style.top=(c.y/item.canvas.height*r.height)+"px";
    item.selection.style.width=(c.w/item.canvas.width*r.width)+"px";
    item.selection.style.height=(c.h/item.canvas.height*r.height)+"px";
  }
  function cropEvents(item){
    let start=null;const c=item.canvas;
    const point=e=>{const r=c.getBoundingClientRect();return{x:clamp((e.clientX-r.left)/r.width*c.width,0,c.width),y:clamp((e.clientY-r.top)/r.height*c.height,0,c.height)};};
    c.addEventListener("pointerdown",e=>{e.preventDefault();start=point(e);item.crop={x:start.x,y:start.y,w:0,h:0};if(c.setPointerCapture)c.setPointerCapture(e.pointerId);overlay(item);});
    c.addEventListener("pointermove",e=>{if(!start)return;const p=point(e);item.crop={x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),w:Math.abs(p.x-start.x),h:Math.abs(p.y-start.y)};overlay(item);});
    const end=()=>{if(!start)return;start=null;if(!item.crop||item.crop.w<8||item.crop.h<8){item.crop=null;overlay(item);say("กรอบเล็กเกินไป จึงยกเลิกการครอป");}else say("เลือกกรอบแล้ว — ปุ่มบันทึก/ดาวน์โหลดจะใช้เฉพาะบริเวณนี้");};
    c.addEventListener("pointerup",end);c.addEventListener("pointercancel",end);
  }
  function cropBlob(item){
    return new Promise((resolve,reject)=>{
      const im=item.image,c=item.canvas,selection=item.crop;
      let sx=0,sy=0,sw=im.naturalWidth,sh=im.naturalHeight;
      if(selection){const rx=im.naturalWidth/c.width,ry=im.naturalHeight/c.height;sx=Math.round(selection.x*rx);sy=Math.round(selection.y*ry);sw=Math.round(selection.w*rx);sh=Math.round(selection.h*ry);sx=clamp(sx,0,im.naturalWidth-1);sy=clamp(sy,0,im.naturalHeight-1);sw=clamp(sw,1,im.naturalWidth-sx);sh=clamp(sh,1,im.naturalHeight-sy);}
      if(sw*sh>45000000){reject(new Error("กรอบใหญ่เกินไป กรุณาครอปให้เล็กลง"));return;}
      const out=document.createElement("canvas");out.width=sw;out.height=sh;
      const ctx=out.getContext("2d");if(!ctx){reject(new Error("สร้างภาพครอปไม่สำเร็จ"));return;}
      ctx.drawImage(im,sx,sy,sw,sh,0,0,sw,sh);
      out.toBlob(blob=>{out.width=0;out.height=0;if(blob)resolve({blob,width:sw,height:sh});else reject(new Error("ส่งออกภาพไม่สำเร็จ"));},"image/png");
    });
  }
  function download(blob,name){
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=name.replace(/[\\/:*?"<>|]/g,"_")+".png";a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function render(){
    if(!queueRoot)return;
    queueRoot.replaceChildren();
    pending.forEach((item,index)=>{
      const canvas=make("canvas",{class:"analyzer-image-preview",tabindex:"0",role:"img","aria-label":"ลากบนภาพ "+item.name+" เพื่อครอป"});
      item.canvas=canvas;draw(item);
      const selection=make("div",{class:"analyzer-image-selection"});item.selection=selection;
      const viewport=make("div",{class:"analyzer-image-viewport"},canvas,selection);cropEvents(item);
      const up=make("button",{type:"button",class:"ghost sm",disabled:index===0},"↑ ขึ้น");
      const down=make("button",{type:"button",class:"ghost sm",disabled:index===pending.length-1},"↓ ลง");
      const reset=make("button",{type:"button",class:"ghost sm"},"รีเซ็ตกรอบ");
      const full=make("button",{type:"button",class:"ghost sm"},"เลือกภาพเต็ม");
      const save=make("button",{type:"button",class:"sm"},"ครอปและบันทึกเข้าคลังภาพ");
      const saveDownload=make("button",{type:"button",class:"ghost sm"},"ดาวน์โหลดภาพครอป");
      const remove=make("button",{type:"button",class:"ghost sm"},"เอาออก");
      up.onclick=()=>{if(index>0){[pending[index-1],pending[index]]=[pending[index],pending[index-1]];render();}};
      down.onclick=()=>{if(index<pending.length-1){[pending[index+1],pending[index]]=[pending[index],pending[index+1]];render();}};
      reset.onclick=()=>{item.crop=null;overlay(item);say("ล้างกรอบแล้ว — ก่อน OCR ให้ลากครอปหรือกด “เลือกภาพเต็ม”");};
      full.onclick=()=>{item.crop={x:0,y:0,w:item.canvas.width,h:item.canvas.height};overlay(item);say("เลือกภาพเต็มแล้วสำหรับ "+item.name);};
      remove.onclick=()=>{revoke(item);pending=pending.filter(x=>x.id!==item.id);render();say("นำภาพออกจากคิวแล้ว");};
      save.onclick=async()=>{
        if(!window.NovelLensImageWorkspace){say("ส่วนคลังภาพยังโหลดไม่เสร็จ กรุณารีเฟรชหน้าแล้วลองอีกครั้ง");return;}
        save.disabled=true;
        try{
          const result=await cropBlob(item);
          const suggested=item.name.replace(/\.[^.]+$/,"")+(item.crop?"-crop":"");
          const title=prompt("ตั้งชื่อภาพครอป",suggested);if(title===null)return;
          await window.NovelLensImageWorkspace.saveImage({blob:result.blob,title:title.trim()||"ภาพครอป",sourceName:item.name,width:result.width,height:result.height});
          say("บันทึกภาพครอปเข้าคลังแล้ว — เปิดภาพได้จากแท็บ คลัง ReadAWrite > คลังภาพที่ครอปแล้ว");
        }catch(error){say("บันทึกภาพไม่สำเร็จ: "+String(error&&error.message||error));}
        finally{save.disabled=false;}
      };
      saveDownload.onclick=async()=>{try{const result=await cropBlob(item);download(result.blob,item.name.replace(/\.[^.]+$/,"")+(item.crop?"-crop":""));say("ดาวน์โหลด PNG ที่ครอปแล้ว");}catch(error){say("ดาวน์โหลดไม่สำเร็จ: "+String(error&&error.message||error));}};
      const low=item.image.naturalWidth<700;
      queueRoot.append(make("article",{class:"analyzer-image-card"},
        make("div",{class:"analyzer-image-cardhead"},make("strong",{},(index+1)+". "+item.name),make("span",{class:"analyzer-image-small"},item.image.naturalWidth+" × "+item.image.naturalHeight+" px")),
        low?make("p",{class:"analyzer-image-small",style:"color:var(--pen)"},"ภาพแคบมาก ข้อความเล็กอาจไม่ชัด แม้ครอปแล้วก็ตาม"):null,
        make("p",{class:"analyzer-image-small"},item.crop?"เลือกกรอบครอปแล้ว":"ลากเมาส์บนภาพเพื่อครอปก่อนบันทึก"),
        viewport,make("div",{class:"analyzer-image-tools"},up,down,reset,full,save,saveDownload,remove)));
      overlay(item);
    });
  }
  async function addFiles(files){
    const list=[...(files||[])];if(!list.length)return;
    if(pending.length+list.length>20){say("จำกัด 20 ภาพในคิว");return;}
    if(list.some(f=>!["image/png","image/jpeg","image/webp"].includes(f.type))){say("รองรับเฉพาะ PNG, JPEG และ WebP");return;}
    if(list.some(f=>f.size>20*1024*1024)){say("ภาพแต่ละไฟล์ต้องไม่เกิน 20 MB");return;}
    let added=0;
    for(const file of list){
      const url=URL.createObjectURL(file),image=new Image();
      try{
        image.src=url;if(image.decode)await image.decode();else await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;});
        if(!image.naturalWidth||!image.naturalHeight)throw new Error("ไฟล์ว่าง");
        if(image.naturalWidth*image.naturalHeight>35000000){URL.revokeObjectURL(url);say("ข้าม "+file.name+" เพราะมีพิกเซลมากกว่า 35 ล้าน");continue;}
        pending.push({id:"animg-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),image,url,name:file.name,crop:null});added++;
      }catch(_){URL.revokeObjectURL(url);say("เปิดภาพ "+file.name+" ไม่สำเร็จ");}
    }
    render();if(added)say("เพิ่ม "+added+" ภาพแล้ว — ครอปเฉพาะบริเวณที่ต้องการก่อนบันทึก");
  }
  input&&input.addEventListener("change",async e=>{const files=[...(e.target.files||[])];e.target.value="";await addFiles(files);});
  document.getElementById("analyzer-image-clear")?.addEventListener("click",()=>{pending.forEach(revoke);pending=[];render();say("ล้างคิวภาพแล้ว; ภาพที่บันทึกไว้ในคลังยังอยู่");});
  window.addEventListener("novellens:add-image-to-analyzer",async e=>{
    const d=e.detail||{};if(!(d.blob instanceof Blob))return;
    const name=String(d.name||"ภาพจากคลัง.png").replace(/[\\/:*?"<>|]/g,"_");
    await addFiles([new File([d.blob],name.endsWith(".png")?name:name+".png",{type:d.blob.type||"image/png"})]);
    document.getElementById("t-analyze")?.click();document.getElementById("work")?.scrollIntoView({behavior:"smooth"});
    say("เพิ่มภาพจากคลังเข้าหน้าแกะนิยายแล้ว — ครอปเพิ่มหรือดาวน์โหลดได้");
  });

  // In-browser OCR for image files the user owns or is authorized to process.
  const ocrButton = document.getElementById("analyzer-image-ocr");
  const ocrOutput = document.getElementById("analyzer-image-output");
  const ocrQualityRoot = document.getElementById("analyzer-image-quality");
  const ocrRights = document.getElementById("analyzer-image-rights");
  const ocrLanguage = document.getElementById("analyzer-image-language");
  const ocrProgressWrap = document.getElementById("analyzer-image-progress");
  const ocrProgress = ocrProgressWrap && ocrProgressWrap.querySelector("i");
  const ocrDraftKey = "novellens.image-ocr.draft.v1";
  let ocrWorker = null;
  let ocrWorkerLanguage = "";
  let ocrLibraryPromise = null;
  let ocrBusy = false;

  try {
    const oldDraft = localStorage.getItem(ocrDraftKey);
    if (oldDraft && ocrOutput && !ocrOutput.value) ocrOutput.value = oldDraft;
  } catch (_) {}
  if (ocrOutput) ocrOutput.addEventListener("input", () => {
    try {
      if (ocrOutput.value) localStorage.setItem(ocrDraftKey, ocrOutput.value);
      else localStorage.removeItem(ocrDraftKey);
    } catch (_) {}
  });

  function withTimeout(promise, milliseconds, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), milliseconds);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  async function loadTesseract() {
    if (window.Tesseract && window.Tesseract.createWorker) return window.Tesseract;
    if (!ocrLibraryPromise) {
      ocrLibraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        let settled = false;
        const finishError = message => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          ocrLibraryPromise = null;
          reject(new Error(message));
        };
        const timer = setTimeout(() => {
          finishError("ดาวน์โหลดตัวอ่าน OCR ใช้เวลานานเกิน 30 วินาที เครือข่ายอาจบล็อก CDN ให้ลองรีเฟรชหรือเชื่อมต่อใหม่");
        }, 30000);
        script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
        script.async = true;
        script.onload = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (window.Tesseract && window.Tesseract.createWorker) resolve(window.Tesseract);
          else {
            ocrLibraryPromise = null;
            reject(new Error("โหลดไฟล์ OCR แล้วแต่ไม่พบเครื่องมือ"));
          }
        };
        script.onerror = () => finishError("โหลดตัวอ่าน OCR ไม่สำเร็จ ตรวจอินเทอร์เน็ตหรือการเข้าถึง jsDelivr แล้วลองใหม่");
        document.head.append(script);
      });
    }
    return ocrLibraryPromise;
  }

  function makeOcrCanvas(item, mode = "balanced") {
    const image = item.image, preview = item.canvas, crop = item.crop;
    let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;
    if (crop) {
      const scaleX = image.naturalWidth / preview.width;
      const scaleY = image.naturalHeight / preview.height;
      sx = Math.round(crop.x * scaleX);
      sy = Math.round(crop.y * scaleY);
      sw = Math.round(crop.w * scaleX);
      sh = Math.round(crop.h * scaleY);
      sx = clamp(sx, 0, image.naturalWidth - 1);
      sy = clamp(sy, 0, image.naturalHeight - 1);
      sw = clamp(sw, 1, image.naturalWidth - sx);
      sh = clamp(sh, 1, image.naturalHeight - sy);
    }
    // The retry pass is capped lower to keep pixel processing responsive on ordinary laptops.
    const pixelBudget = mode === "binary" ? 8000000 : 14000000;
    const scale = Math.min(3, Math.sqrt(pixelBudget / Math.max(1, sw * sh)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const context = canvas.getContext("2d", { alpha: false, willReadFrequently: mode === "binary" });
    if (!context) throw new Error("เตรียมภาพสำหรับ OCR ไม่สำเร็จ");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.filter = mode === "binary" ? "grayscale(1) contrast(1.45) brightness(1.04)" : "grayscale(1) contrast(1.18)";
    context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    context.filter = "none";

    if (mode === "binary") {
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = frame.data, histogram = new Uint32Array(256);
      const total = pixels.length / 4;
      let totalLuma = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const lum = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
        histogram[lum]++; totalLuma += lum;
      }
      let backgroundCount = 0, backgroundSum = 0, bestVariance = -1, threshold = 127;
      for (let t = 0; t < 256; t++) {
        backgroundCount += histogram[t];
        if (!backgroundCount) continue;
        const foregroundCount = total - backgroundCount;
        if (!foregroundCount) break;
        backgroundSum += t * histogram[t];
        const meanBackground = backgroundSum / backgroundCount;
        const meanForeground = (totalLuma - backgroundSum) / foregroundCount;
        const variance = backgroundCount * foregroundCount * Math.pow(meanBackground - meanForeground, 2);
        if (variance > bestVariance) { bestVariance = variance; threshold = t; }
      }
      let cornerSum = 0, cornerCount = 0;
      const block = Math.max(2, Math.min(24, Math.floor(Math.min(canvas.width, canvas.height) * 0.025)));
      for (const [ox, oy] of [[0,0],[canvas.width-block,0],[0,canvas.height-block],[canvas.width-block,canvas.height-block]]) {
        for (let y = Math.max(0, oy); y < Math.min(canvas.height, oy + block); y += 2) {
          for (let x = Math.max(0, ox); x < Math.min(canvas.width, ox + block); x += 2) {
            const p = (y * canvas.width + x) * 4;
            cornerSum += pixels[p]; cornerCount++;
          }
        }
      }
      const lightBackground = cornerCount ? cornerSum / cornerCount >= threshold : true;
      for (let i = 0; i < pixels.length; i += 4) {
        const lum = pixels[i];
        const value = lightBackground ? (lum > threshold ? 255 : 0) : (lum > threshold ? 0 : 255);
        pixels[i] = pixels[i + 1] = pixels[i + 2] = value;
        pixels[i + 3] = 255;
      }
      context.putImageData(frame, 0, 0);
    }
    return canvas;
  }

  function normalizeOcrText(value) {
    return String(value || "").replace(/\r\n?/g, "\n").normalize("NFC")
      .replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function scoreOcrCandidate(text, confidence) {
    const value = normalizeOcrText(text), chars = Array.from(value);
    const nonSpace = chars.filter(ch => !/\s/u.test(ch));
    const textUnits = chars.filter(ch => /[\p{L}\p{M}\p{N}]/u.test(ch)).length;
    const readableRatio = textUnits / (nonSpace.length || 1);
    const replacement = (value.match(/\uFFFD/g) || []).length;
    const longRuns = (value.match(/(.)\1{7,}/gu) || []).length;
    const coverage = Math.min(1, textUnits / 140);
    const certainty = Number.isFinite(Number(confidence)) ? Number(confidence) : 0;
    return {text:value, confidence:certainty, chars:chars.length,
      score:certainty * 0.72 + readableRatio * 18 + coverage * 12 - replacement * 8 - longRuns * 5};
  }

  function renderOcrQuality(pages) {
    if (!ocrQualityRoot) return;
    ocrQualityRoot.replaceChildren();
    ocrQualityRoot.hidden = !pages || !pages.length;
    if (!pages || !pages.length) return;
    const heading = document.createElement("strong");
    heading.textContent = "รายงานการอ่านแยกตามภาพ";
    ocrQualityRoot.append(heading);
    const list = document.createElement("ul");
    for (const page of pages) {
      const row = document.createElement("li");
      row.textContent = page.name + " — " + page.chars.toLocaleString() + " ตัวอักษร · ความมั่นใจ " +
        page.confidence + "%" + (page.attempts > 1 ? " · ทดลอง 2 วิธี" : "") +
        (page.low ? " · ควรตรวจด้วยตา" : " · สัญญาณ OCR ปกติ");
      list.append(row);
    }
    ocrQualityRoot.append(list);
    const note = document.createElement("p");
    note.textContent = "ความมั่นใจเป็นคะแนนจาก OCR ไม่ได้หมายความว่าทุกคำถูกต้อง ควรตรวจเทียบชื่อเฉพาะ ตัวเลข คำพูด และบรรทัดท้ายของทุกภาพ";
    ocrQualityRoot.append(note);
  }

  function mergeOcrSegments(parts) {
    let merged = "";
    for (const segment of parts) {
      const next = String(segment || "").trim();
      if (!next) continue;
      if (!merged) { merged = next; continue; }
      if (merged === next || merged.includes(next)) continue;
      if (next.includes(merged)) { merged = next; continue; }
      let overlap = 0;
      const max = Math.min(merged.length, next.length, 2500);
      for (let length = max; length >= 40; length--) {
        if (merged.slice(-length) === next.slice(0, length)) { overlap = length; break; }
      }
      merged += "\n\n" + next.slice(overlap).trim();
    }
    return merged.trim();
  }

  if (ocrButton) ocrButton.addEventListener("click", async () => {
    if (ocrBusy) return;
    if (!ocrRights || !ocrRights.checked) {
      say("โปรดยืนยันว่าคุณเป็นเจ้าของภาพ/ข้อความหรือได้รับอนุญาตให้แปลงเป็นข้อความก่อน");
      return;
    }
    if (!pending.length) { say("อัปโหลดภาพอย่างน้อยหนึ่งภาพก่อน"); return; }
    const uncropped = pending.filter(item => !item.crop || item.crop.w < 8 || item.crop.h < 8);
    if (uncropped.length) {
      say("กรุณาลากกรอบครอปทุกภาพก่อน OCR เพื่อเลือกเฉพาะเนื้อหาที่ต้องการ (" + uncropped.length + " ภาพยังไม่มีกรอบ)");
      return;
    }

    ocrBusy = true;
    renderOcrQuality([]);
    ocrButton.disabled = true;
    if (ocrProgressWrap) ocrProgressWrap.hidden = false;
    if (ocrProgress) ocrProgress.style.width = "0%";
    let buttonLabel = ocrButton.textContent;
    ocrButton.textContent = "กำลังอ่านข้อความ…";
    const language = ocrLanguage ? ocrLanguage.value : "tha";
    try {
      say("กำลังโหลดตัวอ่าน OCR… หากเป็นครั้งแรกอาจใช้เวลาสักครู่");
      const api = await loadTesseract();
      if (!ocrWorker || ocrWorkerLanguage !== language) {
        if (ocrWorker) { await ocrWorker.terminate(); ocrWorker = null; }
        say("กำลังโหลดข้อมูลภาษา " + (language === "tha+eng" ? "ไทย + English" : "ไทย") + " ลงในเบราว์เซอร์…");
        let initTimedOut = false;
        const workerPromise = api.createWorker(language, 1, {
          logger: message => {
            const phase = String(message.status || "");
            const percent = Math.round((message.progress || 0) * 100);
            if (phase === "recognizing text") {
              if (ocrProgress) ocrProgress.style.width = percent + "%";
              say("กำลังอ่านข้อความจากภาพ · " + percent + "%");
            } else if (phase.includes("language")) {
              say("กำลังดาวน์โหลด/เตรียมข้อมูลภาษา… " + (Number.isFinite(message.progress) ? percent + "%" : ""));
            } else if (phase.includes("core") || phase.includes("tesseract")) {
              say("กำลังเตรียมเครื่องอ่าน OCR… " + (Number.isFinite(message.progress) ? percent + "%" : ""));
            } else if (phase) {
              say("กำลังเตรียม OCR: " + phase + (Number.isFinite(message.progress) ? " · " + percent + "%" : ""));
            }
          },
          errorHandler: error => {
            say("OCR รายงานข้อผิดพลาด: " + String(error && error.message || error));
          }
        }).then(worker => {
          if (initTimedOut) {
            worker.terminate().catch(() => {});
            return null;
          }
          return worker;
        });
        try {
          ocrWorker = await withTimeout(
            workerPromise,
            120000,
            "เตรียม OCR ไม่เสร็จภายใน 2 นาที อาจดาวน์โหลดข้อมูลภาษาไม่สำเร็จ ให้ตรวจอินเทอร์เน็ต/CDN แล้วลองอีกครั้ง"
          );
        } catch (error) {
          initTimedOut = true;
          workerPromise.then(worker => { if (worker) worker.terminate().catch(() => {}); }).catch(() => {});
          throw error;
        }
        if (!ocrWorker) throw new Error("ตัวอ่าน OCR ถูกหยุดหลังหมดเวลารอ กรุณาลองอีกครั้ง");
        ocrWorkerLanguage = language;
        try {
          await withTimeout(ocrWorker.setParameters({
            tessedit_pageseg_mode: api.PSM && api.PSM.SINGLE_BLOCK !== undefined ? api.PSM.SINGLE_BLOCK : 6,
            preserve_interword_spaces: "1",
            user_defined_dpi: "300"
          }), 20000, "ตั้งค่าการอ่าน OCR ใช้เวลานานเกินไป");
        } catch (_) {
          say("ใช้ค่า OCR เริ่มต้นของเครื่องอ่านต่อไป");
        }
      }

      const recognizedSegments = [];
      const pageReports = [];
      let confidenceTotal = 0, confidenceCount = 0, retryCount = 0;
      async function recognizeVariant(item, mode) {
        const canvas = makeOcrCanvas(item, mode);
        try {
          const workerForThisPage = ocrWorker;
          let result;
          try {
            result = await withTimeout(
              workerForThisPage.recognize(canvas),
              180000,
              "อ่านภาพ " + item.name + " ใช้เวลานานเกิน 3 นาที ภาพอาจใหญ่เกินไปหรือ OCR ติดขัด"
            );
          } catch (error) {
            if (String(error && error.message || error).includes("นานเกิน 3 นาที")) {
              if (workerForThisPage) workerForThisPage.terminate().catch(() => {});
              if (ocrWorker === workerForThisPage) { ocrWorker = null; ocrWorkerLanguage = ""; }
            }
            throw error;
          }
          const data = result && result.data || {};
          return scoreOcrCandidate(data.text || "", data.confidence);
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
      }

      for (let index = 0; index < pending.length; index++) {
        const item = pending[index];
        say("กำลังอ่านภาพ " + (index + 1) + "/" + pending.length + " · " + item.name);
        let selected = await recognizeVariant(item, "balanced");
        let attempts = 1;
        let selectedMode = "ภาพมาตรฐาน";
        if (selected.confidence < 78 || selected.chars < 24) {
          retryCount++;
          say("ภาพ " + (index + 1) + " ความมั่นใจยังไม่สูง กำลังลองประมวลผลภาพอีกแบบ…");
          const alternate = await recognizeVariant(item, "binary");
          attempts = 2;
          if (alternate.score > selected.score) {
            selected = alternate;
            selectedMode = "ขาวดำเพิ่มความต่างระดับ";
          }
        }
        if (selected.text) recognizedSegments.push(selected.text);
        confidenceTotal += selected.confidence; confidenceCount++;
        pageReports.push({
          name: item.name,
          confidence: Math.round(selected.confidence),
          chars: selected.chars,
          attempts,
          chosen: selectedMode,
          low: selected.confidence < 70 || selected.chars < 24
        });
        if (ocrProgress) ocrProgress.style.width = Math.round((index + 1) / pending.length * 100) + "%";
      }
      const text = mergeOcrSegments(recognizedSegments);
      if (!text) throw new Error("ไม่พบข้อความที่อ่านได้ ลองครอปให้เหลือเฉพาะตัวอักษรหรือใช้ภาพที่คมชัดกว่า");
      ocrOutput.value = normalizeOcrText(text);
      ocrOutput.dispatchEvent(new Event("input", { bubbles: true }));
      const confidenceAverage = confidenceCount ? Math.round(confidenceTotal / confidenceCount) : null;
      renderOcrQuality(pageReports);
      const lowCount = pageReports.filter(page => page.low).length;
      say("OCR เสร็จแล้ว " + pending.length + " ภาพ · " + ocrOutput.value.length.toLocaleString() + " ตัวอักษร" +
        (confidenceAverage !== null ? " · ความมั่นใจเฉลี่ย " + confidenceAverage + "%" : "") +
        (retryCount ? " · ทดลองประมวลผลซ้ำ " + retryCount + " ภาพ" : "") +
        (lowCount ? " · มี " + lowCount + " ภาพที่ควรตรวจเทียบเป็นพิเศษ" : "") +
        " — ตรวจข้อความกับภาพต้นฉบับก่อนส่งไปวิเคราะห์");
      if (ocrProgress) ocrProgress.style.width = "100%";
    } catch (error) {
      say("OCR ไม่สำเร็จ: " + String(error && error.message || error));
    } finally {
      ocrBusy = false;
      ocrButton.disabled = false;
      ocrButton.textContent = buttonLabel;
      if (ocrProgressWrap) ocrProgressWrap.hidden = true;
    }
  });

  function sendOcrToAnalyzer(append) {
    if (!ocrRights || !ocrRights.checked) {
      say("โปรดยืนยันสิทธิ์ในการนำภาพมาแปลงเป็นข้อความก่อน");
      return;
    }
    const text = String(ocrOutput && ocrOutput.value || "").trim();
    if (!text) { say("ยังไม่มีข้อความ OCR ให้ส่งไปวิเคราะห์"); return; }
    const source = document.getElementById("src");
    if (!source) { say("ไม่พบช่องต้นฉบับของตัววิเคราะห์"); return; }
    source.value = append && source.value.trim()
      ? source.value.trim() + "\n\n" + text
      : text;
    source.dispatchEvent(new Event("input", { bubbles: true }));
    const analyzeButton = document.getElementById("go");
    if (analyzeButton) analyzeButton.click();
    say("ส่งข้อความ OCR ไปยังตัววิเคราะห์แล้ว ตรวจผลสรุปและแก้ข้อความได้ตามต้องการ");
    document.getElementById("work")?.scrollIntoView({ behavior: "smooth" });
  }
  document.getElementById("analyzer-image-analyze")?.addEventListener("click", () => sendOcrToAnalyzer(false));
  document.getElementById("analyzer-image-append")?.addEventListener("click", () => sendOcrToAnalyzer(true));

    render();
})();