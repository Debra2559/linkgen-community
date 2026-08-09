const { getEvents, seedLocalData } = require('../../utils/linkgen-data');

const pad = (value) => String(value).padStart(2, '0');
const weekNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

function normalizeEvent(item) {
  const dateKey = item.dateKey || `2026-${pad(String(item.month || '8月').replace('月', ''))}-${pad(item.day || 1)}`;
  const date = new Date(`${dateKey}T12:00:00`);
  const community = item.community !== false;
  return { ...item, community, scopeLabel: community ? '社区活动' : '社区外精选', dateKey, dateLabel: `${date.getMonth() + 1}月${date.getDate()}日`, weekLabel: weekNames[date.getDay()], timeShort: (item.time || '').split(' ')[1] || '待定', coverLabel: item.coverLabel || item.type.slice(0, 4) };
}

Page({
  data: {
    events: [], filteredEvents: [], timelineGroups: [], activeView: 'community', activeFilterKey: '', filterMenuOpen: false,
    filterValues: { type: 'all', location: 'all', status: 'upcoming' },
    filterLabels: { type: '类型', location: '地点', status: '即将举行' }, filterOptions: [],
    timelineTitle: '社区活动', timelineRange: 'AUG / SEP', emptyTitle: '这里还没有社区活动', emptyCopy: '创建一场活动，和社区成员见面',
  },
  onLoad() { seedLocalData(); this.refresh(); },
  onShow() { this.refresh(); },
  onPullDownRefresh() { this.refresh(); wx.stopPullDownRefresh(); },
  refresh() {
    const events = getEvents().map(normalizeEvent);
    const filteredEvents = this.applyFilters(events);
    const viewMeta = { community: { title: '社区活动', emptyTitle: '这里还没有社区活动', emptyCopy: '官方活动会持续更新，欢迎回来查看' }, featured: { title: '精彩活动', emptyTitle: '暂时没有社区外精选', emptyCopy: '官方会持续收集值得参加的公开活动' }, mine: { title: '我的活动', emptyTitle: '这里还没有你的活动', emptyCopy: '去社区活动里报名，或创建一场新活动' } }[this.data.activeView];
    this.setData({ events, filteredEvents, timelineGroups: this.groupEvents(filteredEvents), timelineTitle: viewMeta.title, emptyTitle: viewMeta.emptyTitle, emptyCopy: viewMeta.emptyCopy, timelineRange: this.getTimelineRange(filteredEvents) });
  },
  applyFilters(events) {
    const { type, location, status } = this.data.filterValues;
    return events.filter((item) => {
      const isOnline = item.locationMode ? item.locationMode === 'online' : item.type === '线上分享' || /会议|Zoom|线上/i.test(item.location || '');
      const typeMatch = type === 'all' || (type === 'online' && isOnline) || (type === 'offline' && !isOnline) || item.type === type;
      const locationMatch = location === 'all' || (location === 'online' && isOnline) || (item.location || '').includes(location);
      const statusMatch = status === 'all' || (status === 'upcoming' && item.status !== '已结束') || (status === 'ended' && item.status === '已结束');
      const viewMatch = this.data.activeView === 'community' ? item.community : this.data.activeView === 'featured' ? !item.community : item.joined || item.organizer === '林小满';
      return typeMatch && locationMatch && statusMatch && viewMatch;
    });
  },
  groupEvents(events) {
    const groups = {};
    events.sort((a, b) => `${a.dateKey} ${a.timeShort}`.localeCompare(`${b.dateKey} ${b.timeShort}`)).forEach((item) => {
      if (!groups[item.dateKey]) groups[item.dateKey] = { dateKey: item.dateKey, dateLabel: item.dateLabel, weekLabel: item.weekLabel, events: [] };
      groups[item.dateKey].events.push(item);
    });
    return Object.keys(groups).sort().map((key) => groups[key]);
  },
  getTimelineRange(events) { if (!events.length) return 'NO EVENTS'; const months = [...new Set(events.map((item) => item.dateKey.slice(5, 7)))]; return months.map((month) => `${month.replace(/^0/, '')}月`).join(' / '); },
  switchView(e) {
    this.setData({ activeView: e.currentTarget.dataset.view, activeFilterKey: '', filterMenuOpen: false, filterValues: { type: 'all', location: 'all', status: 'upcoming' }, filterLabels: { type: '类型', location: '地点', status: '即将举行' } }, () => this.refresh());
  },
  toggleFilterMenu(e) {
    const key = e.currentTarget.dataset.key;
    if (this.data.activeFilterKey === key && this.data.filterMenuOpen) return this.setData({ filterMenuOpen: false, activeFilterKey: '' });
    const optionMap = {
      type: [{ key: 'all', label: '全部类型' }, { key: 'online', label: '线上分享' }, { key: 'offline', label: '线下聚会' }, { key: '工作坊', label: '工作坊' }],
      location: [{ key: 'all', label: '全部地点' }, { key: 'online', label: '线上活动' }, { key: '北京', label: '北京' }, { key: '上海', label: '上海' }, { key: '深圳', label: '深圳' }, { key: '杭州', label: '杭州' }],
      status: [{ key: 'upcoming', label: '即将举行' }, { key: 'all', label: '全部状态' }, { key: 'ended', label: '已结束' }],
    };
    this.setData({ activeFilterKey: key, filterMenuOpen: true, filterOptions: optionMap[key] });
  },
  selectFilter(e) {
    const key = this.data.activeFilterKey; const value = e.currentTarget.dataset.value; const option = this.data.filterOptions.find((item) => item.key === value);
    this.setData({ [`filterValues.${key}`]: value, [`filterLabels.${key}`]: option.label, activeFilterKey: '', filterMenuOpen: false }, () => this.refresh());
  },
  openEvent(e) { wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${e.currentTarget.dataset.id}` }); },
  goCreate() { wx.navigateTo({ url: '/pages/create-event/create-event' }); },
});
