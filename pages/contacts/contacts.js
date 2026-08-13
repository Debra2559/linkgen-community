const { getMembers } = require('../../utils/linkgen-data');
const { getTagOptions, TAG_GROUPS, normalizeTag } = require('../../utils/tag-taxonomy');
Page({
  data: { members: [], filteredMembers: [], search: '', activeTag: '全部', expandedFilters: false, tags: ['全部', 'AI 产品', 'Agent', '设计', '独立开发', '找搭子', '线下活动'], allTags: getTagOptions(), tagGroups: TAG_GROUPS },
  onLoad() { this.refresh(); }, onShow() { this.refresh(); }, onPullDownRefresh() { this.refresh(); wx.stopPullDownRefresh(); },
  refresh() { const members = getMembers(); this.setData({ members }, this.filterMembers); },
  filterMembers() { const { members, search, activeTag } = this.data; const key = search.trim().toLowerCase(); const list = members.filter((m) => { const memberTags = (m.tags || []).map(normalizeTag); return (!key || `${m.name}${m.role}${m.city || ''}${m.purpose}${memberTags.join('')}`.toLowerCase().includes(key)) && (!activeTag || activeTag === '全部' || memberTags.includes(normalizeTag(activeTag))); }); this.setData({ filteredMembers: list }); },
  onSearch(e) { this.setData({ search: e.detail.value }, this.filterMembers); }, onTag(e) { this.setData({ activeTag: e.currentTarget.dataset.tag }, this.filterMembers); },
  toggleFilters() { this.setData({ expandedFilters: !this.data.expandedFilters }); },
  clearFilter() { this.setData({ activeTag: '全部' }, this.filterMembers); },
  openMember(e) { wx.navigateTo({ url: `/pages/member-detail/member-detail?id=${e.currentTarget.dataset.id}` }); }, goProfile() { wx.switchTab({ url: '/pages/profile/profile' }); },
});
