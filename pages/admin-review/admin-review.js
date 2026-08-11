const { getEvents, saveEvents, getAgentConfig, saveAgentConfig, seedLocalData } = require('../../utils/linkgen-data');
const { call, isCloudReady } = require('../../utils/cloud');

const defaultAgent = { enabled: true, status: '待运行', sources: [], keywords: 'AI / 产品 / 创作者', schedule: '每天 09:00', lastRun: '尚未巡查', notifyChannel: '管理员微信', qualityThreshold: '较高' };
const sourceKindLabels = ['页面链接', 'RSS / Feed', '关键词搜索'];
const sourceAuthLabels = ['待确认授权', '已授权 / 合作 Feed', 'LinkGen 自有来源', '公开链接（已确认可用）'];
const sourceAuthValues = ['unknown', 'authorized', 'owned', 'public_link'];

function formatCandidateTime(value) {
  if (!value) return '待核验时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function mapCandidate(item) {
  const startAt = item.startAt || '';
  const statusMap = { pending: '待审核', approved: '已发布', rejected: '未通过' };
  const locationMode = item.locationMode || (/线上|直播|腾讯会议|Zoom/i.test(item.location || '') ? 'online' : 'offline');
  return {
    ...item,
    id: item._id || item.id,
    status: statusMap[item.reviewStatus] || item.status || '待审核',
    type: item.type || (locationMode === 'online' ? '线上分享' : '线下聚会'),
    typeId: locationMode,
    time: formatCandidateTime(startAt),
    location: item.location || (locationMode === 'online' ? '线上活动' : '待核验地点'),
    locationMode,
    coverImage: item.coverImageFileId || item.coverImageUrl || item.coverImage || '',
    summary: item.summary || item.description || '暂无文章概要',
    qualityScore: Number(item.qualityScore || 0),
    qualityLabel: item.qualityScore ? `${item.qualityScore} 分` : '待评估',
    qualityReasonText: (item.qualityReasons || []).join('、'),
    discoveryMode: 'agent',
    sourcePlatform: item.sourcePlatform || '',
    sourceName: item.sourceAccount || '',
    authorizationStatus: item.authorizationStatus || 'unknown',
    notificationStatus: item.reviewStatus === 'pending' ? '等待管理员审批' : '已处理',
  };
}

