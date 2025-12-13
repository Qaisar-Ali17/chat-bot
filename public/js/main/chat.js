(async function(){
  const $ = (s)=>document.querySelector(s);
  const token = localStorage.getItem('token');
  if (!token) return (window.location.href = '/login.html');

  const me = await API.get('/auth/me');
  if (!me || !me.user) return (window.location.href = '/login.html');

  // Set current user ID for conversation rendering
  window.__currentUserId = me.user.id;

  // Set user avatar in header
  const userAvatar = document.getElementById('userAvatar');
  if (userAvatar) {
    userAvatar.src = me.user.avatarUrl || '/images/default-avatar.png';
  }

  const socket = SocketClient.connect(token);
  const state = { conversationId: null, conversations: [], me, blockTarget: null, blockStatus: 'unknown' };

  function roomTitle(convo){
    if (!convo) return 'Select a conversation';
    if (convo.type === 'DIRECT') {
      const other = convo.participants?.find(p => String(p?._id || p) !== String(me.user.id));
      return other?.username || 'Direct Message';
    }
    return convo.title || 'Group';
  }

  // global for room click handlers created in UI
  window.__joinConversation = async (id, convo) => {
    state.conversationId = id;
    state.blockTarget = resolveBlockTarget(convo);
    updateBlockButton();
    socket.emit('rooms:join', { conversationId: id });
    ChatUI.setTitle(roomTitle(convo));
    const data = await API.get(`/conversations`);
    state.conversations = data.conversations || [];
    ChatUI.renderConversations(state.conversations, id);
    const msgs = await API.get(`/messages/${id}?limit=30`);
    ChatUI.renderMessages(msgs.messages || [], me);
  };

  // load initial conversations
  const data = await API.get('/conversations');
  state.conversations = data.conversations || [];
  ChatUI.renderConversations(state.conversations, state.conversationId);
  loadStories();

  async function createConversation(cfg){
    cfg.type = (cfg.type || '').toUpperCase();
    if (!['DIRECT','GROUP'].includes(cfg.type)) { alert('Type must be DIRECT or GROUP'); return; }
    if (cfg.type === 'DIRECT' && (!cfg.participantIds || cfg.participantIds.length !== 1)) { alert('DIRECT conversation needs exactly one participant'); return; }
    try{
      const res = await API.post('/conversations', cfg);
      if (res.conversation){
        state.conversations.unshift(res.conversation);
        ChatUI.renderConversations(state.conversations, res.conversation._id);
        window.__joinConversation(res.conversation._id, res.conversation);
      }
    } catch(err){ alert(err.message || 'Failed to create'); }
  }

  const newConvBtn = $('#newConv');
  if (newConvBtn) newConvBtn.addEventListener('click', async () => {
    const cfg = RoomsUI.promptAny();
    if (cfg) createConversation(cfg);
  });

  const newChatBtn = $('#newChatBtn');
  if (newChatBtn) newChatBtn.addEventListener('click', async ()=>{
    const cfg = RoomsUI.promptDirect();
    if (cfg) createConversation(cfg);
  });

  const newGroupBtn = $('#newGroupBtn');
  if (newGroupBtn) newGroupBtn.addEventListener('click', async ()=>{
    const cfg = RoomsUI.promptGroup();
    if (cfg) createConversation(cfg);
  });

  // file picker
  $('#filePicker').addEventListener('change', async (e)=>{
    const files = Array.from(e.target.files || []);
    await Composer.onFilesPicked(files);
    e.target.value = '';
  });

  // typing
  let typingTimer;
  const input = $('#input');
  input.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }
  });
  input.addEventListener('input', ()=>{
    clearTimeout(typingTimer);
    if (state.conversationId){ typingTimer = setTimeout(()=> socket.emit('typing', { conversationId: state.conversationId }), 50); }
  });

  // send
  const sendBtn = $('#send');
  sendBtn.addEventListener('click', sendMessage);

  async function sendMessage(){
    const text = input.value.trim();
    const attachments = Composer.getPending();
    if (!state.conversationId || (!text && !attachments.length)) return;

    // Add send animation
    sendBtn.classList.add('send-animation');
    setTimeout(() => sendBtn.classList.remove('send-animation'), 200);

    try{
      const res = await API.post(`/messages/${state.conversationId}`, { content: text, attachments });
      if (res.message){
        input.value = ''; Composer.clear();
        ChatUI.appendMessage(res.message, me);

        // Smooth scroll to bottom with delay for animation
        const box = $('#messages');
        setTimeout(() => {
                box.scrollTo({
                        top: box.scrollHeight,
                        behavior: 'smooth'
                });
        }, 100);
      }
    }catch(err){ alert(err.message || 'Failed to send'); }
  }

  // socket events
  socket.on('message:new', ({ message }) => {
    const convId = message?.conversation?._id || (message?.conversation && message.conversation.toString ? message.conversation.toString() : String(message.conversation));
    if (convId !== state.conversationId) return;
    ChatUI.appendMessage(message, me);
    const box = $('#messages');
    setTimeout(() => {
            box.scrollTo({
                    top: box.scrollHeight,
                    behavior: 'smooth'
            });
    }, 100);
  });
  socket.on('typing', ({ userId }) => {
    if (!state.conversationId) return;
    ChatUI.setTyping('Someone is typing...');
    setTimeout(()=> ChatUI.setTyping(''), 800);
  });

  // profile button
  const profileBtn = $('#profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => ProfileUI.showProfile(me.user));
  }

  // logout
  $('#logout').addEventListener('click', ()=>{ localStorage.removeItem('token'); window.location.href = '/login.html'; });

  // block/unblock
  const blockBtn = $('#blockBtn');
  blockBtn.addEventListener('click', async ()=>{
    if (!state.blockTarget){ alert('Select a direct conversation to block/unblock'); return; }
    try{
      if (state.blockStatus === 'blocked'){
        await API.del(`/users/${state.blockTarget}/block`);
        state.blockStatus = 'unblocked';
      } else {
        await API.post(`/users/${state.blockTarget}/block`, {});
        state.blockStatus = 'blocked';
      }
      updateBlockButton();
    } catch(err){ alert(err.message || 'Block action failed'); }
  });

  function updateBlockButton(){
    if (!state.blockTarget){ blockBtn.disabled = true; blockBtn.textContent = 'Block'; return; }
    blockBtn.disabled = false;
    blockBtn.textContent = state.blockStatus === 'blocked' ? 'Unblock' : 'Block';
  }

  function resolveBlockTarget(convo){
    if (!convo || convo.type !== 'DIRECT' || !Array.isArray(convo.participants)) return null;
    const other = convo.participants.find(p => String(p?._id || p) !== String(me.user.id));
    return other ? (other._id || other) : null;
  }

  // stories
  async function loadStories(){
    try{
      const res = await API.get('/stories');
      const box = $('#stories'); box.innerHTML = '';
      (res.stories || []).forEach(s => {
        const d = document.createElement('div'); d.className = 'story';
        d.textContent = s.author?.username || 'User';
        box.appendChild(d);
      });
    }catch(err){ console.warn('stories', err); }
  }
  $('#addStory').addEventListener('click', ()=> $('#storyFile').click());
  $('#storyFile').addEventListener('change', async (e)=>{
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try{
      const media = [];
      for (const f of files){
        const { file } = await API.upload(f);
        media.push(file);
      }
      await API.post('/stories', { media });
      loadStories();
    }catch(err){ alert(err.message || 'Failed to add story'); }
    e.target.value = '';
  });
})();
