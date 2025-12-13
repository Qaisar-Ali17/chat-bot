const API = (() => {
  const base = '/api';
  function headers(){
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  async function handle(res){
    let json;
    try { json = await res.json(); } catch (_) { json = { message: 'Unexpected response' }; }
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  }

  const get = (url) => fetch(base + url, { headers: headers(), credentials: 'same-origin' }).then(handle);
  const post = (url, body) => fetch(base + url, { method:'POST', headers: headers(), body: JSON.stringify(body), credentials: 'same-origin' }).then(handle);
  const del = (url) => fetch(base + url, { method:'DELETE', headers: headers(), credentials: 'same-origin' }).then(handle);
  const upload = async (file) => {
    const fd = new FormData(); fd.append('file', file);
    const token = localStorage.getItem('token');
    const res = await fetch(base + '/uploads/file', { method:'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd, credentials: 'same-origin' });
    return handle(res);
  };

  const uploadProfile = async (file) => {
    const fd = new FormData(); fd.append('file', file);
    const token = localStorage.getItem('token');
    const res = await fetch(base + '/uploads/profile', { method:'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd, credentials: 'same-origin' });
    return handle(res);
  };

  const updateProfile = async (data) => {
    const res = await fetch(base + '/users/profile', { method:'POST', headers: headers(), body: JSON.stringify(data), credentials: 'same-origin' });
    return handle(res);
  };
  return { get, post, del, upload, uploadProfile, updateProfile };
})();
