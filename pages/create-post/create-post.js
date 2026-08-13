const { getPosts, savePosts, getProfile } = require('../../utils/linkgen-data');

function getHost(url) {
  return url.replace(/^https?:\/\//i, '').split('/')[0].split('?')[0] || url;
}

function getMediaType(url) {
  const cleanUrl = url.split('?')[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp)$/.test(cleanUrl)) return 'image';
  if (/\.(mp4|mov|m4v|webm)$/.test(cleanUrl)) return 'video';
  return '';
}

Page({
  data: {
    title: '',
    content: '',
    selectedTags: [],
    tagOptions: ['AI 工具', '产品思维', '独立开发', '个人成长', '设计', '求职招聘'],
    attachments: [],
    linkInput: '',
    linkPanelOpen: false,
  },

  onTitle(e) { this.setData({ title: e.detail.value }); },
  onContent(e) { this.setData({ content: e.detail.value }); },

  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag;
    let selectedTags = this.data.selectedTags.slice();
    if (selectedTags.includes(tag)) selectedTags = selectedTags.filter((item) => item !== tag);
    else if (selectedTags.length < 3) selectedTags.push(tag);
    else return wx.showToast({ title: '最多选择 3 个标签', icon: 'none' });
    this.setData({ selectedTags });
  },
  addCustomTag() {
    if (this.data.selectedTags.length >= 3) return wx.showToast({ title: '最多选择 3 个标签', icon: 'none' });
    wx.showModal({ title: '添加自定义标签', editable: true, placeholderText: '例如：AI 教育', confirmText: '添加', success: (res) => {
      if (!res.confirm) return;
      const label = String(res.content || '').replace(/^#+/, '').trim().slice(0, 12);
      if (!label) return wx.showToast({ title: '请输入标签内容', icon: 'none' });
      if (this.data.selectedTags.includes(label)) return wx.showToast({ title: '这个标签已经选过了', icon: 'none' });
      const selectedTags = this.data.selectedTags.concat(label);
      this.setData({ selectedTags });
    } });
  },

  addImage() {
    const addFiles = (files) => {
      const attachments = this.data.attachments.concat(files.map((file, index) => ({
        id: `image-${Date.now()}-${index}`,
        type: 'image',
        path: file.tempFilePath,
        name: '图片',
      })));
      this.setData({ attachments });
    };
    if (wx.chooseMedia) {
      wx.chooseMedia({ count: 9, mediaType: ['image'], sourceType: ['album', 'camera'], success: (res) => addFiles(res.tempFiles || []) });
    } else {
      wx.chooseImage({ count: 9, sourceType: ['album', 'camera'], success: (res) => addFiles((res.tempFilePaths || []).map((tempFilePath) => ({ tempFilePath }))) });
    }
  },

  addVideo() {
    const addFile = (tempFilePath) => {
      if (tempFilePath) this.setData({ attachments: this.data.attachments.concat({ id: `video-${Date.now()}`, type: 'video', path: tempFilePath, name: '视频' }) });
    };
    if (wx.chooseMedia) {
      wx.chooseMedia({ count: 1, mediaType: ['video'], sourceType: ['album', 'camera'], maxDuration: 60, camera: 'back', success: (res) => addFile(res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath) });
    } else {
      wx.chooseVideo({ sourceType: ['album', 'camera'], maxDuration: 60, success: (res) => addFile(res.tempFilePath) });
    }
  },

  openLinkPanel() { this.setData({ linkPanelOpen: true }); },
  closeLinkPanel() { this.setData({ linkPanelOpen: false, linkInput: '' }); },
  onLinkInput(e) { this.setData({ linkInput: e.detail.value }); },

  pasteLink() {
    if (!wx.getClipboardData) return wx.showToast({ title: '当前环境不支持读取剪贴板', icon: 'none' });
    wx.getClipboardData({
      success: (res) => {
        const value = (res.data || '').trim();
        if (!/^https?:\/\//i.test(value)) return wx.showToast({ title: '剪贴板里没有可用链接', icon: 'none' });
        const mediaType = getMediaType(value);
        if (mediaType) {
          this.setData({ attachments: this.data.attachments.concat({ id: `${mediaType}-${Date.now()}`, type: mediaType, path: value, name: mediaType === 'image' ? '图片' : '视频' }) });
          return wx.showToast({ title: `已粘贴${mediaType === 'image' ? '图片' : '视频'}链接`, icon: 'none' });
        }
        this.setData({ linkInput: value, linkPanelOpen: true });
      },
      fail: () => wx.showToast({ title: '读取剪贴板失败', icon: 'none' }),
    });
  },

  saveLink() {
    const url = this.data.linkInput.trim();
    if (!/^https?:\/\//i.test(url)) return wx.showToast({ title: '请粘贴 http 或 https 链接', icon: 'none' });
    const mediaType = getMediaType(url);
    if (mediaType) {
      this.setData({ attachments: this.data.attachments.concat({ id: `${mediaType}-${Date.now()}`, type: mediaType, path: url, name: mediaType === 'image' ? '图片' : '视频' }), linkInput: '', linkPanelOpen: false });
      return;
    }
    if (this.data.attachments.some((item) => item.type === 'link' && item.url === url)) return wx.showToast({ title: '这个链接已经添加过了', icon: 'none' });
    this.setData({
      attachments: this.data.attachments.concat({ id: `link-${Date.now()}`, type: 'link', url, name: getHost(url) }),
      linkInput: '',
      linkPanelOpen: false,
    });
  },

  removeAttachment(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ attachments: this.data.attachments.filter((item, itemIndex) => itemIndex !== index) });
  },

  submit() {
    const { title, content, selectedTags, attachments } = this.data;
    if (!title.trim()) return wx.showToast({ title: '先写一个标题', icon: 'none' });
    if (!content.trim() && !attachments.length) return wx.showToast({ title: '正文或附件至少填写一项', icon: 'none' });
    const profile = getProfile();
    if (!profile.setupComplete) return wx.showModal({ title: '先完成你的名片', content: '发布讨论前，请先补充昵称、身份、城市和来社群的目的。', confirmText: '去设置', success: (res) => { if (res.confirm) wx.navigateTo({ url: '/pages/edit-profile/edit-profile' }); } });
    const posts = getPosts();
    posts.unshift({ id: `p-${Date.now()}`, authorId: profile.memberId, author: profile.name, initials: profile.initials, role: [profile.role, profile.city].filter(Boolean).join(' · '), color: profile.color, avatar: profile.avatar, time: '刚刚', title: title.trim(), content: content.trim(), attachments, tags: selectedTags.length ? selectedTags : ['新鲜想法'], likes: 0, liked: false, comments: 0, hot: false, commentsList: [] });
    savePosts(posts);
    wx.showToast({ title: '发布成功', icon: 'success' });
    setTimeout(() => wx.switchTab({ url: '/pages/feed/feed' }), 500);
  },
});
