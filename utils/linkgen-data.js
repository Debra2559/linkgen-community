const POSTS_KEY = 'linkgen_posts_v1';
const EVENTS_KEY = 'linkgen_events_v1';
const PROFILE_KEY = 'linkgen_profile_v1';
const AGENT_CONFIG_KEY = 'linkgen_agent_config_v1';
const LIBRARY_KEY = 'linkgen_library_v1';
const { getAvatarPath } = require('./avatar-library');

const initialProfile = { name: '', initials: '你', role: '', city: '', color: '#e77b61', avatarId: 'lin', avatar: getAvatarPath('lin'), tags: [], purpose: '', bio: '', setupComplete: false };

const initialAgentConfig = {
  enabled: true,
  status: '待运行',
  schedule: '每天 09:00',
  lastRun: '尚未巡查',
  notifyChannel: '管理员微信',
  keywords: 'AI / 产品 / 创作者',
  qualityThreshold: '较高',
  lastScanSummary: { scanned: 0, activity: 0, share: 0, highQuality: 0 },
  notification: { status: '等待每日巡查', detail: '巡查发现高质量活动后通知管理员' },
  sources: [
    { id: 'wechat-saibozhixin', platform: '微信公众号', name: '赛博禅心', note: 'AI 原创内容与行业观察', url: '', authorizationStatus: 'unknown', enabled: false, focus: true, lastScan: '待配置来源 URL' },
    { id: 'wechat-kazike', platform: '微信公众号', name: '数字生命卡兹克', note: 'AI 工具、模型与实践分享', url: '', authorizationStatus: 'unknown', enabled: false, focus: true, lastScan: '待配置来源 URL' },
    { id: 'wechat-tone', platform: '微信公众号', name: 'T-ONE创新中心', note: '产业、投资与创业活动', url: '', authorizationStatus: 'unknown', enabled: false, focus: true, lastScan: '待配置来源 URL' },
    { id: 'wechat-linkgen', platform: '微信公众号', name: 'Link & Gen', note: 'LinkGen 社群官方动态', url: '', authorizationStatus: 'unknown', enabled: false, focus: true, lastScan: '待配置来源 URL' },
    { id: 'xiaohongshu-discovery', platform: '小红书', name: '重点观察池', note: 'AI / 产品 / 创作者活动笔记', url: '', authorizationStatus: 'unknown', enabled: false, focus: true, lastScan: '待配置来源 URL' },
    { id: 'search-public-activities', kind: 'search', platform: '搜索连接器', name: '官网与公开活动搜索', note: '按关键词发现公开活动页面，需配置搜索 API', query: 'AI 活动 上海', authorizationStatus: 'unknown', enabled: false, focus: false, lastScan: '待配置搜索 API' },
    { id: 'search-wechat-activities', kind: 'search', platform: '微信公众号搜索', name: '公众号活动发现', note: '只发现公开文章，仍需回原文核验和管理员审批', query: 'site:mp.weixin.qq.com/s AI 活动 上海', authorizationStatus: 'unknown', enabled: false, focus: true, lastScan: '待配置搜索 API', defaultScope: 'featured' },
    { id: 'search-xiaohongshu-activities', kind: 'search', platform: '小红书搜索', name: '小红书活动发现', note: '重点观察公开笔记，不能绕过登录和平台限制', query: 'site:xiaohongshu.com/explore AI 活动 上海', authorizationStatus: 'unknown', enabled: false, focus: true, lastScan: '待配置搜索 API', defaultScope: 'featured' },
  ],
};

