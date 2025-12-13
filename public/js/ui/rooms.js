const RoomsUI = (()=>{
  function promptDirect(){
    const userId = (prompt('User ID to start a chat with', '') || '').trim();
    if (!userId) return null;
    return { type: 'DIRECT', participantIds: [userId] };
  }

  function promptGroup(){
    const title = (prompt('Group title', 'New Group') || '').trim();
    const raw = prompt('Participant user IDs (comma-separated)', '') || '';
    const participantIds = raw.split(',').map(s=>s.trim()).filter(Boolean);
    if (!participantIds.length) return null;
    return { type: 'GROUP', title, participantIds };
  }

  function promptAny(){
    const type = (prompt('Type: DIRECT or GROUP', 'DIRECT') || '').trim().toUpperCase();
    if (!type) return null;
    if (type === 'DIRECT') return promptDirect();
    if (type === 'GROUP') return promptGroup();
    alert('Type must be DIRECT or GROUP');
    return null;
  }

  return { promptDirect, promptGroup, promptAny };
})();
