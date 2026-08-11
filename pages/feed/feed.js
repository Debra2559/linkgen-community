const { getPosts, savePosts, seedLocalData, listContent } = require('../../utils/community-data');

Page({
  data: { posts: [], filteredPosts: [], search: '', activeContentType: 'all', contentTypes: [{ key: 'all', label: '全部动态' }, { key: 'task', label: '活动任务' }, { key: 'discussion', label: '讨论' }], activeTag: '全部', tags: ['全部', '活动协作', '找搭子', 'AI 工具', '独立开发', '个人成长'] },
  onLoad() { seedLocalData(); this.refresh(); },
  onShow() { this.refresh(); },
  onPullDownRefresh() { this.refresh(); wx.stopPullDownRefresh(); },
  refresh() { const posts = listContent(); this.setData({ posts }, this.filterPosts); },
  filterPosts() { const { posts, search, activeTag, activeContentType } = this.data; const key = search.trim().toLowerCase(); const list = posts.filter((post) => (!key || `${post.title}${post.content}${post.author}${post.tags.join('')}`.toLowerCase().includes(key)) && (activeContentType === 'all' || post.contentType === activeContentType) && (!activeTag || activeTag === '全部' || post.tags.includes(activeTag))); this.setData({ filteredPosts: list }); },
  onSearch(e) { this.setData({ search: e.detail.value }, this.filterPosts); },
  onTag(e) { this.setData({ activeTag: e.currentTarget.dataset.tag }, this.filterPosts); },
  onContentType(e) { this.setData({ activeContentType: e.currentTarget.dataset.type }, this.filterPosts); },
  toggleLike(e) { const id = e.currentTarget.dataset.id; const posts = getPosts().map((post) => post.id === id ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) } : post); savePosts(posts); this.refresh(); },
  openPost(e) { wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${e.currentTarget.dataset.id}` }); },
  goCreatePost() { wx.navigateTo({ url: '/pages/create-post/create-post' }); },
  goEvents() { wx.switchTab({ url: '/pages/events/events' }); },
  goProfile() { wx.switchTab({ url: '/pages/profile/profile' }); },
  onShareAppMessage() { return { title: 'LinkGen AI 社群，和有趣的人连接', path: '/pages/feed/feed' }; },
});
