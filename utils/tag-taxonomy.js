// Shared vocabulary for profile tags and directory filters.
const TAG_GROUPS = [
  { key: 'role', label: '角色与能力', items: ['产品', '设计', '工程', '运营', '内容创作', '用户研究'] },
  { key: 'topic', label: '关注方向', items: ['AI 产品', 'AI 应用', 'Agent', 'AI 绘画', 'AI 编程', '独立开发', '开源'] },
  { key: 'connect', label: '连接诉求', items: ['找搭子', '项目合作', '求职招聘', '经验交流'] },
  { key: 'activity', label: '活动偏好', items: ['线下活动', '线上分享', '工作坊'] },
];

const ALL_TAGS = TAG_GROUPS.reduce((items, group) => items.concat(group.items), []);

function getTagOptions() {
  return ALL_TAGS.slice();
}

function getTagGroup(tag) {
  return TAG_GROUPS.find((group) => group.items.includes(tag));
}

function normalizeTag(tag) {
  const aliases = { 'AI 工具': 'AI 应用', '设计协作': '设计', '线下聚会': '线下活动', '搞钱': '项目合作' };
  return aliases[tag] || tag;
}

module.exports = { TAG_GROUPS, ALL_TAGS, getTagOptions, getTagGroup, normalizeTag };
