const { getPosts, savePosts, seedLocalData, getProfile } = require('../../utils/linkgen-data');

Page({
  data: { profile: { avatar: '', initials: '你' }, posts: [], filteredPosts: [], search: '', activeTag: '全部', tags: ['全部', 'AI 工具', '产品思维', '独立开发', '个人成长'] },
  onLoad() { seedLocalData(); this.refresh(); },
  onShow() { this.refresh(); },
  onPullDownRefresh() { this.refresh(); wx.stopPullDownRefresh(); },
  refresh() { const posts = getPosts(); this.setData({ profile: getProfile(), posts }, this.filterPosts); },
  filterPosts() { const { posts, search, activeTag } = this.data; const key = search.trim().toLowerCase(); const list = posts.filter((post) => (!key || `${post.title}${post.content}${post.author}${post.tags.join('')}${(post.attachments || []).map((item) => item.url || item.name || '').join('')}`.toLowerCase().includes(key)) && (!activeTag || activeTag === '全部' || post.tags.includes(activeTag))); this.setData({ filteredPosts: list }); },
  onSearch(e) { this.setData({ search: e.detail.value }, this.filterPosts); },
  onTag(e) { this.setData({ activeTag: e.currentTarget.dataset.tag }, this.filterPosts); },
  toggleLike(e) { const id = e.currentTarget.dataset.id; const posts = getPosts().map((post) => post.id === id ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) } : post); savePosts(posts); this.refresh(); },
  openPost(e) { wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${e.currentTarget.dataset.id}` }); },
  goCreatePost() { wx.navigateTo({ url: '/pages/create-post/create-post' }); },
  goEvents() { wx.switchTab({ url: '/pages/events/events' }); },
  goProfile() { wx.switchTab({ url: '/pages/profile/profile' }); },
  onShareAppMessage() { return { title: 'LinkGen AI 社群，和有趣的人连接', path: '/pages/feed/feed' }; },
});
