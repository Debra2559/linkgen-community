const { getContent, getPosts, savePosts, getProfile, toggleInterest, toggleJoin, transitionTask } = require('../../utils/community-data');
Page({
  data: { post: null, comment: '' },
  onLoad(options) { this.id = options.id; this.refresh(); },
  refresh() { this.setData({ post: getContent(this.id) }); },
  onComment(e) { this.setData({ comment: e.detail.value }); },
  toggleLike() { const posts = getPosts().map((item) => item.id === this.id ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) } : item); savePosts(posts); this.refresh(); },
  taskAction(e) { try { if (e.currentTarget.dataset.action === 'interest') toggleInterest(this.id); else toggleJoin(this.id); this.refresh(); } catch (error) { wx.showToast({ title: error.message, icon: 'none' }); } },
  advanceTask(e) { try { transitionTask(this.id, e.currentTarget.dataset.status); this.refresh(); } catch (error) { wx.showToast({ title: error.message, icon: 'none' }); } },
  submitComment() { const text = this.data.comment.trim(); if (!text) return wx.showToast({ title: '先写点内容吧', icon: 'none' }); const profile = getProfile(); const posts = getPosts().map((item) => item.id === this.id ? { ...item, comments: item.comments + 1, commentsList: [...item.commentsList, { name: profile.name, initials: profile.initials, avatar: profile.avatar, text }] } : item); savePosts(posts); this.setData({ comment: '' }); this.refresh(); wx.showToast({ title: '回复已发出', icon: 'success' }); },
});
