const { getEvents, saveEvents, getProfile, getMembers } = require('../../utils/linkgen-data');
const { call, isCloudReady } = require('../../utils/cloud');

const CALENDAR_IDS_KEY = 'linkgen_calendar_event_ids';

function normalizeDetailEvent(event) {
  if (!event) return null;
  const community = event.community !== false;
  const attendees = Number(event.attendees) || 0;
  const max = Number(event.max) || 0;
  const calendarIds = wx.getStorageSync(CALENDAR_IDS_KEY) || [];
  const member = getMembers().find((item) => item.id === event.organizerId || item.name === event.organizer);
  const organizerProfile = member ? { ...member, memberId: member.id } : {
    memberId: '',
    name: event.organizer || '活动主办方',
    initials: (event.organizer || '活').slice(0, 1),
    color: event.official ? '#10231f' : (event.color || '#db9c4e'),
    avatar: '',
    role: event.official ? 'LinkGen 社群官方' : '公开活动主办方',
    city: '',
    tags: event.official ? ['LinkGen 社群', '社区活动'] : [event.type || '活动', event.community ? '社区活动' : '公开活动'],
    bio: event.organizerIntro || (event.official ? '负责 LinkGen 社群活动的发起、组织和成员连接。' : '负责发布活动信息、维护活动安排和提供报名入口。'),
  };
  return {
    ...event,
    community,
    attendees,
    max,
    full: community && max > 0 && attendees >= max,
    calendarAdded: Boolean(event.calendarAdded || calendarIds.includes(event.id)),
    registrationUrl: event.registrationUrl || event.sourceUrl || '',
    articleSummary: event.articleSummary || event.summary || event.description || '',
    organizerProfile,
  };
}

Page({
  data: { event: null, linkPanel: '', organizerPanel: false, cloudMode: false, cloudError: '', loading: false },
  onLoad(options) { this.id = options.id; this.refresh(); },
  async refresh() {
    if (isCloudReady()) {
      this.setData({ loading: true });
      try {
        const result = await call('getPublishedEvent', { id: this.id });
        this.setData({ event: normalizeDetailEvent(result.event), cloudMode: true, cloudError: '', loading: false });
        return;
      } catch (error) {
        this.setData({ cloudError: error.message || 'CloudBase 查询失败，当前为本地演示数据' });
      }
    }
    const event = getEvents().find((item) => String(item.id) === String(this.id));
    this.setData({ event: normalizeDetailEvent(event), cloudMode: false, loading: false });
  },
  async toggleJoin() {
    const current = this.data.event || getEvents().find((item) => String(item.id) === String(this.id));
    if (!current || current.community === false) return;
    const nextJoined = !current.joined;
    if (nextJoined && !getProfile().setupComplete) return wx.showModal({ title: '先完成你的名片', content: '报名活动前，请先补充自己的身份信息。', confirmText: '去设置', success: (res) => { if (res.confirm) wx.navigateTo({ url: '/pages/edit-profile/edit-profile' }); } });
    if (nextJoined && current.max && current.attendees >= current.max) return wx.showToast({ title: '活动报名已满', icon: 'none' });
    if (this.data.cloudMode) {
      try {
        await call('registerForEvent', { eventId: this.id, action: nextJoined ? 'join' : 'cancel', setupComplete: getProfile().setupComplete === true });
        await this.refresh();
        wx.showToast({ title: nextJoined ? '报名成功' : '已取消报名', icon: 'success' });
      } catch (error) {
        wx.showToast({ title: error.message || '报名操作失败', icon: 'none' });
      }
      return;
    }
    const attendees = Math.max(0, current.attendees + (nextJoined ? 1 : -1));
    saveEvents(getEvents().map((item) => String(item.id) === String(this.id) ? { ...item, joined: nextJoined, attendees } : item));
    await this.refresh();
    wx.showToast({ title: nextJoined ? '报名成功' : '已取消报名', icon: 'success' });
  },
  openOrganizer() { this.setData({ organizerPanel: true }); },
  closeOrganizer() { this.setData({ organizerPanel: false }); },
  openOrganizerDirectory() {
    const memberId = this.data.event && this.data.event.organizerProfile && this.data.event.organizerProfile.memberId;
    if (!memberId) return;
    this.setData({ organizerPanel: false });
    wx.navigateTo({ url: `/pages/member-detail/member-detail?id=${memberId}` });
  },
  stopPropagation() {},
  toggleCalendar() {
    const current = this.data.event || getEvents().find((item) => String(item.id) === String(this.id));
    if (!current || current.community !== false) return;
    const calendarAdded = !current.calendarAdded;
    const ids = wx.getStorageSync(CALENDAR_IDS_KEY) || [];
    const nextIds = calendarAdded ? [...new Set(ids.concat(this.id))] : ids.filter((id) => String(id) !== String(this.id));
    wx.setStorageSync(CALENDAR_IDS_KEY, nextIds);
    if (!this.data.cloudMode) saveEvents(getEvents().map((item) => String(item.id) === String(this.id) ? { ...item, calendarAdded } : item));
    this.setData({ event: { ...current, calendarAdded } });
    wx.showToast({ title: calendarAdded ? '已加入我的日程' : '已移出我的日程', icon: 'success' });
  },
  openRegistration() {
    const url = this.data.event && this.data.event.registrationUrl;
    if (!url) return wx.showToast({ title: '报名链接待官方补充', icon: 'none' });
    wx.setClipboardData({ data: url, success: () => this.setData({ linkPanel: url }) });
  },
  copyRegistrationAgain() {
    if (!this.data.linkPanel) return;
    wx.setClipboardData({ data: this.data.linkPanel, success: () => wx.showToast({ title: '已再次复制', icon: 'success' }) });
  },
  closeLinkPanel() { this.setData({ linkPanel: '' }); },
  copySource() {
    const url = this.data.event && this.data.event.sourceUrl;
    if (!url) return wx.showToast({ title: '原文链接待补充', icon: 'none' });
    wx.setClipboardData({ data: url, success: () => wx.showToast({ title: '原文链接已复制', icon: 'success' }) });
  },
});
