const POSTS_KEY = 'linkgen_posts_v1';
const EVENTS_KEY = 'linkgen_events_v1';
const PROFILE_KEY = 'linkgen_profile_v1';
const { getAvatarPath } = require('./avatar-library');

const posts = [
  { id: 'p-1', author: '苏打', initials: '苏', role: 'AI 产品经理', color: '#5a8f87', avatar: getAvatarPath('soda'), time: '刚刚', title: '大家最近在用什么 AI 工具做用户研究？', content: '想找一套从访谈录音到洞察整理的顺滑工作流，最好能和飞书配合。欢迎丢工具，也想听听大家的真实踩坑记录。', tags: ['AI 工具', '用户研究'], likes: 28, liked: false, comments: 8, hot: true, commentsList: [{ name: '小宇', initials: '宇', avatar: getAvatarPath('xiaoyu'), text: 'NotebookLM + 飞书多维表，够轻量。' }, { name: 'Mia', initials: 'M', avatar: getAvatarPath('mia'), text: '可以试试 Granola，会议记录很自然。' }] },
  { id: 'p-2', author: '阿吉', initials: '阿', role: '独立开发者', color: '#7f73bd', avatar: getAvatarPath('aji'), time: '18 分钟前', title: '周末做了一个很小的 Agent，想找人一起测试', content: '输入一段混乱的需求，它会帮你整理成可执行的用户故事。目前只支持中文，欢迎对产品、工程感兴趣的朋友来玩。', tags: ['独立开发', 'Agent'], likes: 16, liked: true, comments: 4, hot: false, commentsList: [{ name: 'Echo', initials: 'E', avatar: getAvatarPath('echo'), text: '发我链接，周末可以测一测。' }] },
  { id: 'p-3', author: 'Nova', initials: 'N', role: '内容创作者', color: '#db9c4e', avatar: getAvatarPath('nova'), time: '昨天', title: 'AI 时代，个人品牌还有必要长期经营吗？', content: '最近和几位朋友聊到一个问题：当内容生产越来越快，真正稀缺的会不会变成“持续表达的人”？想听听社群里的不同答案。', tags: ['个人成长', '内容创作'], likes: 42, liked: false, comments: 12, hot: true, commentsList: [] },
  { id: 'task-1', contentType: 'task', taskKind: 'preparation', linkedEventId: 'e-2', author: 'Rex', initials: 'R', role: '活动发起人', color: '#5a8f87', avatar: getAvatarPath('rex'), time: '今天', title: '深圳 AI 咖啡局招募两位现场搭档', content: '需要一位协助签到和破冰，一位负责拍照并整理活动回顾。加入后我们会在活动前同步简单分工。', tags: ['活动协作', '找搭子'], likes: 9, liked: false, comments: 3, hot: true, commentsList: [], taskStatus: 'recruiting', neededPeople: 2, deadline: '2026-08-28', interestedMemberIds: ['m-3'], participantMemberIds: ['m-2'] },
  { id: 'task-2', contentType: 'task', taskKind: 'collaboration', linkedEventId: '', author: '阿吉', initials: '阿', role: '独立开发者', color: '#7f73bd', avatar: getAvatarPath('aji'), time: '昨天', title: '找两位伙伴一起测试需求整理 Agent', content: '希望找到产品和设计方向的朋友，各用一个真实需求跑完整流程，最后一起整理一页反馈。', tags: ['Agent', '找搭子'], likes: 12, liked: true, comments: 2, hot: false, commentsList: [], taskStatus: 'in_progress', neededPeople: 3, deadline: '2026-09-05', interestedMemberIds: ['m-1', 'm-4'], participantMemberIds: ['m-3', 'm-5'] },
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
  const storedPosts = wx.getStorageSync(POSTS_KEY);
  if (!storedPosts) write(POSTS_KEY, posts);
  else {
    const missingPosts = posts.filter((post) => !storedPosts.some((item) => item.id === post.id));
    if (missingPosts.length) write(POSTS_KEY, storedPosts.concat(missingPosts));
  }
  const storedEvents = wx.getStorageSync(EVENTS_KEY);
  if (!storedEvents) write(EVENTS_KEY, events);
  else {
    const missingEvents = events.filter((event) => !storedEvents.some((item) => item.id === event.id));
    if (missingEvents.length) write(EVENTS_KEY, storedEvents.concat(missingEvents));
  }
  if (!wx.getStorageSync(PROFILE_KEY)) write(PROFILE_KEY, { name: '林小满', initials: '满', role: '产品设计师', city: '上海', color: '#e77b61', avatarId: 'lin', avatar: getAvatarPath('lin'), tags: ['AI 产品', '设计协作'], purpose: '认识更多 AI 行业的朋友，持续做点有意思的事。', bio: 'LinkGen 社群成员，喜欢研究新工具，也喜欢把想法变成作品。' });
}

function normalizePost(item) {
  const contentType = item.contentType === 'task' ? 'task' : 'discussion';
  return {
    ...item,
    contentType,
    avatar: item.avatar || getAvatarPath(item.author === '苏打' ? 'soda' : item.author === '阿吉' ? 'aji' : 'nova'),
    commentsList: item.commentsList || [],
    tags: item.tags || [],
    ...(contentType === 'task' ? {
      taskKind: item.taskKind || 'collaboration',
      taskStatus: item.taskStatus || 'recruiting',
      neededPeople: Number(item.neededPeople) || 1,
      deadline: item.deadline || '',
      linkedEventId: item.linkedEventId || '',
      interestedMemberIds: item.interestedMemberIds || [],
      participantMemberIds: item.participantMemberIds || [],
    } : {}),
  };
}
function getPosts() { return read(POSTS_KEY, posts).map(normalizePost); }
function savePosts(value) { write(POSTS_KEY, value); }
function getEvents() { return read(EVENTS_KEY, events); }
function saveEvents(value) { write(EVENTS_KEY, value); }
function getMembers() { return clone(members); }
function normalizeProfile(value) {
  const profile = { ...value };
  if (!profile.city && typeof profile.role === 'string' && profile.role.includes(' · ')) {
    const parts = profile.role.split(' · ');
    profile.role = parts.shift();
    profile.city = parts.join(' · ');
  }
  return { ...profile, avatarId: profile.avatarId || 'lin', avatar: profile.avatar || getAvatarPath(profile.avatarId || 'lin'), tags: profile.tags || [], city: profile.city || '' };
}
function getProfile() { return normalizeProfile(read(PROFILE_KEY, {})); }
function saveProfile(value) { write(PROFILE_KEY, normalizeProfile(value)); }

module.exports = { POSTS_KEY, EVENTS_KEY, PROFILE_KEY, seedLocalData, getPosts, savePosts, getEvents, saveEvents, getMembers, getProfile, saveProfile, normalizePost };
