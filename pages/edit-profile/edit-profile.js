const { getProfile, saveProfile } = require('../../utils/linkgen-data');
const { getAvatarOptions, getAvatarPath } = require('../../utils/avatar-library');
const { getTagOptions } = require('../../utils/tag-taxonomy');

const emptyProfile = { name: '', initials: '', role: '', city: '', bio: '', purpose: '', tags: [], color: '#e77b61' };

Page({
  data: { profile: emptyProfile, avatarOptions: [], tagChoices: [] },
  onLoad() {
    const profile = Object.assign({}, emptyProfile, getProfile());
    this.setData({ profile, avatarOptions: getAvatarOptions() }, () => this.syncTagChoices());
  },
  onName(e) { this.setData({ 'profile.name': e.detail.value, 'profile.initials': e.detail.value.slice(0, 1) }); },
  onRole(e) { this.setData({ 'profile.role': e.detail.value }); },
  onCity(e) { this.setData({ 'profile.city': e.detail.value }); },
  onBio(e) { this.setData({ 'profile.bio': e.detail.value }); },
  onPurpose(e) { this.setData({ 'profile.purpose': e.detail.value }); },
  chooseAvatar(e) {
    const avatarId = e.currentTarget.dataset.id;
    this.setData({ 'profile.avatarId': avatarId, 'profile.avatar': getAvatarPath(avatarId) });
  },
  chooseUpload() {
    const handleResult = (res) => {
      const tempPath = res.tempFiles ? res.tempFiles[0].tempFilePath : res.tempFilePaths[0];
      wx.saveFile({ tempFilePath: tempPath, success: (saved) => this.setData({ 'profile.avatarId': '', 'profile.avatar': saved.savedFilePath }), fail: () => this.setData({ 'profile.avatarId': '', 'profile.avatar': tempPath }) });
    };
    if (wx.chooseMedia) wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], success: handleResult });
    else wx.chooseImage({ count: 1, sourceType: ['album', 'camera'], success: handleResult });
  },
  previewProfile() {
    wx.setStorageSync('linkgen_profile_preview_v1', this.data.profile);
    wx.navigateTo({ url: '/pages/profile-preview/profile-preview?draft=1' });
  },
  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag;
    let tags = this.data.profile.tags.slice();
    if (tags.includes(tag)) tags = tags.filter((item) => item !== tag);
    else if (tags.length < 3) tags.push(tag);
    else return wx.showToast({ title: '最多选择 3 个标签', icon: 'none' });
    this.setData({ 'profile.tags': tags }, () => this.syncTagChoices());
  },
  syncTagChoices() {
    const tags = this.data.profile.tags || [];
    const tagOptions = getTagOptions();
    (tags || []).forEach((tag) => { if (!tagOptions.includes(tag)) tagOptions.push(tag); });
    this.setData({ tagChoices: tagOptions.map((label) => ({ label, selected: tags.includes(label) })) });
  },
  save() {
    const { profile } = this.data;
    if (!profile.name || !profile.role || !profile.city || !profile.purpose) return wx.showToast({ title: '请至少填写昵称、身份、城市和目的', icon: 'none' });
    saveProfile({ ...profile, setupComplete: true });
    wx.showToast({ title: '名片已更新', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 500);
  },
});
