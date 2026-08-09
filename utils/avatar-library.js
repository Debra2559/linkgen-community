const avatarOptions = [
  { id: 'lin', label: '小满', path: '../../assets/avatars/avatar-lin.png' },
  { id: 'soda', label: '苏打', path: '../../assets/avatars/avatar-soda.png' },
  { id: 'aji', label: '阿吉', path: '../../assets/avatars/avatar-aji.png' },
  { id: 'mia', label: 'Mia', path: '../../assets/avatars/avatar-mia.png' },
  { id: 'nova', label: 'Nova', path: '../../assets/avatars/avatar-nova.png' },
  { id: 'xiaoyu', label: '小宇', path: '../../assets/avatars/avatar-xiaoyu.png' },
  { id: 'echo', label: 'Echo', path: '../../assets/avatars/avatar-echo.png' },
  { id: 'rex', label: 'Rex', path: '../../assets/avatars/avatar-rex.png' },
];

function getAvatarPath(id) {
  const avatar = avatarOptions.find((item) => item.id === id) || avatarOptions[0];
  return avatar.path;
}

function getAvatarOptions() {
  return avatarOptions.slice();
}

module.exports = { avatarOptions, getAvatarPath, getAvatarOptions };
