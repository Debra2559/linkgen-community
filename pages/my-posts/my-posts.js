const { getProfile, getPosts, savePosts, seedLocalData } = require('../../utils/linkgen-data');

function getMyPosts(posts, profile) {
  if (!profile.name) return [];
  return posts.filter((post) => post.authorId ? post.authorId === profile.memberId : post.author === profile.name);
}

function getMyReplies(posts, profile) {
  if (!profile.name) return [];
  return posts.reduce((items, post) => {
    (post.commentsList || []).forEach((comment, index) => {
      if (comment.authorId ? comment.authorId === profile.memberId : comment.name === profile.name) {
        items.push({
          id: `${post.id}-reply-${index}`,
          postId: post.id,
          text: comment.text,
          postTitle: post.title,
          time: comment.time || '刚刚',
        });
      }
    });
    return items;
  }, []);
}

Page({
  data: {
    profile: { name: '', avatar: '', initials: '你' },
    activeTab: 'posts',
    tabs: [{ key: 'posts', label: '我发起的', count: 0 }, { key: 'replies', label: '我的回复', count: 0 }],
    posts: [],
    replies: [],
    visiblePosts: [],
    visibleReplies: [],
    stats: { posts: 0, replies: 0, likes: 0 },
  },

  onLoad() { seedLocalData(); this.refresh(); },
  onShow() { this.refresh(); },
  onPullDownRefresh() { this.refresh(); wx.stopPullDownRefresh(); },

  refresh() {
    const profile = getProfile();
    const allPosts = getPosts();
    const posts = getMyPosts(allPosts, profile);
    const replies = getMyReplies(allPosts, profile);
    const stats = { posts: posts.length, replies: replies.length, likes: posts.reduce((sum, post) => sum + (post.likes || 0), 0) };
    const tabs = [{ key: 'posts', label: '我发起的', count: posts.length }, { key: 'replies', label: '我的回复', count: replies.length }];
    this.setData({ profile, posts, replies, stats, tabs }, this.applyTab);
  },

  applyTab() {
    const visiblePosts = this.data.activeTab === 'posts' ? this.data.posts : [];
    const visibleReplies = this.data.activeTab === 'replies' ? this.data.replies : [];
    this.setData({ visiblePosts, visibleReplies });
  },

  switchTab(e) { this.setData({ activeTab: e.currentTarget.dataset.tab }, this.applyTab); },
  openPost(e) { wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${e.currentTarget.dataset.id}` }); },
  openReply(e) { wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${e.currentTarget.dataset.id}` }); },
  deletePost(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({ title: '删除这条讨论？', content: '删除后本地演示数据将无法恢复。', confirmText: '删除', confirmColor: '#e45f50', success: (res) => {
      if (!res.confirm) return;
      const posts = getPosts().filter((item) => item.id !== id);
      const profile = getProfile();
      const nextPosts = posts.map((post) => ({ ...post, commentsList: (post.commentsList || []).filter((comment) => {
        const authoredByMe = comment.authorId ? comment.authorId === profile.memberId : comment.name === profile.name;
        return !authoredByMe;
      }) }));
      savePosts(nextPosts);
      this.refresh();
      wx.showToast({ title: '已删除', icon: 'success' });
    } });
  },
  goCreatePost() { wx.navigateTo({ url: '/pages/create-post/create-post' }); },
  goEditProfile() { wx.navigateTo({ url: '/pages/edit-profile/edit-profile' }); },
  goProfile() { wx.switchTab({ url: '/pages/profile/profile' }); },
});
