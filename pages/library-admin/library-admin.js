const { getLibraryResources, saveLibraryResources, seedLocalData } = require('../../utils/linkgen-data');
const { call, isCloudReady } = require('../../utils/cloud');

const categories = ['社群沉淀', '入门', 'Agent', '产品', '独立开发'];
const sourceTypes = ['飞书文档', '公众号文章', '小红书笔记', '官方文档', '公开课程'];
const accessPolicies = ['public', 'member'];
const reviewStatuses = ['draft', 'published', 'archived', 'needs_recheck'];

function blankForm() {
  return { id: '', title: '', summary: '', category: '社群沉淀', tagsText: '', sourceLabel: 'LinkGen 社群', sourceType: '飞书文档', sourceUrl: '', readTime: '10 分钟', owner: '', reviewStatus: 'draft', accessPolicy: 'public', featured: false };
}

function toForm(resource) {
  return { ...blankForm(), ...resource, tagsText: (resource.tags || []).join('、') };
}

function pickerIndex(options, value) {
  const index = options.indexOf(value);
  return index >= 0 ? index : 0;
}

function decorateResource(resource) {
  const rowId = resource._id || resource.id;
  const sourceType = resource.sourceType || '未分类来源';
  const owner = resource.owner || '未设置维护人';
  return { ...resource, id: rowId, rowId, sourceMeta: `${sourceType} · ${owner}`, updatedLabel: resource.updatedAt || '未更新' };
}

Page({
  data: { resources: [], form: blankForm(), formTitle: '新增资料', categoryIndex: 0, sourceTypeIndex: 0, reviewStatusIndex: 0, accessPolicyIndex: 0, editing: false, categories, sourceTypes, accessPolicies, reviewStatuses, cloudMode: false, cloudError: '', loading: false },

  onLoad() { seedLocalData(); this.load(); },
  onShow() { if (!this.data.editing) this.load(); },

  async load() {
    if (this.data.loading) return;
    if (isCloudReady()) {
      this.setData({ loading: true });
      try {
        const result = await call('manageLibraryResource', { action: 'list' });
        this.setData({ resources: (result.resources || []).map(decorateResource), cloudMode: true, cloudError: '', loading: false });
        return;
      } catch (error) {
        this.setData({ cloudError: error.message || 'CloudBase 查询失败，当前为本地演示资料', loading: false });
      }
    }
    this.setData({ resources: getLibraryResources().map(decorateResource), cloudMode: false });
  },

  newResource() { this.setData({ form: blankForm(), formTitle: '新增资料', categoryIndex: 0, sourceTypeIndex: 0, reviewStatusIndex: 0, accessPolicyIndex: 0, editing: true }); },
  editResource(e) {
    const resource = this.data.resources.find((item) => (item._id || item.id) === e.currentTarget.dataset.id);
    if (resource) {
      const form = toForm(resource);
      this.setData({ form, formTitle: '编辑资料', categoryIndex: pickerIndex(categories, form.category), sourceTypeIndex: pickerIndex(sourceTypes, form.sourceType), reviewStatusIndex: pickerIndex(reviewStatuses, form.reviewStatus), accessPolicyIndex: pickerIndex(accessPolicies, form.accessPolicy), editing: true });
    }
  },
  cancelEdit() { this.setData({ editing: false, form: blankForm(), formTitle: '新增资料', categoryIndex: 0, sourceTypeIndex: 0, reviewStatusIndex: 0, accessPolicyIndex: 0 }); },
  onInput(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  onPickerChange(e) {
    const field = e.currentTarget.dataset.field;
    const options = { category: categories, sourceType: sourceTypes, reviewStatus: reviewStatuses, accessPolicy: accessPolicies }[field] || [];
    const value = options[Number(e.detail.value)] || options[0];
    const indexField = `${field}Index`;
    this.setData({ [`form.${field}`]: value, [indexField]: Number(e.detail.value) });
  },
  toggleFeatured(e) { this.setData({ 'form.featured': Boolean(e.detail.value) }); },

  async save() {
    const form = this.data.form;
    const tags = form.tagsText.split(/[、,，\s]+/).map((item) => item.trim()).filter(Boolean).slice(0, 4);
    if (!form.title.trim() || !form.summary.trim() || !form.owner.trim() || !form.sourceLabel.trim()) return wx.showToast({ title: '标题、摘要、来源、维护人必填', icon: 'none' });
    if (form.reviewStatus === 'published' && !/^https?:\/\//i.test(form.sourceUrl.trim())) return wx.showToast({ title: '发布前必须填写有效来源链接', icon: 'none' });
    const resource = { ...form, tags, title: form.title.trim(), summary: form.summary.trim(), sourceUrl: form.sourceUrl.trim(), owner: form.owner.trim(), updatedAt: new Date().toISOString() };
    delete resource.tagsText;
    if (this.data.cloudMode) {
      try {
        await call('manageLibraryResource', { action: 'upsert', resource });
        this.setData({ editing: false, form: blankForm() });
        await this.load();
        wx.showToast({ title: '资料已保存', icon: 'success' });
      } catch (error) { wx.showToast({ title: error.message || '保存失败', icon: 'none' }); }
      return;
    }
    const local = getLibraryResources();
    const next = resource.id ? local.map((item) => item.id === resource.id ? { ...item, ...resource } : item) : local.concat({ ...resource, id: `r-${Date.now()}`, saved: false });
    saveLibraryResources(next);
    this.setData({ resources: next.map(decorateResource), editing: false, form: blankForm(), formTitle: '新增资料', categoryIndex: 0, sourceTypeIndex: 0, reviewStatusIndex: 0, accessPolicyIndex: 0 });
    wx.showToast({ title: '已保存演示资料', icon: 'success' });
  },

  async archive(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.cloudMode) {
      try { await call('manageLibraryResource', { action: 'archive', resourceId: id }); await this.load(); wx.showToast({ title: '资料已下线', icon: 'none' }); } catch (error) { wx.showToast({ title: error.message || '下线失败', icon: 'none' }); }
      return;
    }
    const resources = getLibraryResources().map((item) => item.id === id ? { ...item, reviewStatus: 'archived' } : item);
    saveLibraryResources(resources); this.setData({ resources });
  },
});