const libraryResources = [
  { id: 'r-1', title: 'Agent 项目启动清单', summary: '从问题定义、用户场景到第一版评估指标，整理一份适合社群共创的启动清单。', category: '社群沉淀', tags: ['Agent', '产品方法'], sourceLabel: 'LinkGen 社群', sourceType: '飞书文档', sourceUrl: '', readTime: '10 分钟', updatedAt: '本周更新', featured: true, saved: false },
  { id: 'r-2', title: 'OpenAI API 文档', summary: '从模型调用、工具使用到结构化输出，适合开始搭建 AI 应用时作为主参考。', category: 'Agent', tags: ['API', '开发'], sourceLabel: 'OpenAI', sourceType: '官方文档', sourceUrl: 'https://platform.openai.com/docs/overview', readTime: '按需查看', updatedAt: '官方更新', featured: true, saved: false },
  { id: 'r-3', title: 'Hugging Face Learn', summary: '覆盖大模型、Agents、计算机视觉和音频的公开课程入口，适合按主题深入。', category: '入门', tags: ['课程', '模型'], sourceLabel: 'Hugging Face', sourceType: '公开课程', sourceUrl: 'https://huggingface.co/learn', readTime: '系列课程', updatedAt: '官方更新', featured: false, saved: false },
  { id: 'r-4', title: 'GitHub Skills', summary: '通过真实仓库练习 Actions、项目管理和协作流程，适合边做边学。', category: '独立开发', tags: ['GitHub', '协作'], sourceLabel: 'GitHub', sourceType: '公开课程', sourceUrl: 'https://skills.github.com/', readTime: '按需查看', updatedAt: '官方更新', featured: false, saved: false },
  { id: 'r-5', title: '技术写作入门', summary: '学习如何把复杂的产品、技术和研究讲清楚，适合写文档、教程和公开分享。', category: '产品', tags: ['表达', '写作'], sourceLabel: 'Google', sourceType: '公开课程', sourceUrl: 'https://developers.google.com/tech-writing', readTime: '约 2 小时', updatedAt: '官方更新', featured: false, saved: false },
  { id: 'r-6', title: 'LinkGen 活动复盘模板', summary: '记录活动目标、参与者反馈、有效连接和下一次改进点，让每次聚会留下可复用的经验。', category: '社群沉淀', tags: ['活动', '复盘'], sourceLabel: 'LinkGen 社群', sourceType: '飞书文档', sourceUrl: '', readTime: '5 分钟', updatedAt: '待发布', featured: false, saved: false },
];

const posts = [
  { id: 'p-1', author: '苏打', initials: '苏', role: 'AI 产品经理', color: '#5a8f87', avatar: getAvatarPath('soda'), time: '刚刚', title: '大家最近在用什么 AI 工具做用户研究？', content: '想找一套从访谈录音到洞察整理的顺滑工作流，最好能和飞书配合。欢迎丢工具，也想听听大家的真实踩坑记录。', tags: ['AI 工具', '用户研究'], likes: 28, liked: false, comments: 8, hot: true, commentsList: [{ name: '小宇', initials: '宇', avatar: getAvatarPath('xiaoyu'), text: 'NotebookLM + 飞书多维表，够轻量。' }, { name: 'Mia', initials: 'M', avatar: getAvatarPath('mia'), text: '可以试试 Granola，会议记录很自然。' }] },
  { id: 'p-2', author: '阿吉', initials: '阿', role: '独立开发者', color: '#7f73bd', avatar: getAvatarPath('aji'), time: '18 分钟前', title: '周末做了一个很小的 Agent，想找人一起测试', content: '输入一段混乱的需求，它会帮你整理成可执行的用户故事。目前只支持中文，欢迎对产品、工程感兴趣的朋友来玩。', tags: ['独立开发', 'Agent'], likes: 16, liked: true, comments: 4, hot: false, commentsList: [{ name: 'Echo', initials: 'E', avatar: getAvatarPath('echo'), text: '发我链接，周末可以测一测。' }] },
  { id: 'p-3', author: 'Nova', initials: 'N', role: '内容创作者', color: '#db9c4e', avatar: getAvatarPath('nova'), time: '昨天', title: 'AI 时代，个人品牌还有必要长期经营吗？', content: '最近和几位朋友聊到一个问题：当内容生产越来越快，真正稀缺的会不会变成“持续表达的人”？想听听社群里的不同答案。', tags: ['个人成长', '内容创作'], likes: 42, liked: false, comments: 12, hot: true, commentsList: [] },
];

