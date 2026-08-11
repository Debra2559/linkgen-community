const { getEvents, seedLocalData, getProfile } = require('../../utils/linkgen-data');
const { call, isCloudReady } = require('../../utils/cloud');

const CALENDAR_IDS_KEY = 'linkgen_calendar_event_ids';

const pad = (value) => String(value).padStart(2, '0');
const weekNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const weekShortNames = ['日', '一', '二', '三', '四', '五', '六'];

function parseDateKey(dateKey) { return new Date(`${dateKey}T12:00:00`); }
function toDateKey(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function addDays(date, amount) { const next = new Date(date); next.setDate(next.getDate() + amount); return next; }
function startOfWeek(date) { return addDays(date, -date.getDay()); }
function formatDateLabel(date) { return `${date.getMonth() + 1}月${date.getDate()}日`; }
function sortEvents(events) { return events.slice().sort((a, b) => `${a.dateKey} ${a.timeShort}`.localeCompare(`${b.dateKey} ${b.timeShort}`)); }
function dateFromEvent(item) {
  const date = new Date(item.startAt || item.dateKey || '');
  if (!Number.isNaN(date.getTime())) return date;
  const month = String(item.month || '8月').replace('月', '');
  return new Date(`2026-${pad(month)}-${pad(item.day || 1)}T12:00:00`);
}

function normalizeEvent(item) {
  const date = dateFromEvent(item);
  const dateKey = item.dateKey || toDateKey(date);
  const community = item.community !== false;
  const attendees = Number(item.attendees) || 0;
  const max = Number(item.max) || 0;
  const full = community && max > 0 && attendees >= max;
  const calendarIds = wx.getStorageSync(CALENDAR_IDS_KEY) || [];
  const timeMatch = String(item.time || '').match(/([0-2]?\d:[0-5]\d)/);
  return { ...item, community, attendees, max, full, calendarAdded: Boolean(item.calendarAdded || calendarIds.includes(item.id)), registrationUrl: item.registrationUrl || item.sourceUrl || '', status: full ? '已满' : item.status, scopeLabel: community ? '社区活动' : '社区外精选', dateKey, dateLabel: `${date.getMonth() + 1}月${date.getDate()}日`, weekLabel: weekNames[date.getDay()], timeShort: timeMatch ? timeMatch[1] : '待定', coverLabel: item.coverLabel || (item.type || '活动').slice(0, 4) };
}

Page({
  data: {
    events: [], filteredEvents: [], timelineGroups: [], activeView: 'community', activeFilterKey: '', filterMenuOpen: false,
    filterValues: { type: 'all', location: 'all', status: 'upcoming' },
    filterLabels: { type: '类型', location: '地点', status: '即将举行' }, filterOptions: [],
    timelineTitle: '社区活动', timelineRange: 'AUG / SEP', emptyTitle: '这里还没有社区活动', emptyCopy: '创建一场活动，和社区成员见面',
    calendarModes: [{ key: 'timeline', label: '时间轴' }, { key: 'day', label: '日' }, { key: 'week', label: '周' }, { key: 'month', label: '月' }], calendarMode: 'timeline', calendarCursor: '', calendarHeader: '', calendarCaption: '', calendarPeriodLabel: '', calendarDays: [], monthCells: [], weekShortNames, calendarListTitle: '', calendarEventCount: 0, calendarGroups: [], calendarEmptyTitle: '当天没有活动', calendarEmptyCopy: '换个日期看看，或回到时间轴浏览全部安排', cloudMode: false, cloudError: '', loading: false,
  },
  onLoad() { seedLocalData(); this.refresh(); },
  onShow() {
    const intent = wx.getStorageSync('linkgen_events_view_intent');
    if (intent) {
      wx.removeStorageSync('linkgen_events_view_intent');
      this.setData({ activeView: intent, activeFilterKey: '', filterMenuOpen: false, calendarCursor: '', filterValues: { type: 'all', location: 'all', status: 'upcoming' }, filterLabels: { type: '类型', location: '地点', status: '即将举行' } }, () => this.refresh());
      return;
    }
    this.refresh();
  },
  onPullDownRefresh() { this.refresh().finally(() => wx.stopPullDownRefresh()); },
  async refresh() {
    if (isCloudReady()) {
      this.setData({ loading: true });
      try {
        const result = await call('listPublishedEvents');
        this.renderEvents(result.events || [], true, '');
        return;
      } catch (error) {
        this.renderEvents(getEvents(), false, error.message || 'CloudBase 查询失败，当前为本地演示数据');
        return;
      }
    }
    this.renderEvents(getEvents(), false, '未连接 CloudBase，当前为本地演示数据');
  },
  renderEvents(rawEvents, cloudMode, cloudError) {
    const events = rawEvents.map(normalizeEvent);
    const filteredEvents = this.applyFilters(events);
    const viewMeta = { community: { title: '社区活动', emptyTitle: '这里还没有社区活动', emptyCopy: '官方活动会持续更新，欢迎回来查看' }, featured: { title: '精彩活动', emptyTitle: '暂时没有社区外精选', emptyCopy: '官方会持续收集值得参加的公开活动' }, mine: { title: '我的活动', emptyTitle: '这里还没有你的活动', emptyCopy: '去社区活动里报名，或创建一场新活动' } }[this.data.activeView];
    const calendarCursor = this.data.calendarCursor || (sortEvents(filteredEvents)[0] || {}).dateKey || toDateKey(new Date());
    const calendar = this.buildCalendar(filteredEvents, calendarCursor);
    this.setData({ events, filteredEvents, calendarCursor, timelineGroups: this.groupEvents(filteredEvents), timelineTitle: viewMeta.title, emptyTitle: viewMeta.emptyTitle, emptyCopy: viewMeta.emptyCopy, timelineRange: this.getTimelineRange(filteredEvents), cloudMode, cloudError, loading: false, ...calendar });
  },
  applyFilters(events) {
    const { type, location, status } = this.data.filterValues;
    return events.filter((item) => {
      const isOnline = item.locationMode ? item.locationMode === 'online' : item.type === '线上分享' || /会议|Zoom|线上/i.test(item.location || '');
      const typeMatch = type === 'all' || (type === 'online' && isOnline) || (type === 'offline' && !isOnline) || item.type === type;
      const locationMatch = location === 'all' || (location === 'online' && isOnline) || (item.location || '').includes(location);
      const statusMatch = status === 'all' || (status === 'upcoming' && item.status !== '已结束') || (status === 'ended' && item.status === '已结束');
      const profileName = getProfile().name;
      const viewMatch = this.data.activeView === 'community' ? item.community : this.data.activeView === 'featured' ? !item.community : item.joined || item.calendarAdded || (profileName && item.organizer === profileName);
      return typeMatch && locationMatch && statusMatch && viewMatch;
    });
  },
  groupEvents(events) {
    const groups = {};
    sortEvents(events).forEach((item) => {
      if (!groups[item.dateKey]) groups[item.dateKey] = { dateKey: item.dateKey, dateLabel: item.dateLabel, weekLabel: item.weekLabel, events: [] };
      groups[item.dateKey].events.push(item);
    });
    return Object.keys(groups).sort().map((key) => groups[key]);
  },
  buildCalendar(events, cursorKey) {
    const cursor = parseDateKey(cursorKey);
    const mode = this.data.calendarMode;
    if (mode === 'timeline') return { calendarHeader: '', calendarCaption: '', calendarPeriodLabel: '', calendarDays: [], monthCells: [], calendarListTitle: '', calendarEventCount: 0, calendarGroups: [] };
    if (mode === 'day') {
      const dayEvents = events.filter((item) => item.dateKey === cursorKey);
      return { calendarHeader: formatDateLabel(cursor), calendarCaption: `${weekNames[cursor.getDay()]} · ${dayEvents.length} 场活动`, calendarPeriodLabel: '单日', calendarDays: this.buildDayStrip(cursor, 5, events, cursorKey), monthCells: [], calendarListTitle: `${formatDateLabel(cursor)}活动`, calendarEventCount: dayEvents.length, calendarGroups: this.groupEvents(dayEvents) };
    }
    if (mode === 'week') {
      const start = startOfWeek(cursor); const end = addDays(start, 6); const weekEvents = events.filter((item) => item.dateKey >= toDateKey(start) && item.dateKey <= toDateKey(end));
      return { calendarHeader: `${formatDateLabel(start)} - ${formatDateLabel(end)}`, calendarCaption: `本周 ${weekEvents.length} 场活动`, calendarPeriodLabel: '一周', calendarDays: this.buildDayStrip(start, 7, events, cursorKey, 0), monthCells: [], calendarListTitle: '本周活动', calendarEventCount: weekEvents.length, calendarGroups: this.groupEvents(weekEvents) };
    }
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12); const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 12); const monthEvents = events.filter((item) => item.dateKey.slice(0, 7) === cursorKey.slice(0, 7));
    return { calendarHeader: `${cursor.getMonth() + 1}月`, calendarCaption: `本月 ${monthEvents.length} 场活动`, calendarPeriodLabel: `${cursor.getMonth() + 1}月`, calendarDays: [], monthCells: this.buildMonthCells(cursor, monthEvents, cursorKey), calendarListTitle: '本月活动', calendarEventCount: monthEvents.length, calendarGroups: this.groupEvents(monthEvents), calendarMonthStart: toDateKey(monthStart), calendarMonthEnd: toDateKey(monthEnd) };
  },
  buildDayStrip(startDate, count, events, cursorKey, startOffset = -Math.floor(count / 2)) {
    return Array.from({ length: count }, (_, index) => { const date = addDays(startDate, index + startOffset); const dateKey = toDateKey(date); const eventCount = events.filter((item) => item.dateKey === dateKey).length; return { dateKey, dayNumber: date.getDate(), weekShort: weekShortNames[date.getDay()], eventCount, isSelected: dateKey === cursorKey }; });
  },
  buildMonthCells(cursor, events, cursorKey) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12); const firstCell = addDays(monthStart, -monthStart.getDay()); const countMap = events.reduce((map, item) => { map[item.dateKey] = (map[item.dateKey] || 0) + 1; return map; }, {});
    return Array.from({ length: 42 }, (_, index) => { const date = addDays(firstCell, index); const dateKey = toDateKey(date); const inMonth = date.getMonth() === cursor.getMonth(); return { index, dateKey: inMonth ? dateKey : '', dayNumber: inMonth ? date.getDate() : '', eventCount: inMonth ? countMap[dateKey] || 0 : 0, isSelected: inMonth && dateKey === cursorKey, isEmpty: !inMonth }; });
  },
  getTimelineRange(events) { if (!events.length) return 'NO EVENTS'; const months = [...new Set(events.map((item) => item.dateKey.slice(5, 7)))]; return months.map((month) => `${month.replace(/^0/, '')}月`).join(' / '); },
  switchCalendarMode(e) { const mode = e.currentTarget.dataset.mode; this.setData({ calendarMode: mode }, () => this.refresh()); },
  moveCalendar(e) { const direction = Number(e.currentTarget.dataset.direction); const cursor = parseDateKey(this.data.calendarCursor || toDateKey(new Date())); const next = new Date(cursor); if (this.data.calendarMode === 'day') next.setDate(next.getDate() + direction); else if (this.data.calendarMode === 'week') next.setDate(next.getDate() + direction * 7); else { next.setDate(1); next.setMonth(next.getMonth() + direction); } this.setData({ calendarCursor: toDateKey(next) }, () => this.refresh()); },
  selectCalendarDate(e) { const dateKey = e.currentTarget.dataset.date; if (!dateKey) return; this.setData({ calendarCursor: dateKey }, () => this.refresh()); },
  switchView(e) {
    this.setData({ activeView: e.currentTarget.dataset.view, activeFilterKey: '', filterMenuOpen: false, calendarCursor: '', filterValues: { type: 'all', location: 'all', status: 'upcoming' }, filterLabels: { type: '类型', location: '地点', status: '即将举行' } }, () => this.refresh());
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
    this.setData({ [`filterValues.${key}`]: value, [`filterLabels.${key}`]: option.label, activeFilterKey: '', filterMenuOpen: false, calendarCursor: '' }, () => this.refresh());
  },
  openEvent(e) { wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${e.currentTarget.dataset.id}` }); },
  goCreate() { wx.navigateTo({ url: '/pages/create-event/create-event' }); },
});
