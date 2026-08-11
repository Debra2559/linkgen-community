const { getLibraryResources, saveLibraryResources, seedLocalData } = require('../../utils/linkgen-data');
const { call, isCloudReady } = require('../../utils/cloud');

Page({
  data: { resources: [], filteredResources: [], search: '', activeCategory: '精选', categories: ['精选', '全部', '社群沉淀', '入门', 'Agent', '产品', '独立开发'], stats: { total: 0, internal: 0, saved: 0 }, cloudMode: false, cloudError: '', loading: false },
  onLoad() { seedLocalData(); this.refreshLocal(); if (isCloudReady()) this.refreshCloud(); },
  onShow() { if (this.data.cloudMode) this.refreshCloud(); else this.refreshLocal(); },
  refreshLocal() {
    const resources = getLibraryResources();
    this.applyResources(resources, false);
  },
  async refreshCloud() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const result = await call('listLibraryResources');
      const resources = (result.resources || []).map((item) => ({ ...item, id: item._id || item.id, saved: Boolean(item.saved) }));
      this.applyResources(resources, true);
      this.setData({ cloudError: '', loading: false });
    } catch (error) {
      this.setData({ loading: false, cloudError: error.message || 'CloudBase 查询失败，当前为本地演示资料' });
      this.refreshLocal();
    }
  },
  applyResources(resources, cloudMode) {
    const internal = resources.filter((item) => item.sourceType === '飞书文档' || item.sourceType === '公众号文章').length;
    const saved = resources.filter((item) => item.saved).length;
    this.setData({ resources, stats: { total: resources.length, internal, saved }, cloudMode }, () => this.filterResources());
  },
  refresh() {
    const resources = getLibraryResources();
    const internal = resources.filter((item) => item.sourceType === '飞书文档').length;
    const saved = resources.filter((item) => item.saved).length;
    this.setData({ resources, stats: { total: resources.length, internal, saved } }, this.filterResources);
  },
  filterResources() {
    const key = this.data.search.trim().toLowerCase();
    const { activeCategory } = this.data;
    const filteredResources = this.data.resources.filter((item) => {
      const categoryMatch = activeCategory === '精选' ? item.featured : activeCategory === '全部' || item.category === activeCategory;
      const searchMatch = !key || `${item.title || ''}${item.summary || ''}${(item.tags || []).join('')}${item.sourceLabel || ''}`.toLowerCase().includes(key);
      return categoryMatch && searchMatch;
    });
    this.setData({ filteredResources });
  },
  onSearch(e) { this.setData({ search: e.detail.value }, this.filterResources); },
  selectCategory(e) { this.setData({ activeCategory: e.currentTarget.dataset.category }, this.filterResources); },
  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/library-detail/library-detail?id=${encodeURIComponent(id)}` });
  },
  async toggleSave(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.cloudMode) {
      try {
        await call('toggleLibrarySave', { resourceId: id });
        await this.refreshCloud();
      } catch (error) {
        wx.showToast({ title: error.message || '收藏失败', icon: 'none' });
      }
      return;
    }
    const resources = getLibraryResources().map((item) => item.id === id ? { ...item, saved: !item.saved } : item);
    saveLibraryResources(resources);
    this.refreshLocal();
  },
  openResource(e) {
    const resource = this.data.resources.find((item) => item.id === e.currentTarget.dataset.id);
    if (!resource) return;
    if (!resource.sourceUrl) return wx.showModal({ title: '资料尚未发布', content: '这份资料已进入 LinkGen 目录，管理员补充飞书或公众号入口后即可打开。', showCancel: false, confirmText: '知道了' });
    wx.setClipboardData({ data: resource.sourceUrl, success: () => wx.showModal({ title: '链接已复制', content: `${resource.sourceLabel} · ${resource.title}\n\n当前版本通过复制链接打开，配置合法业务域名后可改为小程序内打开。`, showCancel: false, confirmText: '知道了' }) });
  },
});
