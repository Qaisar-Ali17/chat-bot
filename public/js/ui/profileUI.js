const ProfileUI = (() => {
  const $ = (s) => document.querySelector(s);

  function createProfileModal() {
    const modal = document.createElement('div');
    modal.className = 'profile-modal';
    modal.id = 'profileModal';
    modal.innerHTML = `
      <div class="profile-content">
        <div class="profile-header">
          <h3>Your Profile</h3>
          <button class="close-btn" id="closeProfile">×</button>
        </div>
        <img class="profile-avatar" id="profileAvatar" src="/images/default-avatar.png" alt="Profile">
        <input type="file" class="avatar-upload" id="avatarUpload" accept="image/jpeg,image/png">
        <div class="profile-form">
          <button class="profile-btn" id="updateAvatarBtn">Update Avatar</button>
          <button class="profile-btn" id="removeAvatarBtn">Remove Avatar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Add event listeners
    $('#closeProfile').addEventListener('click', () => modal.style.display = 'none');
    $('#profileAvatar').addEventListener('click', () => $('#avatarUpload').click());
    $('#avatarUpload').addEventListener('change', handleAvatarUpload);
    $('#updateAvatarBtn').addEventListener('click', handleAvatarUpdate);
    $('#removeAvatarBtn').addEventListener('click', handleAvatarRemove);

    return modal;
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await API.uploadProfile(file);
      const avatarUrl = result.file.url;
      $('#profileAvatar').src = avatarUrl;
      showMessage('Avatar uploaded successfully!', 'success');
    } catch (err) {
      showMessage(err.message || 'Failed to upload avatar', 'error');
    }
    e.target.value = '';
  }

  async function handleAvatarUpdate() {
    const avatarUrl = $('#profileAvatar').src;
    if (avatarUrl === '/images/default-avatar.png') {
      showMessage('Please upload an avatar first', 'error');
      return;
    }

    try {
      await API.updateProfile({ avatarUrl });
      showMessage('Profile updated successfully!', 'success');
      setTimeout(() => $('#profileModal').style.display = 'none', 1000);
    } catch (err) {
      showMessage(err.message || 'Failed to update profile', 'error');
    }
  }

  async function handleAvatarRemove() {
    try {
      await API.updateProfile({ avatarUrl: '' });
      $('#profileAvatar').src = '/images/default-avatar.png';
      showMessage('Avatar removed successfully!', 'success');
    } catch (err) {
      showMessage(err.message || 'Failed to remove avatar', 'error');
    }
  }

  function showMessage(message, type) {
    const msgElement = document.createElement('div');
    msgElement.textContent = message;
    msgElement.style.color = type === 'error' ? 'var(--warn)' : 'var(--success)';
    msgElement.style.marginTop = '10px';
    msgElement.style.textAlign = 'center';
    $('#profileModal .profile-form').appendChild(msgElement);
    setTimeout(() => msgElement.remove(), 3000);
  }

  function showProfile(user) {
    const modal = $('#profileModal') || createProfileModal();
    $('#profileAvatar').src = user.avatarUrl || '/images/default-avatar.png';
    modal.style.display = 'flex';
  }

  function createUserAvatar(user) {
    const avatar = document.createElement('img');
    avatar.className = 'user-avatar';
    avatar.src = user.avatarUrl || '/images/default-avatar.png';
    avatar.alt = user.username;
    avatar.title = user.username;
    return avatar;
  }

  function createMessageAvatar(user) {
    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = user.avatarUrl || '/images/default-avatar.png';
    avatar.alt = user.username;
    avatar.title = user.username;
    return avatar;
  }

  return {
    showProfile,
    createUserAvatar,
    createMessageAvatar
  };
})();