Page({
  data: {
    events: [], list: [], pendingCount: 0, activeFilter: 'pending',
    filters: [{ key: 'pending', label: '待审核' }, { key: 'all', label: '全部活动' }],
    agent: defaultAgent, monitoredSources: [], sourceKindLabels, sourceAuthLabels,
    scanSummary: { scanned: 0, searches: 0, activity: 0, share: 0, highQuality: 0 },
    notification: { status: '等待每日巡查', detail: '巡查发现高质量活动后通知管理员' }, shareItems: [],
    cloudMode: false, cloudError: '', loadingCloud: false,
  },

  onLoad() {
    seedLocalData();
    this.loadLocalData();
    if (isCloudReady()) this.loadCloudData();
  },

  onShow() {
    if (this.data.cloudMode) this.loadCloudData();
    else this.loadLocalData();
  },

  loadLocalData() {
    const agent = getAgentConfig();
    const events = getEvents();
    const sources = (agent.sources || []).map((source) => ({ ...source, urlText: source.urlText || (source.kind === 'search' ? source.query : (source.urls || [source.url]).filter(Boolean).join('\n')) }));
    this.setData({
      events,
      pendingCount: events.filter((item) => item.status === '待审核').length,
      agent: { ...defaultAgent, ...agent },
      monitoredSources: sources.map(withSourceIndexes),
      scanSummary: agent.lastScanSummary || this.data.scanSummary,
      notification: agent.notification || this.data.notification,
      cloudMode: false,
      cloudError: isCloudReady() ? this.data.cloudError : '未连接 CloudBase，当前为本地演示数据',
    }, () => this.filterList());
  },

  async loadCloudData() {
    if (this.data.loadingCloud) return;
    this.setData({ loadingCloud: true });
    try {
      const result = await call('manageActivityAgent', { action: 'list' });
      const candidates = (result.candidates || []).map(mapCandidate);
      const latestRun = result.latestRun || {};
      const settings = result.settings || {};
      const sources = (result.sources && result.sources.length ? result.sources : getAgentConfig().sources || []).map((source) => withSourceIndexes({ ...source, id: source.id || source._id, urlText: source.urlText || (source.kind === 'search' ? source.query : (source.urls || [source.url]).filter(Boolean).join('\n')) }));
      const scanSummary = {
        scanned: Number(latestRun.scanned || 0),
        searches: Number(latestRun.searches || 0),
        activity: Number(latestRun.activities || 0),
        share: Number(latestRun.shares || 0),
        highQuality: Number((latestRun.candidates || []).length || 0),
      };
      const notification = latestRun.notification
        ? { status: latestRun.notification.status === 'sent' ? '已发送微信通知' : latestRun.notification.status === 'partial' ? '部分管理员未收到' : latestRun.notification.status === 'failed' ? '微信通知发送失败' : '通知未配置', detail: latestRun.notification.sent ? `已通知 ${latestRun.notification.sent} 位管理员` : '需配置订阅消息模板并完成管理员授权' }
        : this.data.notification;
      const agent = { ...defaultAgent, ...this.data.agent, ...settings, enabled: settings.enabled !== false, status: settings.enabled === false ? '已暂停' : latestRun.status === 'running' ? '巡查中' : (candidates.some((item) => item.status === '待审核') ? '待审核' : '待运行'), lastRun: latestRun.status === 'running' ? '正在执行' : latestRun.createdAt ? '最近一次已完成' : '尚未巡查', sources };
      this.setData({ events: candidates, list: candidates, pendingCount: Number(result.pendingCount || 0), agent, monitoredSources: sources, scanSummary, notification, shareItems: result.shareItems || [], cloudMode: true, cloudError: '', loadingCloud: false }, () => this.filterList());
    } catch (error) {
    this.setData({ loadingCloud: false, cloudError: error.message || 'CloudBase 查询失败，当前为本地演示数据', shareItems: [] });
      this.loadLocalData();
    }
  },

  refresh() {
    if (this.data.cloudMode) return this.loadCloudData();
    this.loadLocalData();
  },

  filterList() {
    const list = this.data.events.filter((item) => this.data.activeFilter === 'all' || item.status === '待审核');
    this.setData({ list });
  },

  onFilter(e) {
    this.setData({ activeFilter: e.currentTarget.dataset.key }, () => this.filterList());
  },

  async toggleAgent(e) {
    const enabled = Boolean(e.detail.value);
    if (this.data.cloudMode) {
      try {
        await call('manageActivityAgent', { action: 'setEnabled', enabled });
        await this.loadCloudData();
        wx.showToast({ title: enabled ? '每日巡查已开启' : '每日巡查已暂停', icon: 'none' });
        return;
      } catch (error) {
        wx.showToast({ title: error.message || '设置失败', icon: 'none' });
        return;
      }
    }
    const agent = { ...this.data.agent, enabled, status: enabled ? '待运行' : '已暂停' };
    saveAgentConfig(agent);
    this.setData({ agent });
    wx.showToast({ title: enabled ? '演示巡查已开启' : '演示巡查已暂停', icon: 'none' });
  },

  async toggleSource(e) {
    const id = e.currentTarget.dataset.id;
    const sources = this.data.monitoredSources.map((source) => source.id === id || source._id === id ? { ...source, enabled: !source.enabled } : source);
    if (this.data.cloudMode) {
      try {
        await call('manageActivityAgent', { action: 'saveSources', sources });
        await this.loadCloudData();
        return;
      } catch (error) {
        wx.showToast({ title: error.message || '来源设置失败', icon: 'none' });
        return;
      }
    }
    const agent = { ...this.data.agent, sources };
    saveAgentConfig(agent);
    this.setData({ agent, monitoredSources: sources });
  },

  stopSourceToggle() {},

  onSourceKindChange(e) {
    const id = e.currentTarget.dataset.id;
    const kind = ['url', 'feed', 'search'][Number(e.detail.value)] || 'url';
    const sources = this.data.monitoredSources.map((source) => source.id === id || source._id === id ? { ...source, kind, kindIndex: Number(e.detail.value), urlText: kind === 'search' ? source.query || '' : source.urlText || '' } : source);
    this.setData({ monitoredSources: sources });
  },

  onSourceAuthChange(e) {
    const id = e.currentTarget.dataset.id;
    const index = Number(e.detail.value);
    const authorizationStatus = sourceAuthValues[index] || 'unknown';
    const sources = this.data.monitoredSources.map((source) => source.id === id || source._id === id ? { ...source, authorizationStatus, authIndex: index } : source);
    this.setData({ monitoredSources: sources });
  },

  onSourceUrlInput(e) {
    const id = e.currentTarget.dataset.id;
    const value = e.detail.value;
    const current = this.data.monitoredSources.find((source) => source.id === id || source._id === id);
    if (current && current.kind === 'search') {
      const sources = this.data.monitoredSources.map((source) => source.id === id || source._id === id ? { ...source, urlText: value, query: value.trim(), authorizationStatus: value.trim() ? source.authorizationStatus || 'unknown' : 'unknown' } : source);
      this.setData({ monitoredSources: sources });
      return;
    }
    const urls = value.split(/[\n\r]+/).map((item) => item.trim()).filter(Boolean).slice(0, 20);
    const sources = this.data.monitoredSources.map((source) => source.id === id || source._id === id ? { ...source, urlText: value, urls, url: urls[0] || '', authorizationStatus: urls.length ? source.authorizationStatus || 'unknown' : 'unknown' } : source);
    this.setData({ monitoredSources: sources });
  },

  async saveSources() {
    const sources = this.data.monitoredSources.map((source) => { const next = { ...source }; delete next.urlText; return next; });
    if (this.data.cloudMode) {
      try {
        await call('manageActivityAgent', { action: 'saveSources', sources });
        await this.loadCloudData();
        wx.showToast({ title: '来源配置已保存', icon: 'success' });
      } catch (error) {
        wx.showToast({ title: error.message || '来源配置失败', icon: 'none' });
      }
      return;
    }
    const agent = { ...this.data.agent, sources };
    saveAgentConfig(agent);
    this.setData({ agent });
    wx.showToast({ title: '已保存演示来源配置', icon: 'success' });
  },

  async runAgent() {
    if (this.data.agent.status === '巡查中') return;
    const enabledSources = this.data.monitoredSources.filter((source) => source.enabled);
    if (!enabledSources.length) return wx.showToast({ title: '请先开启至少一个监控来源', icon: 'none' });
    this.setData({ 'agent.status': '巡查中', notification: { status: '整理巡查结果', detail: `正在检查 ${enabledSources.length} 个来源` } });
    if (this.data.cloudMode) {
      try {
        const result = await call('activityAgent');
        const payload = result.notification || {};
        const alreadyRunning = result.status === 'already_running';
        this.setData({ notification: { status: alreadyRunning ? '已有巡查进行中' : payload.status === 'sent' ? '已发送微信通知' : '通知未配置', detail: alreadyRunning ? '本次请求未重复执行，等待当前任务完成' : payload.sent ? `已通知 ${payload.sent} 位管理员` : '候选已入库；需配置订阅消息模板后通知管理员' } });
        await this.loadCloudData();
        wx.showToast({ title: alreadyRunning ? '已有巡查进行中' : `巡查完成，发现 ${result.candidates ? result.candidates.length : 0} 条候选`, icon: 'none' });
      } catch (error) {
        this.setData({ 'agent.status': '待运行', notification: { status: '巡查失败', detail: error.message || '请检查来源授权和云函数部署' } });
        wx.showToast({ title: error.message || '巡查失败', icon: 'none' });
      }
      return;
    }
    this.runLocalDemo();
  },

  runLocalDemo() {
    const existing = getEvents();
    const now = Date.now();
    const candidates = [
      { id: `agent-${now}`, day: '14', month: '9月', type: '线下聚会', typeId: 'offline', title: 'AI 创作者秋日交流会', description: '围绕 AI 产品、内容和独立创作的线下交流，适合正在做项目或寻找合作伙伴的人。', summary: '本地演示候选：实际运行需配置有授权的来源 URL。', time: '周六 14:00 - 17:00', location: '上海 · 外滩附近', locationMode: 'offline', attendees: 0, max: 80, organizer: 'AI 创作者秋日交流会', official: false, community: false, status: '待审核', color: '#db9c4e', joined: false, sourceUrl: 'https://www.xiaohongshu.com/explore/linkgen-demo', sourcePlatform: '小红书', sourceName: '重点观察池', discoveryMode: 'agent', contentType: 'activity', quality: '高', qualityLabel: '演示候选', qualityScore: 91, coverImage: '', notificationStatus: '不会发送微信通知' },
      { id: `agent-${now + 1}`, day: '21', month: '9月', type: '线上分享', typeId: 'online', title: 'AI 产品增长实践公开分享', description: '产品负责人分享从用户研究、内容分发到增长实验的实际经验。', summary: '本地演示候选：实际运行需配置有授权的来源 URL。', time: '周日 20:00 - 21:30', location: '腾讯会议', locationMode: 'online', attendees: 0, max: 200, organizer: 'AI 产品增长实践公开分享', official: false, community: false, status: '待审核', color: '#7f73bd', joined: false, sourceUrl: 'https://mp.weixin.qq.com/s/linkgen-demo', sourcePlatform: '微信公众号', sourceName: '赛博禅心', discoveryMode: 'agent', contentType: 'activity', quality: '较高', qualityLabel: '演示候选', qualityScore: 86, coverImage: '', notificationStatus: '不会发送微信通知' },
    ];
    saveEvents(existing.concat(candidates.filter((candidate) => !existing.some((item) => item.sourceUrl === candidate.sourceUrl))));
    const agent = { ...this.data.agent, status: '待审核', lastRun: '本地演示', notification: { status: '本地演示结果', detail: '未连接 CloudBase，不会发送微信通知' }, lastScanSummary: { scanned: enabledSourcesCount(this.data.monitoredSources), activity: 2, share: 3, highQuality: 2 } };
    saveAgentConfig(agent);
    this.setData({ agent, notification: agent.notification, scanSummary: agent.lastScanSummary });
    this.loadLocalData();
    wx.showToast({ title: '已生成演示候选', icon: 'none' });
  },

  subscribeAgentNotice() {
    const templateId = this.data.agent.notificationTemplateId || '';
    if (!templateId) return wx.showToast({ title: '请先配置订阅消息模板 ID', icon: 'none' });
    if (!wx.requestSubscribeMessage) return wx.showToast({ title: '当前基础库不支持订阅消息', icon: 'none' });
    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: async (result) => {
        const subscribed = result && result[templateId] === 'accept';
        if (this.data.cloudMode) {
          try {
            await call('manageActivityAgent', { action: 'setNotificationPreference', subscribed, templateId });
          } catch (error) {
            return wx.showToast({ title: error.message || '通知偏好保存失败', icon: 'none' });
          }
        }
        wx.showToast({ title: subscribed ? '已开启微信提醒' : '未开启微信提醒', icon: subscribed ? 'success' : 'none' });
      },
      fail: (error) => wx.showToast({ title: error.errMsg || '订阅失败', icon: 'none' }),
    });
  },

  chooseCandidateImage(e) {
    const id = e.currentTarget.dataset.id;
    const handleResult = (res) => {
      const tempPath = res.tempFiles ? res.tempFiles[0] && res.tempFiles[0].tempFilePath : res.tempFilePaths && res.tempFilePaths[0];
      if (!tempPath) return;
      if (this.data.cloudMode && wx.cloud && wx.cloud.uploadFile) {
        wx.cloud.uploadFile({ cloudPath: `activity-covers/${id}-${Date.now()}.jpg`, filePath: tempPath, success: async (uploaded) => {
          try {
            await call('updateActivityCandidate', { candidateId: id, coverImageFileId: uploaded.fileID });
            await this.loadCloudData();
            wx.showToast({ title: '活动图片已上传', icon: 'success' });
          } catch (error) {
            wx.showToast({ title: error.message || '活动图片保存失败', icon: 'none' });
          }
        }, fail: () => wx.showToast({ title: '活动图片上传失败', icon: 'none' }) });
        return;
      }
      wx.saveFile({ tempFilePath: tempPath, success: (saved) => { saveEvents(getEvents().map((item) => item.id === id ? { ...item, coverImage: saved.savedFilePath } : item)); this.loadLocalData(); wx.showToast({ title: '活动图片已更新', icon: 'success' }); }, fail: () => wx.showToast({ title: '图片保存失败', icon: 'none' }) });
    };
    if (wx.chooseMedia) wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], success: handleResult });
    else wx.chooseImage({ count: 1, sourceType: ['album', 'camera'], success: handleResult });
  },

  async approve(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.cloudMode) {
      try {
        await call('approveActivityCandidate', { candidateId: id });
        await this.loadCloudData();
        wx.showToast({ title: '已通过并加入活动', icon: 'success' });
      } catch (error) {
        wx.showToast({ title: error.message || '审批失败', icon: 'none' });
      }
      return;
    }
    saveEvents(getEvents().map((item) => item.id === id ? { ...item, status: '报名中', official: true, organizer: item.community === false ? item.organizer : 'LinkGen 官方', color: '#f36b4f', approvedAt: '刚刚', notificationStatus: '已审批并入库' } : item));
    this.loadLocalData();
    wx.showToast({ title: '演示活动已通过', icon: 'success' });
  },

  async reject(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.cloudMode) {
      try {
        await call('rejectActivityCandidate', { candidateId: id });
        await this.loadCloudData();
        wx.showToast({ title: '已驳回', icon: 'none' });
      } catch (error) {
        wx.showToast({ title: error.message || '驳回失败', icon: 'none' });
      }
      return;
    }
    saveEvents(getEvents().map((item) => item.id === id ? { ...item, status: '未通过' } : item));
    this.loadLocalData();
    wx.showToast({ title: '演示候选已驳回', icon: 'none' });
  },

  goCreate() { wx.navigateTo({ url: '/pages/create-event/create-event?official=1' }); },
});

function enabledSourcesCount(sources) {
  return sources.filter((source) => source.enabled).length * 8;
}

function withSourceIndexes(source) {
  const kindIndex = { url: 0, feed: 1, search: 2 }[source.kind] || 0;
  const authIndex = Math.max(0, sourceAuthValues.indexOf(source.authorizationStatus || 'unknown'));
  return { ...source, kindIndex, authIndex };
}
