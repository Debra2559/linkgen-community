const { getLibraryResources, seedLocalData } = require('../../utils/linkgen-data');
const { call, isCloudReady } = require('../../utils/cloud');

Page({
  data: { resource: null, cloudMode: false, loading: false, cloudError: '' },

  onLoad(options) {
    this.id = options && options.id;
    seedLocalData();
    this.load();
  },

  async load() {
    if (isCloudReady()) {
      this.setData({ loading: true });
      try {
        const result = await call('getLibraryResource', { id: this.id });
        this.setData({ resource: result.resource, cloudMode: true, loading: false, cloudError: '' });
        return;
      } catch (error) {
        this.setData({ cloudError: error.message || 'CloudBase 查询失败，当前为本地演示资料' });
      }
    }
    const resource = getLibraryResources().find((item) => String(item.id) === String(this.id));
    this.setData({ resource, cloudMode: false, loading: false });
  },

  async toggleSave() {
    const resource = this.data.resource;
    if (!resource) return;
    if (this.data.cloudMode) {
      try {
        const result = await call('toggleLibrarySave', { resourceId: resource.id });
        this.setData({ 'resource.saved': Boolean(result.saved) });
      } catch (error) {
        wx.showToast({ title: error.message || '收藏失败', icon: 'none' });
      }
      return;
    }
    this.setData({ 'resource.saved': !resource.saved });
  },

  openResource() {
    const resource = this.data.resource;
    if (!resource || !resource.sourceUrl) return wx.showToast({ title: '资料链接待补充', icon: 'none' });
    wx.setClipboardData({ data: resource.sourceUrl, success: () => wx.showModal({ title: '链接已复制', content: `${resource.sourceLabel} · ${resource.title}`, showCancel: false, confirmText: '知道了' }) });
  },
});
