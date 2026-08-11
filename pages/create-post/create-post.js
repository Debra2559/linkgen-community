const { createContent, getEvents } = require('../../utils/community-data');
Page({
  data: { contentType: 'discussion', title: '', content: '', selectedTags: [], tagOptions: ['AI 工具', '产品思维', '独立开发', '个人成长', '设计', '活动协作', '找搭子'], taskKind: 'collaboration', taskKinds: [{ key: 'preparation', label: '活动筹备' }, { key: 'followup', label: '活动后共创' }, { key: 'collaboration', label: '找协作者' }], events: [], linkedEventId: '', neededPeople: 1, deadline: '' },
  onLoad() { this.setData({ events: getEvents() }); },
  onType(e) { this.setData({ contentType: e.currentTarget.dataset.type }); },
  onTaskKind(e) { this.setData({ taskKind: e.currentTarget.dataset.kind }); },
  onTitle(e) { this.setData({ title: e.detail.value }); }, onContent(e) { this.setData({ content: e.detail.value }); },
  onNeededPeople(e) { this.setData({ neededPeople: e.detail.value }); }, onDeadline(e) { this.setData({ deadline: e.detail.value }); }, onEvent(e) { this.setData({ linkedEventId: this.data.events[e.detail.value].id }); },
  toggleTag(e) { const tag = e.currentTarget.dataset.tag; let selectedTags = this.data.selectedTags.slice(); if (selectedTags.includes(tag)) selectedTags = selectedTags.filter((item) => item !== tag); else if (selectedTags.length < 3) selectedTags.push(tag); else return wx.showToast({ title: '最多选择 3 个标签', icon: 'none' }); this.setData({ selectedTags }); },
  submit() { try { createContent({ contentType: this.data.contentType, taskKind: this.data.taskKind, linkedEventId: this.data.linkedEventId, neededPeople: this.data.neededPeople, deadline: this.data.deadline, title: this.data.title.trim(), content: this.data.content.trim(), tags: this.data.selectedTags }); wx.showToast({ title: this.data.contentType === 'task' ? '任务已发布' : '发布成功', icon: 'success' }); setTimeout(() => wx.switchTab({ url: '/pages/feed/feed' }), 500); } catch (error) { wx.showToast({ title: error.message || '发布失败', icon: 'none' }); } },
});
