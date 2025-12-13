const ChatUI = (() => {
  let lastDateShown = null;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&',
      '<': '<',
      '>': '>',
      '"': '"',
      '\'': '&#39;'
    }[c]));
  }

  function fmtTime(iso) {
    const d = new Date(iso);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  function getDateKey(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function createDateSeparator(dateText) {
    const sep = document.createElement('div');
    sep.className = 'date-separator';
    const text = document.createElement('span');
    text.className = 'date-separator-text';
    text.textContent = dateText;
    sep.appendChild(text);
    return sep;
  }

  const attachmentLabel = (m) => (m.attachments && m.attachments.length) ? 'Sent an attachment' : 'Start the conversation';

  function buildConversationAvatar(convo) {
    if (convo.type === 'DIRECT' && Array.isArray(convo.participants)) {
      const other = convo.participants.find(p => p._id && p._id.toString() !== window.__currentUserId);
      if (other) {
        const avatar = ProfileUI.createUserAvatar(other);
        avatar.classList.add('room-avatar');
        return avatar;
      }
    }
    const fallback = document.createElement('div');
    fallback.className = 'room-avatar fallback-avatar';
    const title = (convo.title || 'Group').trim();
    fallback.textContent = title ? title[0].toUpperCase() : 'G';
    return fallback;
  }

  function renderConversations(list, activeId) {
    const box = document.querySelector('#conversations');
    box.innerHTML = '';
    if (!list.length) {
      box.innerHTML = '<div class="muted">No conversations. Click + New.</div>';
      return;
    }
    list.forEach(c => {
      const div = document.createElement('div');
      div.className = 'room' + (c._id === activeId ? ' active' : '');
      const avatar = buildConversationAvatar(c);

      const body = document.createElement('div');
      body.className = 'room-body';

      const top = document.createElement('div');
      top.className = 'room-top';
      const titleSpan = document.createElement('div');
      titleSpan.className = 'room-title-text';
      titleSpan.textContent = c.type === 'DIRECT'
        ? (c.participants?.find(p => p._id && p._id.toString() !== window.__currentUserId)?.username || 'Direct')
        : (c.title || 'Group');
      const typePill = document.createElement('span');
      typePill.className = 'room-type';
      typePill.textContent = c.type === 'DIRECT' ? 'Direct' : 'Group';
      top.appendChild(titleSpan);
      top.appendChild(typePill);

      const preview = document.createElement('div');
      preview.className = 'room-preview';
      if (c.lastMessage) {
        const author = c.lastMessage.author?.username || 'Someone';
        const summary = c.lastMessage.content?.trim() || attachmentLabel(c.lastMessage);
        preview.textContent = `${author}: ${summary}`;
      } else {
        preview.textContent = 'No messages yet';
      }

      const meta = document.createElement('div');
      meta.className = 'room-meta';
      const time = document.createElement('span');
      time.className = 'room-time';
      const ts = c.lastMessage?.createdAt || c.updatedAt || c.createdAt;
      time.textContent = ts ? fmtTime(ts) : '';
      const unread = Number(c.unreadCount || 0);
      if (unread > 0) {
        const badge = document.createElement('span');
        badge.className = 'unread-badge';
        badge.textContent = unread > 99 ? '99+' : unread;
        meta.appendChild(badge);
      }
      if (time.textContent) meta.appendChild(time);

      body.appendChild(top);
      body.appendChild(preview);
      body.appendChild(meta);

      div.appendChild(avatar);
      div.appendChild(body);
      div.onclick = () => window.__joinConversation(c._id, c);
      box.appendChild(div);
    });
  }

  function renderMessages(msgs, me) {
    const box = document.querySelector('#messages');
    box.innerHTML = '';
    lastDateShown = null;
    if (!msgs.length) {
      box.innerHTML = '<div class="muted">No messages yet. Say hi 👋</div>';
      return;
    }
    msgs.forEach(m => {
      const msgDate = m.createdAt || new Date().toISOString();
      const dateKey = getDateKey(msgDate);
      if (lastDateShown !== dateKey) {
        lastDateShown = dateKey;
        box.appendChild(createDateSeparator(fmtDate(msgDate)));
      }
      appendMessageToBox(box, m, me);
    });
    // Smooth scroll to bottom after rendering
    setTimeout(() => {
      box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    }, 50);
  }

  function appendMessageToBox(box, m, me) {
    const authorId = (m.author && m.author._id) ? m.author._id : (m.author || '');
    const isMe = String(authorId) === String(me?.user?.id);
    const wrap = document.createElement('div');
    wrap.className = 'msg message-animate' + (isMe ? ' me' : '');
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'flex-end';
    wrap.style.gap = '10px';
    wrap.style.marginBottom = '10px';

    if (!isMe && m.author) {
      const avatar = ProfileUI.createMessageAvatar(m.author);
      wrap.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const header = document.createElement('div');
    header.innerHTML = `<span class="name">${isMe ? 'You' : escapeHtml(m.author?.username || '')}</span>`;
    bubble.appendChild(header);
    if (m.content) {
      const p = document.createElement('div');
      p.className = 'message-content';
      p.textContent = m.content;
      bubble.appendChild(p);
    }
    if (m.attachments && m.attachments.length) {
      const att = document.createElement('div');
      att.className = 'attachments';
      m.attachments.forEach(f => att.appendChild(renderAttachmentThumb(f)));
      bubble.appendChild(att);
    }
    
    // Timestamp in meta
    const meta = document.createElement('div');
    meta.className = 'meta';
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = fmtTime(m.createdAt || new Date());
    meta.appendChild(timestamp);
    bubble.appendChild(meta);
    wrap.appendChild(bubble);

    if (isMe && me.user) {
      const avatar = ProfileUI.createMessageAvatar(me.user);
      avatar.style.order = '1';
      wrap.appendChild(avatar);
    }

    box.appendChild(wrap);
  }

  function appendMessage(m, me) {
    const box = document.querySelector('#messages');
    const msgDate = m.createdAt || new Date().toISOString();
    const dateKey = getDateKey(msgDate);
    
    // Add date separator if day changed
    if (lastDateShown !== dateKey) {
      lastDateShown = dateKey;
      box.appendChild(createDateSeparator(fmtDate(msgDate)));
    }
    
    appendMessageToBox(box, m, me);
    
    // Smooth scroll to bottom after adding message
    setTimeout(() => {
      box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    }, 100);
  }

  function renderAttachmentThumb(f) {
    const div = document.createElement('div');
    div.className = 'thumb';
    if ((f.fileType || '').startsWith('image/')) {
      const img = document.createElement('img');
      img.src = f.url;
      img.alt = f.fileName;
      div.appendChild(img);
    }
    else if ((f.fileType || '').startsWith('video/')) {
      const vid = document.createElement('video');
      vid.src = f.url;
      vid.controls = true;
      div.appendChild(vid);
    }
    else {
      const a = document.createElement('a');
      a.href = f.url;
      a.download = f.fileName;
      a.textContent = `⬇ ${f.fileName} (${Math.round((f.fileSize || 0) / 1024)} KB)`;
      div.appendChild(a);
    }
    return div;
  }

  function setTyping(text) {
        const typingEl = document.querySelector('#typing');
        if (!text) {
                typingEl.innerHTML = '';
                return;
        }
        typingEl.innerHTML = `
                <span>${text}</span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
        `;
  }
  function setTitle(text) { document.querySelector('#roomTitle').textContent = text || 'Select a conversation'; }

  return { renderConversations, renderMessages, appendMessage, setTyping, setTitle };
})();
