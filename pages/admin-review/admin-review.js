const { getEvents, saveEvents } = require('../../utils/linkgen-data');

Page({
  data: { events: [], list: [], pendingCount: 0, activeFilter: 'pending', filters: [{ key: 'pending', label: '待审核' }, { key: 'all', label: '全部活动' }], agent: { status: '待运行', sources: ['微信公众号', '小红书'], keywords: 'AI / 产品 / 创作者', schedule: '每天 09:00', lastRun: '尚未运行' } },
  onLoad() { this.refresh(); },
  onShow() { this.refresh(); },
  refresh() { const events = getEvents(); this.setData({ events, pendingCount: events.filter((item) => item.status === '待审核').length }, this.filterList); },
  filterList() { this.setData({ list: this.data.events.filter((item) => this.data.activeFilter === 'all' || item.status === '待审核') }); },
  onFilter(e) { this.setData({ activeFilter: e.currentTarget.dataset.key }, this.filterList); },
  runAgent() {
    if (this.data.agent.status === '搜索中') return;
    this.setData({ 'agent.status': '搜索中' });
    setTimeout(() => {
      const existing = getEvents();
      const now = Date.now();
      const candidates = [
        { id: `agent-${now}`, day: '14', month: '9月', type: '线下聚会', typeId: 'offline', title: 'AI 创作者秋日交流会', description: '来自公开平台的活动候选，等待 LinkGen 官方核对来源和活动信息。', time: '周六 14:00 - 17:00', location: '上海 · 外滩附近', locationMode: 'offline', attendees: 0, max: 80, organizer: 'Agent 采集', official: false, community: false, status: '待审核', color: '#db9c4e', joined: false, sourceUrl: 'https://www.xiaohongshu.com/explore/linkgen-demo', sourcePlatform: '小红书', discoveryMode: 'agent' },
        { id: `agent-${now + 1}`, day: '21', month: '9月', type: '线上分享', typeId: 'online', title: 'AI 产品增长实践公开分享', description: '来自公开平台的活动候选，等待 LinkGen 官方核对时间、嘉宾和报名入口。', time: '周日 20:00 - 21:30', location: '腾讯会议', locationMode: 'online', attendees: 0, max: 200, organizer: 'Agent 采集', official: false, community: false, status: '待审核', color: '#7f73bd', joined: false, sourceUrl: 'https://mp.weixin.qq.com/s/linkgen-demo', sourcePlatform: '微信公众号', discoveryMode: 'agent' },
      ];
      const nextEvents = existing.concat(candidates.filter((candidate) => !existing.some((item) => item.sourceUrl === candidate.sourceUrl)));
      saveEvents(nextEvents);
      this.setData({ agent: { ...this.data.agent, status: '待审核', lastRun: '刚刚' } });
      this.refresh();
      wx.showToast({ title: '发现候选活动，已进入审核', icon: 'success' });
    }, 700);
  },
  approve(e) { const id = e.currentTarget.dataset.id; saveEvents(getEvents().map((item) => item.id === id ? { ...item, status: '报名中', official: true, organizer: 'LinkGen 官方', color: '#f36b4f' } : item)); this.refresh(); wx.showToast({ title: '已通过并发布', icon: 'success' }); },
  reject(e) { const id = e.currentTarget.dataset.id; saveEvents(getEvents().map((item) => item.id === id ? { ...item, status: '未通过' } : item)); this.refresh(); wx.showToast({ title: '已驳回', icon: 'none' }); },
  goCreate() { wx.navigateTo({ url: '/pages/create-event/create-event?official=1' }); },
});