const events = [
  { id: 'e-1', day: '24', month: '8月', type: '线上分享', title: 'AI 产品经理的 100 个工作流', description: '把每天重复的工作交给 AI，四位一线产品经理分享自己的真实工作流。', time: '周六 20:00 - 21:30', location: '腾讯会议', attendees: 68, max: 100, organizer: 'LinkGen 官方', official: true, community: true, status: '报名中', color: '#f36b4f', joined: true },
  { id: 'e-2', day: '31', month: '8月', type: '线下聚会', title: '深圳 · AI 人一起喝杯咖啡', description: '不做分享，只聊天。带上你最近在做的项目和一个想认识的人。', time: '周六 15:00 - 17:00', location: '南山 · 啡同凡响', attendees: 24, max: 30, organizer: 'Rex', official: false, community: true, status: '名额紧张', color: '#5a8f87', joined: false },
  { id: 'e-3', day: '07', month: '9月', type: '工作坊', title: '从 0 到 1 做一个 AI 小产品', description: '两小时完成产品定位、原型和第一个可用版本，带着问题来就行。', time: '周六 14:00 - 18:00', location: '上海 · Co.Lab', attendees: 16, max: 20, organizer: 'LinkGen 官方', official: true, community: true, status: '即将开始', color: '#7f73bd', joined: false },
  { id: 'e-4', day: '13', month: '9月', type: '线下聚会', title: 'AI 创新者开放日 · 上海', description: '来自不同团队的产品、设计和工程从业者分享正在发生的新尝试。', time: '周日 13:30 - 18:00', location: '上海 · 西岸艺术中心', attendees: 128, max: 300, organizer: 'AI 创新者开放日', official: false, community: false, status: '报名中', color: '#f3c95f', joined: false },
  { id: 'e-5', day: '20', month: '9月', type: '线上分享', title: '创作者工具箱线上峰会', description: '一天时间，听创作者、独立开发者和工具团队聊聊下一代工作方式。', time: '周日 10:00 - 17:00', location: 'Zoom', attendees: 486, max: 1000, organizer: '创作者工具箱', official: false, community: false, status: '即将开始', color: '#b7d9ff', joined: false },
];

