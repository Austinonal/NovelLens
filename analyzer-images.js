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
    const scale=Math.min(1,1200/im.naturalWidth,2400/im.naturalHeight);
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
      const save=make("button",{type:"button",class:"sm"},"ครอปและบันทึกเข้าคลังภาพ");
      const saveDownload=make("button",{type:"button",class:"ghost sm"},"ดาวน์โหลดภาพครอป");
      const remove=make("button",{type:"button",class:"ghost sm"},"เอาออก");
      up.onclick=()=>{if(index>0){[pending[index-1],pending[index]]=[pending[index],pending[index-1]];render();}};
      down.onclick=()=>{if(index<pending.length-1){[pending[index+1],pending[index]]=[pending[index],pending[index+1]];render();}};
      reset.onclick=()=>{item.crop=null;overlay(item);say("รีเซ็ตกรอบแล้ว จะใช้ภาพเต็ม");};
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
        viewport,make("div",{class:"analyzer-image-tools"},up,down,reset,save,saveDownload,remove)));
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
  render();
})();