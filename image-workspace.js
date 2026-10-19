(() => {
  "use strict";
  // Crop and visual-library feature only. Image files never leave this browser tab.
  const input = rwGet("rw-image-input");
  const queue = rwGet("rw-image-queue");
  const status = rwGet("rw-image-status");
  let pending = [];
  let saved = [];
  let selectionOrder = [];
  let dbPromise = null;

  const say = message => { if (status) status.textContent = message; };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const safeFileName = value => String(value || "image").replace(/[\\/:*?"<>|]/g, "_");

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("เบราว์เซอร์นี้ไม่รองรับ IndexedDB"));
        return;
      }
      const request = indexedDB.open("NovelLensImageLibrary", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("เปิดคลังภาพไม่สำเร็จ"));
    });
    return dbPromise;
  }

  async function readAll() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction("assets", "readonly").objectStore("assets").getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error("อ่านคลังภาพไม่สำเร็จ"));
    });
  }

  async function putRecord(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("assets", "readwrite");
      tx.objectStore("assets").put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error("บันทึกภาพไม่สำเร็จ"));
      tx.onabort = () => reject(tx.error || new Error("การบันทึกถูกยกเลิก"));
    });
  }

  async function deleteRecord(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("assets", "readwrite");
      tx.objectStore("assets").delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error("ลบภาพไม่สำเร็จ"));
    });
  }

  function revoke(item) {
    if (item && item.url) URL.revokeObjectURL(item.url);
  }

  function drawPreview(item) {
    const image = item.image;
    const canvas = item.canvas;
    const scale = Math.min(1, 1200 / image.naturalWidth, 2400 / image.naturalHeight);
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  }

  function syncOverlay(item) {
    if (!item.canvas || !item.overlay) return;
    const crop = item.crop;
    const rect = item.canvas.getBoundingClientRect();
    if (!crop || !rect.width || !rect.height) {
      item.overlay.style.display = "none";
      return;
    }
    item.overlay.style.display = "block";
    item.overlay.style.left = (crop.x / item.canvas.width * rect.width) + "px";
    item.overlay.style.top = (crop.y / item.canvas.height * rect.height) + "px";
    item.overlay.style.width = (crop.w / item.canvas.width * rect.width) + "px";
    item.overlay.style.height = (crop.h / item.canvas.height * rect.height) + "px";
  }

  function installCropEvents(item) {
    let origin = null;
    const canvas = item.canvas;
    const point = event => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clamp((event.clientX - rect.left) / rect.width * canvas.width, 0, canvas.width),
        y: clamp((event.clientY - rect.top) / rect.height * canvas.height, 0, canvas.height)
      };
    };
    canvas.addEventListener("pointerdown", event => {
      event.preventDefault();
      origin = point(event);
      item.crop = { x: origin.x, y: origin.y, w: 0, h: 0 };
      if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
      syncOverlay(item);
    });
    canvas.addEventListener("pointermove", event => {
      if (!origin) return;
      const current = point(event);
      item.crop = {
        x: Math.min(origin.x, current.x),
        y: Math.min(origin.y, current.y),
        w: Math.abs(current.x - origin.x),
        h: Math.abs(current.y - origin.y)
      };
      syncOverlay(item);
    });
    const finish = () => {
      if (!origin) return;
      origin = null;
      if (!item.crop || item.crop.w < 8 || item.crop.h < 8) {
        item.crop = null;
        syncOverlay(item);
        say("ยกเลิกกรอบครอปแล้ว ภาพนี้จะใช้ภาพเต็ม");
      } else {
        say("เลือกกรอบครอปแล้วสำหรับ " + item.name);
      }
    };
    canvas.addEventListener("pointerup", finish);
    canvas.addEventListener("pointercancel", finish);
  }

  function cropToBlob(item) {
    return new Promise((resolve, reject) => {
      const image = item.image;
      const crop = item.crop;
      const preview = item.canvas;
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
      if (sw * sh > 45000000) {
        reject(new Error("กรอบมีพิกเซลมากเกินไป กรุณาครอปให้เล็กลง"));
        return;
      }
      const output = document.createElement("canvas");
      output.width = sw;
      output.height = sh;
      const context = output.getContext("2d");
      if (!context) {
        reject(new Error("สร้างภาพครอปไม่สำเร็จ"));
        return;
      }
      context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
      output.toBlob(blob => {
        output.width = 0;
        output.height = 0;
        if (blob) resolve({ blob, width: sw, height: sh });
        else reject(new Error("ส่งออกภาพ PNG ไม่สำเร็จ"));
      }, "image/png");
    });
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function renderQueue() {
    if (!queue) return;
    queue.replaceChildren();
    pending.forEach((item, index) => {
      const canvas = el("canvas", {
        class: "rw-img-preview",
        tabindex: "0",
        role: "img",
        "aria-label": "ภาพ " + item.name + " ลากเพื่อครอป"
      });
      item.canvas = canvas;
      drawPreview(item);
      const overlay = el("div", { class: "rw-img-selection" });
      item.overlay = overlay;
      const viewport = el("div", { class: "rw-img-viewport" }, canvas, overlay);
      installCropEvents(item);

      const up = el("button", { type: "button", class: "ghost sm" }, "↑ ขึ้น");
      const down = el("button", { type: "button", class: "ghost sm" }, "↓ ลง");
      up.disabled = index === 0;
      down.disabled = index === pending.length - 1;
      const reset = el("button", { type: "button", class: "ghost sm" }, "รีเซ็ตกรอบ");
      const save = el("button", { type: "button", class: "sm" }, "บันทึกภาพครอปเข้าคลัง");
      const download = el("button", { type: "button", class: "ghost sm" }, "ดาวน์โหลด PNG");
      const remove = el("button", { type: "button", class: "ghost sm" }, "เอาออก");

      up.onclick = () => {
        if (index > 0) {
          [pending[index - 1], pending[index]] = [pending[index], pending[index - 1]];
          renderQueue();
        }
      };
      down.onclick = () => {
        if (index < pending.length - 1) {
          [pending[index + 1], pending[index]] = [pending[index], pending[index + 1]];
          renderQueue();
        }
      };
      reset.onclick = () => {
        item.crop = null;
        syncOverlay(item);
        say("รีเซ็ตกรอบแล้ว ภาพนี้จะใช้ภาพเต็ม");
      };
      save.onclick = async () => {
        save.disabled = true;
        try {
          const result = await cropToBlob(item);
          const defaultTitle = item.name.replace(/\.[^.]+$/, "") + (item.crop ? "-crop" : "");
          const title = prompt("ตั้งชื่อภาพครอป", defaultTitle);
          if (title === null) return;
          const record = {
            id: "img-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
            kind: "image",
            title: title.trim() || "ภาพครอป",
            sourceName: item.name,
            blob: result.blob,
            width: result.width,
            height: result.height,
            createdAt: new Date().toISOString()
          };
          await putRecord(record);
          await renderLibrary();
          say("บันทึกภาพครอปเข้าคลังภาพแล้ว");
        } catch (error) {
          say("บันทึกภาพไม่สำเร็จ: " + String(error && error.message || error));
        } finally {
          save.disabled = false;
        }
      };
      download.onclick = async () => {
        try {
          const result = await cropToBlob(item);
          downloadBlob(result.blob, item.name.replace(/\.[^.]+$/, "") + (item.crop ? "-crop" : "") + ".png");
          say("สร้างไฟล์ PNG จากภาพที่เลือกแล้ว");
        } catch (error) {
          say("ส่งออกภาพไม่สำเร็จ: " + String(error && error.message || error));
        }
      };
      remove.onclick = () => {
        revoke(item);
        pending = pending.filter(candidate => candidate.id !== item.id);
        renderQueue();
        say("เอาภาพออกจากรายการชั่วคราวแล้ว");
      };

      const lowResolution = item.image.naturalWidth < 700;
      const card = el("article", { class: "rw-img-card" },
        el("div", { class: "rw-img-cardhead" },
          el("strong", {}, (index + 1) + ". " + item.name),
          el("span", { class: "rw-img-small" }, item.image.naturalWidth + " × " + item.image.naturalHeight + " px")
        ),
        lowResolution
          ? el("p", { class: "note", style: "color:var(--pen)" }, "ภาพแคบสำหรับอ่านข้อความละเอียด การครอปจะไม่คืนรายละเอียดที่ไม่มีในไฟล์ หากมี PNG ต้นฉบับความละเอียดสูงให้เลือกไฟล์นั้น")
          : null,
        el("p", { class: "note" }, "ลากกรอบบนภาพ · " + (item.crop ? "ใช้เฉพาะกรอบที่เลือก" : "ยังไม่เลือกกรอบ จะใช้ภาพเต็ม")),
        viewport,
        el("div", { class: "rw-img-tools" }, up, down, reset, save, download, remove)
      );
      queue.append(card);
      syncOverlay(item);
    });
  }

  input && input.addEventListener("change", async event => {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    if (!files.length) return;
    if (files.some(file => !["image/png", "image/jpeg", "image/webp"].includes(file.type))) {
      say("รองรับเฉพาะภาพ PNG, JPEG และ WebP");
      return;
    }
    if (pending.length + files.length > 20) {
      say("จำกัด 20 ภาพในรายการชั่วคราวเพื่อป้องกันการใช้หน่วยความจำมากเกินไป");
      return;
    }
    if (files.some(file => file.size > 20 * 1024 * 1024)) {
      say("ภาพแต่ละไฟล์ต้องมีขนาดไม่เกิน 20 MB");
      return;
    }
    let added = 0;
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const image = new Image();
      try {
        image.src = url;
        if (image.decode) await image.decode();
        else await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });
        if (!image.naturalWidth || !image.naturalHeight) throw new Error("ไฟล์ภาพว่าง");
        if (image.naturalWidth * image.naturalHeight > 35000000) {
          URL.revokeObjectURL(url);
          say("ข้าม " + file.name + " เพราะมีมากกว่า 35 ล้านพิกเซล");
          continue;
        }
        pending.push({
          id: "preview-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
          file, url, image, name: file.name, crop: null
        });
        added += 1;
      } catch (_) {
        URL.revokeObjectURL(url);
        say("เปิดภาพ " + file.name + " ไม่สำเร็จ");
      }
    }
    renderQueue();
    if (added) say("เพิ่มภาพ " + added + " ภาพแล้ว ลากกรอบครอป จากนั้นบันทึกแต่ละภาพเข้าคลังได้");
  });

  const clearButton = rwGet("rw-image-clear");
  clearButton && clearButton.addEventListener("click", () => {
    pending.forEach(revoke);
    pending = [];
    renderQueue();
    say("ล้างรายการภาพชั่วคราวแล้ว ภาพที่บันทึกเข้าคลังยังอยู่");
  });

  async function renderLibrary() {
    const root = rwGet("rw-image-library");
    if (!root) return;
    selectionOrder = [];
    try {
      saved = await readAll();
      saved.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      root.replaceChildren();
      if (!saved.length) {
        root.append(el("div", { class: "rw-empty" }, "ยังไม่มีภาพที่ครอปแล้ว บันทึกภาพจากรายการด้านบนเพื่อเพิ่มลงคลังภาพ"));
        return;
      }
      saved.forEach(item => {
        const checkbox = el("input", {
          type: "checkbox",
          "data-rw-image-select": item.id,
          "aria-label": "เลือก " + item.title
        });
        if (item.kind === "image") {
          const url = URL.createObjectURL(item.blob);
          const img = el("img", { src: url, alt: item.title });
          img.onload = () => URL.revokeObjectURL(url);
          const download = el("button", { type: "button", class: "ghost sm" }, "ดาวน์โหลด PNG");
          download.onclick = () => downloadBlob(item.blob, item.title.replace(/[\\/:*?"<>|]/g, "_") + ".png");
          const del = el("button", { type: "button", class: "ghost sm" }, "ลบ");
          del.onclick = async () => {
            if (!confirm("ลบภาพ " + item.title + " ออกจากคลังภาพหรือไม่?")) return;
            await deleteRecord(item.id);
            await renderLibrary();
          };
          root.append(el("article", { class: "rw-img-saved" },
            el("div", { class: "rw-img-savedhead" }, checkbox, img,
              el("div", {},
                el("h3", {}, item.title),
                el("p", {}, item.width + " × " + item.height + " px"),
                el("p", {}, "จาก: " + item.sourceName),
                el("p", {}, "บันทึก " + new Date(item.createdAt).toLocaleString())
              )
            ),
            el("div", { class: "rw-img-tools" }, download, del)
          ));
        } else {
          const gallery = el("div", { class: "rw-img-gallery" });
          gallery.hidden = true;
          const open = el("button", { type: "button", class: "ghost sm" }, "ดูภาพในชุด");
          open.onclick = () => {
            gallery.replaceChildren();
            for (const imageId of item.imageIds || []) {
              const source = saved.find(candidate => candidate.id === imageId && candidate.kind === "image");
              if (!source) continue;
              const url = URL.createObjectURL(source.blob);
              const img = el("img", { src: url, alt: source.title });
              img.onload = () => URL.revokeObjectURL(url);
              gallery.append(el("figure", {}, img, el("figcaption", {}, source.title)));
            }
            gallery.hidden = !gallery.hidden;
          };
          const del = el("button", { type: "button", class: "ghost sm" }, "ลบชุด");
          del.onclick = async () => {
            if (!confirm("ลบชุดภาพนี้หรือไม่? ภาพเดิมจะไม่ถูกลบ")) return;
            await deleteRecord(item.id);
            await renderLibrary();
          };
          root.append(el("article", { class: "rw-img-saved" },
            el("div", { class: "rw-img-savedhead" }, checkbox,
              el("div", {},
                el("h3", {}, item.title),
                el("p", {}, (item.imageIds || []).length + " ภาพในชุด"),
                el("p", {}, "สร้าง " + new Date(item.createdAt).toLocaleString())
              )
            ),
            el("div", { class: "rw-img-tools" }, open, del),
            gallery
          ));
        }
      });
      root.querySelectorAll("[data-rw-image-select]").forEach(box => {
        box.addEventListener("change", () => {
          const id = box.dataset.rwImageSelect;
          selectionOrder = selectionOrder.filter(existing => existing !== id);
          if (box.checked) selectionOrder.push(id);
        });
      });
    } catch (error) {
      root.replaceChildren(el("p", { class: "note" }, "เปิดคลังภาพไม่สำเร็จ: " + String(error && error.message || error)));
    }
  }

  const refreshButton = rwGet("rw-image-refresh");
  refreshButton && refreshButton.addEventListener("click", renderLibrary);

  const groupButton = rwGet("rw-image-group");
  groupButton && groupButton.addEventListener("click", async () => {
    const checked = [...document.querySelectorAll("[data-rw-image-select]:checked")].map(box => box.dataset.rwImageSelect);
    const ordered = [
      ...selectionOrder.filter(id => checked.includes(id)),
      ...checked.filter(id => !selectionOrder.includes(id))
    ];
    const byId = new Map(saved.map(item => [item.id, item]));
    const picked = ordered.map(id => byId.get(id)).filter(Boolean);
    if (picked.length < 2) {
      say("เลือกอย่างน้อย 2 ภาพหรือชุดภาพก่อนจัดเป็นชุด");
      return;
    }
    const title = prompt("ตั้งชื่อชุดภาพ", "ชุดภาพ " + picked.map(item => item.title).slice(0, 3).join(" + "));
    if (title === null) return;
    const imageIds = [];
    for (const item of picked) {
      if (item.kind === "image") imageIds.push(item.id);
      else imageIds.push(...(item.imageIds || []));
    }
    const record = {
      id: "imgset-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      kind: "collection",
      title: title.trim() || "ชุดภาพ",
      imageIds: [...new Set(imageIds)],
      createdAt: new Date().toISOString()
    };
    try {
      await putRecord(record);
      await renderLibrary();
      say("สร้างชุดภาพแล้ว " + record.imageIds.length + " ภาพ · ภาพเดิมยังอยู่ในคลัง");
    } catch (error) {
      say("สร้างชุดภาพไม่สำเร็จ: " + String(error && error.message || error));
    }
  });

  renderLibrary();
})();