const { getProfile } = require('../../utils/linkgen-data');
const { getThemeMode } = require('../../utils/theme');

const PREVIEW_KEY = 'linkgen_profile_preview_v1';

function normalizePreview(profile) {
  const name = profile.name || '你的昵称';
  return {
    ...profile,
    name,
    initials: profile.initials || name.slice(0, 1),
    role: profile.role || '身份待填写',
    city: profile.city || '',
    bio: profile.bio || '还没有写介绍，回去补充一句吧。',
    purpose: profile.purpose || '还没有填写加入社群的目的。',
    tags: profile.tags || [],
    color: profile.color || '#e77b61',
  };
}

Page({
  data: { themeMode: getThemeMode(), profile: normalizePreview({}), isDraft: false },
  onLoad(options) {
    const isDraft = options.draft === '1';
    const profile = isDraft ? wx.getStorageSync(PREVIEW_KEY) || getProfile() : getProfile();
    this.setData({ profile: normalizePreview(profile), isDraft });
  },
  goBack() { wx.navigateBack(); },
  goEdit() {
    if (this.data.isDraft) return wx.navigateBack();
    wx.navigateTo({ url: '/pages/edit-profile/edit-profile' });
  },
  onUnload() { if (this.data.isDraft) wx.removeStorageSync(PREVIEW_KEY); },
});
