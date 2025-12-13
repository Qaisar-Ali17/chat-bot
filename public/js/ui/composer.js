const Composer = (()=>{
  const state = { pending: [] };

  async function onFilesPicked(files){
    for (const f of files){
      try{
        const { file } = await API.upload(f);
        state.pending.push(file);
      } catch(err){
        alert(`Upload failed: ${err.message || 'error'}`);
      }
    }
    renderAttachments();
  }

  function renderAttachments(){
    const cont = document.querySelector('#attachments');
    cont.innerHTML = '';
    state.pending.forEach(f => cont.appendChild(renderAttachmentThumb(f)));
  }

  function renderAttachmentThumb(f){
    const div = document.createElement('div'); div.className = 'thumb';
    if ((f.fileType||'').startsWith('image/')){ const img = document.createElement('img'); img.src = f.url; img.alt = f.fileName; div.appendChild(img); }
    else if ((f.fileType||'').startsWith('video/')){ const vid = document.createElement('video'); vid.src = f.url; vid.controls = true; div.appendChild(vid); }
    else { const a = document.createElement('a'); a.href = f.url; a.download = f.fileName; a.textContent = `⬇ ${f.fileName}`; div.appendChild(a); }
    return div;
  }

  function clear(){ state.pending = []; renderAttachments(); }
  function getPending(){ return state.pending.slice(); }

  return { onFilesPicked, clear, getPending };
})();
