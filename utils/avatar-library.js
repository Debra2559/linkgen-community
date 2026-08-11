const avatarOptions = [
  { id: 'lin', label: '默认头像', path: '../../assets/avatars/avatar-lin.png' },
  { id: 'soda', label: '苏打', path: '../../assets/avatars/avatar-soda.png' },
  { id: 'aji', label: '阿吉', path: '../../assets/avatars/avatar-aji.png' },
  { id: 'mia', label: 'Mia', path: '../../assets/avatars/avatar-mia.png' },
  { id: 'nova', label: 'Nova', path: '../../assets/avatars/avatar-nova.png' },
  { id: 'xiaoyu', label: '小宇', path: '../../assets/avatars/avatar-xiaoyu.png' },
  { id: 'echo', label: 'Echo', path: '../../assets/avatars/avatar-echo.png' },
  { id: 'rex', label: 'Rex', path: '../../assets/avatars/avatar-rex.png' },
  { id: 'aria', label: 'Aria', group: '短发', path: '../../assets/avatars/avatar-aria.png' },
  { id: 'coco', label: '可可', group: '短发', path: '../../assets/avatars/avatar-coco.png' },
  { id: 'lulu', label: '露露', group: '长发', path: '../../assets/avatars/avatar-lulu.png' },
  { id: 'ryan', label: 'Ryan', group: '长发', path: '../../assets/avatars/avatar-ryan.png' },
  { id: 'vivi', label: 'Vivi', group: '长发', path: '../../assets/avatars/avatar-vivi.png' },
  { id: 'qiao', label: '乔乔', group: '中性', path: '../../assets/avatars/avatar-qiao.png' },
  { id: 'iris', label: 'Iris', group: '短发', path: '../../assets/avatars/avatar-iris.png' },
  { id: 'yuki', label: 'Yuki', group: '短发', path: '../../assets/avatars/avatar-yuki.png' },
  { id: 'momo', label: '沫沫', group: '短发', path: '../../assets/avatars/avatar-momo.png' },
  { id: 'kai', label: 'Kai', group: '中性', path: '../../assets/avatars/avatar-kai.png' },
  { id: 'tom', label: 'Tom', group: '短发', path: '../../assets/avatars/avatar-tom.png' },
  { id: 'jo', label: 'Jo', group: '中性', path: '../../assets/avatars/avatar-jo.png' },
];

function getAvatarPath(id) {
  const avatar = avatarOptions.find((item) => item.id === id) || avatarOptions[0];
  return avatar.path;
}

function getAvatarOptions() {
  return avatarOptions.slice();
}

module.exports = { avatarOptions, getAvatarPath, getAvatarOptions };
