const venueCategories = [
  { key: 'coffee', label: '咖啡馆', icon: '☕' },
  { key: 'restaurant', label: '饭店 / 餐厅', icon: '⌂' },
  { key: 'bar', label: '酒吧', icon: '◌' },
  { key: 'coworking', label: '联合办公', icon: '⌁' },
  { key: 'art', label: '艺术空间', icon: '✦' },
  { key: 'outdoor', label: '公园 / 户外', icon: '♧' },
];

const onlineVenues = [
  { id: 'tencent', category: 'online', name: '腾讯会议', city: '适合国内社群活动', detail: '稳定、上手快', source: '社群常用' },
  { id: 'feishu', category: 'online', name: '飞书会议', city: '适合工作坊和协作', detail: '支持共享文档', source: '社群常用' },
  { id: 'zoom', category: 'online', name: 'Zoom', city: '适合跨地域分享', detail: '国际参与者友好', source: '推荐' },
];

// MVP seed data. Replace with approved partner venues before public launch.
const offlineVenues = [
  { id: 'coffee-shenzhen', category: 'coffee', name: '啡同凡响', city: '深圳 · 南山', detail: '安静，适合 10-30 人交流', source: 'LinkGen 已知' },
  { id: 'coworking-shanghai', category: 'coworking', name: 'Co.Lab', city: '上海 · 静安', detail: '适合分享、工作坊和共创', source: 'LinkGen 已知' },
  { id: 'restaurant-beijing', category: 'restaurant', name: '社区餐桌', city: '北京 · 城市待定', detail: '适合边吃边聊的轻聚会', source: 'LinkGen 推荐' },
  { id: 'bar-hangzhou', category: 'bar', name: 'Afterwork Bar', city: '杭州 · 城市待定', detail: '适合下班后的轻社交', source: 'LinkGen 推荐' },
  { id: 'art-guangzhou', category: 'art', name: '开放工作室', city: '广州 · 城市待定', detail: '适合主题沙龙和作品分享', source: 'LinkGen 推荐' },
  { id: 'outdoor-shenzhen', category: 'outdoor', name: '城市公园草地', city: '深圳 · 城市待定', detail: '适合白天的开放式见面', source: 'LinkGen 推荐' },
];

function getVenueOptions(isOffline, category) {
  const source = isOffline ? offlineVenues : onlineVenues;
  return source.filter((item) => !isOffline || !category || category === 'all' || item.category === category);
}

module.exports = { venueCategories, onlineVenues, offlineVenues, getVenueOptions };
