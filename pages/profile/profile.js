const { getProfile, getPosts, getEvents, seedLocalData } = require('../../utils/linkgen-data');

Page({
  data: { profile: { tags: [] }, stats: { posts: 0, events: 0, likes: 0 }, themeMode: wx.getStorageSync('linkgen_theme') || 'dark' },
  onLoad() { seedLocalData(); this.refresh(); },
  onShow() { this.refresh(); },
  refresh() {
    const profile = getProfile();
    const posts = getPosts().filter((item) => item.authorId ? item.authorId === profile.memberId : item.author === profile.name);
    const events = getEvents().filter((item) => item.organizer === profile.name || item.joined || item.calendarAdded);
    const likes = posts.reduce((sum, item) => sum + (item.likes || 0), 0);
    this.setData({ profile, stats: { posts: posts.length, events: events.length, likes } });
  },
  selectTheme(event) {
    const themeMode = event.currentTarget.dataset.theme;
    wx.setStorageSync('linkgen_theme', themeMode);
    getApp().applyTheme(themeMode);
    wx.showToast({ title: themeMode === 'dark' ? '已切换暗色' : '已切换亮色', icon: 'none' });
  },
  toggleTheme() {
    const themeMode = this.data.themeMode === 'dark' ? 'light' : 'dark';
    wx.setStorageSync('linkgen_theme', themeMode);
    getApp().applyTheme(themeMode);
  },
  goEdit() { wx.navigateTo({ url: '/pages/edit-profile/edit-profile' }); },
  previewProfile() { wx.navigateTo({ url: '/pages/profile-preview/profile-preview' }); },
  goFeed() { wx.navigateTo({ url: '/pages/my-posts/my-posts' }); },
  goEvents() { wx.setStorageSync('linkgen_events_view_intent', 'mine'); wx.switchTab({ url: '/pages/events/events' }); },
  goContacts() { wx.switchTab({ url: '/pages/contacts/contacts' }); },
  goAdmin() { wx.navigateTo({ url: '/pages/admin-review/admin-review' }); },
});
