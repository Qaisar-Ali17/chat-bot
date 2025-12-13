(function(){
  // state
  let currentUser = null;
  let socket = null;
  let authToken = null;
  let currentConversationId = null;

  // elements
  const authContent = document.getElementById('authContent');
  const authView = document.getElementById('authView');
  const chatView = document.getElementById('chatView');
  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');
  const userAvatarEl = document.getElementById('userAvatar');
  const convList = document.getElementById('convList');
  const previewRow = document.getElementById('previewRow');
  const messagesEl = document.getElementById('messages');
  const msgInput = document.getElementById('msgInput');
  const sendBtn = document.getElementById('sendBtn');
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');
  const logoutBtn = document.getElementById('logoutBtn');
  const themeBtn = document.getElementById('themeBtn');

  // render auth forms
  function renderSignup(){
    authContent.innerHTML = `
      <h1>Create your account</h1>
      <p class="lead">Join the chat — modern, secure, and fast.</p>
      <form id="signupForm" class="form" novalidate>
        <div class="input"><input name="name" autocomplete="name" placeholder="Full name" required /></div>
        <div class="input"><input name="email" type="email" autocomplete="email" placeholder="Email address" required /></div>
        <div class="input"><input name="password" type="password" autocomplete="new-password" placeholder="Password (min 6)" minlength="6" required /></div>
        <button class="btn" type="submit">Create account</button>
        <div id="msg" class="msg" role="status" aria-live="polite"></div>
        <p class="small">Already have an account? <a id="toLogin" class="link" href="#">Log in</a></p>
      </form>`;
    document.getElementById('toLogin').addEventListener('click',e=>{e.preventDefault(); renderLogin();});
    document.getElementById('signupForm').addEventListener('submit', onSignupSubmit);
  }

  function renderLogin(){
    authContent.innerHTML = `
      <h1>Welcome back</h1>
      <p class="lead">Log in to continue.</p>
      <form id="loginForm" class="form" novalidate>
        <div class="input"><input name="email" type="email" autocomplete="email" placeholder="Email" required /></div>
        <div class="input"><input name="password" type="password" autocomplete="current-password" placeholder="Password" required /></div>
        <div class="remember-me">
          <input name="rememberMe" type="checkbox" id="rememberMe">
          <label for="rememberMe">Remember me</label>
        </div>
        <button class="btn" type="submit">Sign in</button>
        <div id="msg" class="msg" role="status" aria-live="polite"></div>
        <p class="small">Don't have an account? <a id="toSignup" class="link" href="#">Sign up</a></p>
      </form>`;
    document.getElementById('toSignup').addEventListener('click',e=>{e.preventDefault(); renderSignup();});
    document.getElementById('loginForm').addEventListener('submit', onLoginSubmit);
  }

  // auth handlers
  async function onSignupSubmit(e){
    e.preventDefault();
    const form = e.target;
    const msg = document.getElementById('msg');
    msg.textContent = '';
    const payload = { username: form.name.value.trim(), email: form.email.value.trim(), password: form.password.value };
    try {
      const res = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), credentials:'same-origin' });
      const json = await res.json();
      if(res.ok){
        authToken = json.token;
        currentUser = json.user || { name: payload.username, email: payload.email };
        showChat();
      } else { msg.textContent = json.message || 'Signup failed'; }
    } catch(err){ console.error(err); msg.textContent = 'Network error'; }
  }

  async function onLoginSubmit(e){
    e.preventDefault();
    const form = e.target;
    const msg = document.getElementById('msg');
    msg.textContent = '';
    const payload = {
      emailOrUsername: form.email.value.trim(),
      password: form.password.value,
      rememberMe: form.rememberMe?.checked || false
    };
    try {
      const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), credentials:'same-origin' });
      const json = await res.json();
      if(res.ok){
        authToken = json.token;
        currentUser = json.user || { name: 'User', email: payload.emailOrUsername };
        showChat();
      } else { msg.textContent = json.message || 'Login failed'; }
    } catch(err){ console.error(err); msg.textContent = 'Network error'; }
  }

  // show views
  function showAuth(){ chatView.style.display='none'; authView.style.display='flex'; renderLogin(); }
  function showChat(){
    authView.style.display='none'; chatView.style.display='grid';
    // set header
    userNameEl.textContent = currentUser?.name || 'You';
    userEmailEl.textContent = currentUser?.email || '';
    userAvatarEl.textContent = initials(currentUser?.name || 'You');
    // load conversations, messages, and contacts
    loadConversationsAndMessages();
    loadContacts();
    initSocket();
  }

  // initials helper
  function initials(name){
    if(!name) return 'U';
    return name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
  }

  // auth header helper
  function getAuthHeaders(contentType = 'application/json'){
    const headers = { 'Content-Type': contentType };
    if(authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  }

  // load conv list and messages
  async function loadConversationsAndMessages(){
    convList.innerHTML = '';
    previewRow.innerHTML = '';
    messagesEl.innerHTML = '';
    try {
      // Load actual conversations from backend
      const res = await fetch('/api/conversations', { headers: getAuthHeaders(), credentials:'same-origin' });
      if(res.status === 401){ // not authenticated
        showAuth(); return;
      }
      const json = await res.json();
      const convs = json.conversations || [];

      // Sort conversations by updatedAt (most recent first)
      convs.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      // Create conversation list with proper previews
      convs.forEach(convo => {
        const div = document.createElement('div');
        div.className='item';
        div.dataset.conversationId = convo._id;

        // Find the other participant (not current user)
        const otherParticipant = convo.participants.find(p => String(p._id) !== String(currentUser?._id));
        const participantName = otherParticipant?.username || otherParticipant?.email || 'Unknown';
        const lastMessage = convo.lastMessage || { text: 'No messages yet', createdAt: convo.createdAt };

        div.innerHTML = `
          <div class="meta">
            <div class="avatar">${initials(participantName)}</div>
            <div style="min-width:0">
              <div class="name">${escapeHtml(participantName)}</div>
              <div class="preview-text">${escapeHtml(lastMessage.text)}</div>
            </div>
          </div>
          <div class="ts small">${new Date(lastMessage.createdAt).toLocaleTimeString()}</div>
        `;
        convList.appendChild(div);

        // add click to load messages for this conversation
        div.addEventListener('click', ()=> loadConversationMessages(convo._id, participantName));
      });

      // preview avatars
      const previewConvos = convs.slice(0,6);
      previewConvos.forEach(convo => {
        const otherParticipant = convo.participants.find(p => String(p._id) !== String(currentUser?._id));
        const participantName = otherParticipant?.username || otherParticipant?.email || 'Unknown';
        const a = document.createElement('div');
        a.className='avatar';
        a.textContent = initials(participantName);
        previewRow.appendChild(a);
      });

      // Load messages for first conversation if available
      if(convs.length > 0) {
        const firstConvo = convs[0];
        const otherParticipant = firstConvo.participants.find(p => String(p._id) !== String(currentUser?._id));
        const participantName = otherParticipant?.username || otherParticipant?.email || 'Unknown';
        loadConversationMessages(firstConvo._id, participantName);
      }
    } catch(err){ console.error('load conversations', err); }
  }

  // Load messages for a specific conversation
  async function loadConversationMessages(conversationId, participantName) {
    currentConversationId = conversationId;

    // Update header
    userNameEl.textContent = participantName;
    userAvatarEl.textContent = initials(participantName);
    userEmailEl.textContent = '';

    messagesEl.innerHTML = '';

    try {
      const res = await fetch(`/api/messages/${conversationId}`, { headers: getAuthHeaders(), credentials:'same-origin' });
      if(res.ok) {
        const json = await res.json();
        const msgs = json.messages || [];

        // Show messages in chronological order
        msgs.forEach(m => {
          const side = (String(m.author._id) === String(currentUser?._id)) ? 'right' : 'left';
          const senderName = side === 'right' ? (currentUser?.name || 'You') : participantName;
          addMessage(senderName, m.content || '', side, new Date(m.createdAt).toLocaleString(), m.attachments?.[0]);
        });
      }
    } catch(err) {
      console.error('load conversation messages', err);
    }
  }

  function showMessagesFrom(senderName, allMsgs){
    messagesEl.innerHTML='';
    const filtered = (allMsgs || []).filter(m => (m.senderName||'') === senderName);
    if(filtered.length===0) return;
    filtered.forEach(m => {
      const side = (m.senderName === currentUser?.name) ? 'right' : 'left';
      addMessage(m.senderName, m.text, side, new Date(m.createdAt).toLocaleString(), m.file);
    });
    // update header to show selected conversation
    document.getElementById('userName').textContent = senderName;
    document.getElementById('userAvatar').textContent = initials(senderName);
    document.getElementById('userEmail').textContent = (senderName === currentUser?.name) ? (currentUser?.email || '') : '';
  }

  // add message node
  function addMessage(senderName, text, side, ts, file, status = 'delivered'){
    const d = document.createElement('div');
    d.className = 'bubble ' + (side === 'right' ? 'right' : 'left');

    // Message content
    let contentHtml = `<div class="message-content">`;
    if(text) contentHtml += `${escapeHtml(text)}`;

    // Add quoted message display if this message has a quotedMessage
    // This would be enhanced in a full implementation
    contentHtml += `</div>`;

    // Message metadata (timestamp and status)
    let metaHtml = `<div class="message-meta">`;
    metaHtml += `<span class="message-time">${formatTime(ts)}</span>`;

    // Show status for sent messages
    if(side === 'right') {
      const statusIcon = getStatusIcon(status);
      metaHtml += `<span class="message-status ${status}">${statusIcon}</span>`;
    }
    metaHtml += `</div>`;

    // Sender name for received messages
    let senderHtml = '';
    if(side === 'left') {
      senderHtml = `<div class="message-sender">${escapeHtml(senderName)}</div>`;
    }

    // Combine all parts
    let inner = senderHtml + contentHtml;

    // File attachments
    if(file){
      inner += `<div class="message-attachment">`;
      if(file.thumbnail){
        inner += `<img src="${escapeHtml(file.thumbnail)}" class="attachment-thumbnail" />`;
      }
      inner += `<a href="${escapeHtml(file.url)}" target="_blank" rel="noopener noreferrer" class="attachment-link">Download attachment</a>`;
      inner += `</div>`;
    }

    inner += metaHtml;
    d.innerHTML = inner;
    messagesEl.appendChild(d);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Helper function to format timestamps
  function formatTime(dateString) {
    if(!dateString) return '';
    const date = new Date(dateString);
    // Format: 12:34 PM
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Helper function to get status icons
  function getStatusIcon(status) {
    switch(status) {
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      default: return '';
    }
  }

  // Add recipient selection UI
  function setupRecipientSelection() {
    const recipientSelect = document.createElement('select');
    recipientSelect.id = 'recipientSelect';
    recipientSelect.style.marginBottom = '10px';
    recipientSelect.style.width = '100%';
    recipientSelect.style.padding = '8px';
    recipientSelect.innerHTML = '<option value="">Select a contact...</option>';

    // Add before message input
    const msgInputParent = msgInput.parentNode;
    msgInputParent.insertBefore(recipientSelect, msgInput);

    return recipientSelect;
  }

  // Load contacts for recipient selection
  async function loadContacts() {
    try {
      const res = await fetch('/api/users', { headers: getAuthHeaders(), credentials:'same-origin' });
      if(res.ok) {
        const json = await res.json();
        const users = json.users || [];
        const recipientSelect = document.getElementById('recipientSelect') || setupRecipientSelection();

        // Clear existing options (keep placeholder)
        recipientSelect.innerHTML = '<option value="">Select a contact...</option>';

        // Add users as options
        users.forEach(user => {
          if(user._id !== currentUser?._id) {
            const option = document.createElement('option');
            option.value = user._id;
            option.textContent = user.username || user.email || 'Unknown User';
            recipientSelect.appendChild(option);
          }
        });

        return users;
      }
    } catch(err) {
      console.error('Failed to load contacts:', err);
      return [];
    }
  }

  // send message
  sendBtn.addEventListener('click', sendMessage);
  msgInput.addEventListener('keydown', e=>{ if(e.key==='Enter') sendMessage(); });

  async function sendMessage(){
    const v = msgInput.value.trim();
    if(!v && !fileInput.files.length) return;

    // Get selected recipient
    const recipientSelect = document.getElementById('recipientSelect');
    const recipientId = recipientSelect ? recipientSelect.value : null;

    if(!recipientId) {
      alert('Please select a recipient first');
      return;
    }

    // optimistic UI
    addMessage(currentUser?.name||'You', v, 'right', new Date().toLocaleTimeString());
    msgInput.value = '';

    // if file attached, send as FormData
    if(fileInput.files.length){
      const f = fileInput.files[0];
      const fd = new FormData();
      fd.append('file', f);
      if(v) fd.append('text', v);
      if(recipientId) fd.append('recipientId', recipientId);

      try{
        await fetch('/api/messages', { method:'POST', body:fd, credentials:'same-origin' });
      }catch(err){
        console.warn('file upload failed', err);
      } finally {
        fileInput.value = '';
      }
      return;
    }

    // try socket emit first
    if(socket && socket.connected){
      socket.emit('message:send', {
        text: v,
        recipientId: recipientId,
        conversationId: 'auto' // Let backend handle conversation creation
      });
    } else {
      // fallback: POST /api/messages with recipient
      try{
        await fetch('/api/messages', {
          method:'POST',
          headers:getAuthHeaders(),
          body: JSON.stringify({
            text: v,
            recipientId: recipientId
          }),
          credentials:'same-origin'
        });
      }catch(err){ console.warn('post fallback failed', err); }
    }
  }

  // attach button
  attachBtn.addEventListener('click', ()=> fileInput.click());
  fileInput.addEventListener('change', ()=> {
    if(fileInput.files.length) attachBtn.textContent = fileInput.files[0].name;
    else attachBtn.textContent = 'Attach';
  });

  // typing indicators
  msgInput.addEventListener('input', () => {
    if(socket && socket.connected && currentConversationId) {
      socket.emit('typing', { conversationId: currentConversationId });
    }
  });

  // Add typing indicator display
  function showTypingIndicator(username) {
    let typingEl = document.getElementById('typingIndicator');
    if(!typingEl) {
      const indicator = document.createElement('div');
      indicator.id = 'typingIndicator';
      indicator.style.padding = '8px';
      indicator.style.fontSize = '0.8em';
      indicator.style.color = '#666';
      indicator.style.fontStyle = 'italic';
      messagesEl.parentNode.insertBefore(indicator, messagesEl);
      typingEl = indicator;
    }

    typingEl.textContent = `${username} is typing...`;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if(typingEl.textContent.includes('is typing...')) {
        typingEl.textContent = '';
      }
    }, 3000);
  }

  // logout
  logoutBtn.addEventListener('click', async ()=>{
    try{ await fetch('/api/logout', { method:'POST', credentials:'same-origin' }); }catch(e){}
    currentUser = null;
    // reset header
    userNameEl.textContent = 'You'; userEmailEl.textContent=''; userAvatarEl.textContent='ME';
    showAuth();
  });

  // socket init
  function initSocket(){
    try{
      if(window.io){
        socket = io({ transports:['websocket','polling'] });
        socket.on('connect', ()=> console.log('socket connected', socket.id));
        socket.on('new-message', (m) => {
          addMessage(m.senderName || 'User', m.text || '', (m.senderName === currentUser?.name ? 'right' : 'left'), new Date(m.createdAt).toLocaleTimeString(), m.file);
        });
        socket.on('typing', (data) => {
          // Find username for the typing user
          const userId = data.userId;
          // For simplicity, we'll use a placeholder - in a real app you'd fetch the username
          showTypingIndicator(userId === currentUser?._id ? 'You' : 'Someone');
        });
      }
    }catch(e){ console.warn('socket init', e); }
  }

  // theme
  function applyTheme(dark){
    if(dark) document.documentElement.classList.add('theme-dark'); else document.documentElement.classList.remove('theme-dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }
  themeBtn.addEventListener('click', ()=> applyTheme(!document.documentElement.classList.contains('theme-dark')));
  (function initTheme(){ const s=localStorage.getItem('theme'); applyTheme(s ? s==='dark' : (window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches)); })();

  // check if already logged in (try /api/messages)
  (async function init(){
    // first, render login by default
    renderLogin();
    try {
      const res = await fetch('/api/messages', { headers: getAuthHeaders(), credentials:'same-origin' });
      if(res.status === 200){
        // user already authenticated; backend might return messages but not user info
        // try to fetch /api/me if exists, else try to read first message sender as name fallback
        currentUser = { name: 'You', email: '' };
        // attempt /api/auth/me
        try{
          const meRes = await fetch('/api/auth/me', { headers: getAuthHeaders(), credentials:'same-origin' });
          if(meRes.ok){ const me = await meRes.json(); currentUser = me.user || currentUser; }
        }catch(e){ /* ignore */ }
        showChat();
      } else {
        showAuth();
      }
    } catch(err){
      showAuth();
    }
  })();

  // helpers
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'})[m]); }
})();
