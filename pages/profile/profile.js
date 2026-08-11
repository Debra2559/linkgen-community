const { getProfile, getPosts, getEvents, seedLocalData } = require('../../utils/linkgen-data');

Page({
  data: { profile: { tags: [] }, stats: { posts: 0, events: 0, likes: 0 } },
  onLoad() { seedLocalData(); this.refresh(); },
  onShow() { this.refresh(); },
  refresh() {
    const profile = getProfile();
    const posts = getPosts().filter((item) => item.author === profile.name);
    const events = getEvents().filter((item) => item.organizer === profile.name || item.joined || item.calendarAdded);
    const likes = posts.reduce((sum, item) => sum + (item.likes || 0), 0);
    this.setData({ profile, stats: { posts: posts.length, events: events.length, likes } });
  },
  goEdit() { wx.navigateTo({ url: '/pages/edit-profile/edit-profile' }); },
  previewProfile() { wx.navigateTo({ url: '/pages/profile-preview/profile-preview' }); },
  goFeed() { wx.navigateTo({ url: '/pages/my-posts/my-posts' }); },
  goEvents() { wx.setStorageSync('linkgen_events_view_intent', 'mine'); wx.switchTab({ url: '/pages/events/events' }); },
  goContacts() { wx.switchTab({ url: '/pages/contacts/contacts' }); },
  goAdmin() { wx.navigateTo({ url: '/pages/admin-review/admin-review' }); },
});
