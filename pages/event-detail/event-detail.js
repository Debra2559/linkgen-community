const { getEvents, saveEvents } = require('../../utils/linkgen-data');

Page({
  data: { event: null },
  onLoad(options) { this.id = options.id; this.refresh(); },
  refresh() { this.setData({ event: getEvents().find((item) => item.id === this.id) }); },
  toggleJoin() {
    const current = getEvents().find((item) => item.id === this.id);
    if (!current) return;
    const nextJoined = !current.joined;
    if (nextJoined && current.max && current.attendees >= current.max) return wx.showToast({ title: '活动报名已满', icon: 'none' });
    const attendees = Math.max(0, current.attendees + (nextJoined ? 1 : -1));
    const events = getEvents().map((item) => item.id === this.id ? { ...item, joined: nextJoined, attendees } : item);
    saveEvents(events);
    this.refresh();
    wx.showToast({ title: nextJoined ? '报名成功' : '已取消报名', icon: 'success' });
  },
});