const members = [
  { id: 'm-1', name: '苏打', initials: '苏', role: 'AI 产品经理', city: '上海', color: '#5a8f87', avatar: getAvatarPath('soda'), tags: ['AI 产品', '用户研究', '搞钱'], purpose: '想认识更多在做 AI 产品的朋友，交流真实经验。', bio: '在做一款面向创作者的 AI 工具，白天做产品，晚上研究模型。', online: true },
  { id: 'm-2', name: '阿吉', initials: '阿', role: '独立开发者', city: '杭州', color: '#7f73bd', avatar: getAvatarPath('aji'), tags: ['独立开发', 'Agent', '找搭子'], purpose: '找互补的产品和设计伙伴，一起把想法做出来。', bio: '三年独立开发，正在做自己的第 4 个小产品。', online: true },
  { id: 'm-3', name: 'Mia', initials: 'M', role: '设计师', city: '深圳', color: '#e77b61', avatar: getAvatarPath('mia'), tags: ['设计', 'AI 绘画', '线下活动'], purpose: '希望和有趣的人交换灵感，也想参加更多线下活动。', bio: '关注设计系统、生成式视觉和一切让工作更轻松的工具。', online: false },
  { id: 'm-4', name: 'Nova', initials: 'N', role: '内容创作者', city: '北京', color: '#db9c4e', avatar: getAvatarPath('nova'), tags: ['内容创作', '个人成长'], purpose: '寻找长期共创的朋友，聊表达，也聊商业化。', bio: '写 newsletter，做播客，偶尔研究怎么把复杂事情讲简单。', online: true },
  { id: 'm-5', name: '小宇', initials: '宇', role: '工程师', city: '广州', color: '#4f91b3', avatar: getAvatarPath('xiaoyu'), tags: ['工程', 'AI 应用', '开源'], purpose: '认识靠谱的工程伙伴，交换项目和技术方案。', bio: '全栈工程师，最近沉迷做能真正帮到人的 AI 应用。', online: false },
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const read = (key, fallback) => wx.getStorageSync(key) || clone(fallback);
const write = (key, value) => wx.setStorageSync(key, value);

function seedLocalData() {
  if (!wx.getStorageSync(POSTS_KEY)) write(POSTS_KEY, posts);
  const storedEvents = wx.getStorageSync(EVENTS_KEY);
  if (!storedEvents) write(EVENTS_KEY, events);
  else {
    const missingEvents = events.filter((event) => !storedEvents.some((item) => item.id === event.id));
    if (missingEvents.length) write(EVENTS_KEY, storedEvents.concat(missingEvents));
  }
  const storedProfile = wx.getStorageSync(PROFILE_KEY);
  if (!storedProfile) write(PROFILE_KEY, { ...initialProfile });
  else if (storedProfile.setupComplete !== true && storedProfile.name === '林小满' && storedProfile.role === '产品设计师' && storedProfile.city === '上海') write(PROFILE_KEY, { ...initialProfile });
  else if (storedProfile.setupComplete === undefined) write(PROFILE_KEY, { ...storedProfile, setupComplete: Boolean(storedProfile.name && storedProfile.role && storedProfile.city && storedProfile.purpose) });
  if (!wx.getStorageSync(AGENT_CONFIG_KEY)) write(AGENT_CONFIG_KEY, initialAgentConfig);
  if (!wx.getStorageSync(LIBRARY_KEY)) write(LIBRARY_KEY, libraryResources);
}

function normalizePost(value) {
  const item = { ...value };
  item.contentType = item.contentType || 'discussion';
  item.tags = Array.isArray(item.tags) ? item.tags : [];
  item.commentsList = Array.isArray(item.commentsList) ? item.commentsList : [];
  if (item.contentType === 'task') {
    item.interestedMemberIds = Array.isArray(item.interestedMemberIds) ? item.interestedMemberIds : [];
    item.participantMemberIds = Array.isArray(item.participantMemberIds) ? item.participantMemberIds : [];
  }
  return item;
}
function getPosts() { return read(POSTS_KEY, posts).map((item) => normalizePost({ ...item, avatar: item.avatar || getAvatarPath(item.author === '苏打' ? 'soda' : item.author === '阿吉' ? 'aji' : 'nova') })); }
function savePosts(value) { write(POSTS_KEY, value); }
function getEvents() { return read(EVENTS_KEY, events); }
function saveEvents(value) { write(EVENTS_KEY, value); }
function getAgentConfig() { return read(AGENT_CONFIG_KEY, initialAgentConfig); }
function saveAgentConfig(value) { write(AGENT_CONFIG_KEY, value); }
function getLibraryResources() { return read(LIBRARY_KEY, libraryResources); }
function saveLibraryResources(value) { write(LIBRARY_KEY, value); }
function getMembers() { return clone(members); }
function normalizeProfile(value) {
  const profile = { ...value };
  if (!profile.city && typeof profile.role === 'string' && profile.role.includes(' · ')) {
    const parts = profile.role.split(' · ');
    profile.role = parts.shift();
    profile.city = parts.join(' · ');
  }
  return { ...profile, initials: profile.initials || (profile.name ? profile.name.slice(0, 1) : '你'), avatarId: profile.avatarId || 'lin', avatar: profile.avatar || getAvatarPath(profile.avatarId || 'lin'), tags: profile.tags || [], city: profile.city || '', setupComplete: profile.setupComplete === true };
}
function getProfile() { return normalizeProfile(read(PROFILE_KEY, initialProfile)); }
function saveProfile(value) { write(PROFILE_KEY, normalizeProfile(value)); }

module.exports = { POSTS_KEY, EVENTS_KEY, PROFILE_KEY, AGENT_CONFIG_KEY, LIBRARY_KEY, initialAgentConfig, libraryResources, seedLocalData, getPosts, savePosts, getEvents, saveEvents, getAgentConfig, saveAgentConfig, getLibraryResources, saveLibraryResources, getMembers, getProfile, saveProfile, normalizePost };
