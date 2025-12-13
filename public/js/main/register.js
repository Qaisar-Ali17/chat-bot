(function(){
  const $ = (s)=>document.querySelector(s);

  // Avatar upload functionality
  $('#registerAvatar').addEventListener('click', () => $('#registerAvatarUpload').click());
  $('#registerAvatarUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await API.uploadProfile(file);
      $('#registerAvatar').src = result.file.url;
    } catch (err) {
      $('#msg').textContent = err.message || 'Failed to upload avatar';
    }
    e.target.value = '';
  });

  $('#register').addEventListener('click', async ()=>{
    const email = $('#email').value.trim();
    const username = $('#username').value.trim();
    const pw = $('#pw').value.trim();
    const avatarUrl = $('#registerAvatar').src !== '/images/default-avatar.png' ? $('#registerAvatar').src : '';
    const msg = $('#msg'); msg.textContent = '';
    if (!email || !username || !pw){ msg.textContent = 'All fields are required'; return; }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)){ msg.textContent = 'Enter a valid email'; return; }
    if (username.length < 3){ msg.textContent = 'Username must be at least 3 chars'; return; }
    if (pw.length < 6){ msg.textContent = 'Password must be at least 6 chars'; return; }
    try{
      const res = await API.post('/auth/register', { email, username, password: pw, avatarUrl });
      if (res.token){ localStorage.setItem('token', res.token); window.location.href = '/chat.html'; }
    }catch(err){
      msg.textContent = err.message || 'Register failed';
    }
  });
})();
