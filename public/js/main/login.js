(function(){
  const $ = (s)=>document.querySelector(s);
  $('#login').addEventListener('click', async ()=>{
    const id = $('#id').value.trim();
    const pw = $('#pw').value.trim();
    const msg = $('#msg');
    msg.textContent = '';
    if (!id || !pw){ msg.textContent = 'Email/username and password are required'; return; }
    if (pw.length < 6){ msg.textContent = 'Password must be at least 6 characters'; return; }
    try{
      const res = await API.post('/auth/login', { emailOrUsername: id, password: pw });
      if (res.token){ localStorage.setItem('token', res.token); window.location.href = '/chat.html'; }
    }catch(err){
      msg.textContent = err.message || 'Login failed';
    }
  });
})();
