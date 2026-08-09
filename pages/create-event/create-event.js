const { getEvents, saveEvents, getProfile } = require('../../utils/linkgen-data');
const { venueCategories, getVenueOptions } = require('../../utils/linkgen-venues');
const { detectSource, buildLocalDraft } = require('../../utils/linkgen-ingest');

const clampCount = (value) => Math.max(1, Math.min(9999, Number.parseInt(value, 10) || 1));

Page({
  data: {
    title: '', description: '', time: '', location: '', customLocation: '', expectedCount: '30', importUrl: '', importStatus: 'idle', importMeta: { sourceLabel: '', modeLabel: '', confidenceLabel: '' },
    types: [{ id: 'online', label: '线上分享', icon: '↗', note: '屏幕前见' }, { id: 'offline', label: '线下聚会', icon: '⌂', note: '一起见面' }],
    typeIndex: 0, isOffline: false, venueCategories, activeCategory: 'all', venueOptions: getVenueOptions(false, 'all'), selectedVenueId: '', isOfficial: false,
  },
  onLoad(options) { this.setData({ isOfficial: options && options.official === '1' }); },
  onTitle(e) { this.setData({ title: e.detail.value }); },
  onDescription(e) { this.setData({ description: e.detail.value }); },
  onTime(e) { this.setData({ time: e.detail.value }); },
  onExpectedCount(e) { this.setData({ expectedCount: e.detail.value.replace(/\D/g, '') }); },
  onImportUrl(e) { this.setData({ importUrl: e.detail.value, importStatus: 'idle', importMeta: { sourceLabel: '', modeLabel: '', confidenceLabel: '' } }); },
  selectType(e) {
    const typeIndex = Number(e.currentTarget.dataset.index);
    const isOffline = typeIndex === 1;
    this.setData({ typeIndex, isOffline, activeCategory: 'all', venueOptions: getVenueOptions(isOffline, 'all'), selectedVenueId: '', location: '', customLocation: '' });
  },
  selectCategory(e) {
    const activeCategory = e.currentTarget.dataset.key;
    this.setData({ activeCategory, venueOptions: getVenueOptions(true, activeCategory), selectedVenueId: '', location: '', customLocation: '' });
  },
  selectVenue(e) {
    const selectedVenueId = e.currentTarget.dataset.id;
    const venue = this.data.venueOptions.find((item) => item.id === selectedVenueId);
    this.setData({ selectedVenueId, location: `${venue.name} · ${venue.city}`, customLocation: '' });
  },
  onCustomLocation(e) {
    const customLocation = e.detail.value;
    this.setData({ customLocation, location: customLocation, selectedVenueId: customLocation ? 'custom' : '' });
  },
  increaseCount() { this.setData({ expectedCount: String(clampCount(Number(this.data.expectedCount) + 5)) }); },
  decreaseCount() { this.setData({ expectedCount: String(clampCount(Number(this.data.expectedCount) - 5)) }); },
  parseImport() {
    const source = detectSource(this.data.importUrl);
    if (!source) return wx.showToast({ title: '请输入公众号或小红书链接', icon: 'none' });
    const importUrl = this.data.importUrl;
    this.setData({ importStatus: 'processing' });
    setTimeout(() => {
      const draft = buildLocalDraft(importUrl);
      this.setData({ title: draft.title, description: draft.description, time: draft.time, location: draft.location, customLocation: '', expectedCount: draft.expectedCount, typeIndex: 0, isOffline: false, venueOptions: getVenueOptions(false, 'all'), selectedVenueId: '', importStatus: 'ready', importMeta: { sourceLabel: draft.sourceLabel, modeLabel: draft.modeLabel, confidenceLabel: draft.confidenceLabel } });
      wx.showToast({ title: `已识别${draft.sourceLabel}`, icon: 'success' });
    }, 450);
  },
  submit() {
    const { title, description, time, location, expectedCount, types, typeIndex, isOfficial, isOffline, selectedVenueId, activeCategory } = this.data;
    const rawCount = Number.parseInt(expectedCount, 10);
    const max = clampCount(expectedCount);
    if (!title.trim() || !description.trim() || !time.trim() || !location.trim()) return wx.showToast({ title: '请填写完整信息', icon: 'none' });
    if (!Number.isFinite(rawCount) || rawCount < 1) return wx.showToast({ title: '预计人数需大于 0', icon: 'none' });
    const dayMatch = time.match(/(\d{1,2})月(\d{1,2})/);
    const profile = getProfile();
    const events = getEvents();
    events.push({ id: `e-${Date.now()}`, day: dayMatch ? dayMatch[2] : '30', month: dayMatch ? `${dayMatch[1]}月` : '8月', type: types[typeIndex].label, typeId: types[typeIndex].id, title: title.trim(), description: description.trim(), time: time.trim(), location: location.trim(), locationMode: isOffline ? 'offline' : 'online', venueId: selectedVenueId, venueCategory: isOffline ? activeCategory : 'online', sourceUrl: this.data.importUrl.trim() || '', sourcePlatform: this.data.importMeta.sourceLabel || '', discoveryMode: this.data.importStatus === 'ready' ? 'link' : 'manual', attendees: 0, max, organizer: isOfficial ? 'LinkGen 官方' : profile.name, official: isOfficial, community: true, status: isOfficial ? '报名中' : '待审核', color: isOfficial ? '#f36b4f' : '#db9c4e', joined: false });
    saveEvents(events);
    wx.showToast({ title: isOfficial ? '活动已发布' : '已提交，等待审核', icon: 'success' });
    setTimeout(() => wx.switchTab({ url: '/pages/events/events' }), 650);
  },
});
