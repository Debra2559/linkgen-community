const local = require('./linkgen-data');

const TASK_KIND_LABELS = {
  preparation: '活动筹备',
  followup: '活动后共创',
  collaboration: '找协作者',
};

const TASK_STATUS_LABELS = {
  recruiting: '招募中',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const NEXT_STATUS = {
  recruiting: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function decorateContent(item) {
  if (item.contentType !== 'task') return { ...item, contentTypeLabel: '讨论' };
  const profile = local.getProfile();
  const memberId = currentMemberId();
  const isAdmin = Boolean(profile.isAdmin) || /管理员|运营/.test(profile.role || '');
  const event = local.getEvents().find((candidate) => candidate.id === item.linkedEventId);
  return {
    ...item,
    contentTypeLabel: '任务',
    taskKindLabel: TASK_KIND_LABELS[item.taskKind] || '找协作者',
    taskStatusLabel: TASK_STATUS_LABELS[item.taskStatus] || '招募中',
    linkedEventTitle: event ? event.title : '',
    participantCount: item.participantMemberIds.length,
    interestedCount: item.interestedMemberIds.length,
    progressPercent: Math.min(100, Math.round((item.participantMemberIds.length / item.neededPeople) * 100)),
    canAdvance: (NEXT_STATUS[item.taskStatus] || []).length > 0 && (isAdmin || !item.creatorMemberId || item.creatorMemberId === memberId),
  };
}

function listContent() { return local.getPosts().map(decorateContent); }
function getContent(id) { const item = local.getPosts().find((candidate) => candidate.id === id); return item ? decorateContent(item) : null; }

function currentMemberId() {
  const profile = local.getProfile();
  return profile.memberId || profile.openid || profile.id || profile.name || 'anonymous';
}

function createContent(input) {
  const profile = local.getProfile();
  const isTask = input.contentType === 'task';
  if (!input.title || !input.title.trim() || !input.content || !input.content.trim()) throw new Error('标题和正文不能为空');
  if (isTask && ['preparation', 'followup'].includes(input.taskKind) && !input.linkedEventId) throw new Error('这类任务需要关联活动');
  if (isTask && input.linkedEventId && !local.getEvents().some((event) => event.id === input.linkedEventId)) throw new Error('关联活动不存在');
  if (isTask && !/^\d{4}-\d{2}-\d{2}$/.test(input.deadline || '')) throw new Error('任务需要有效的截止日期');
  const neededPeople = Number(input.neededPeople);
  if (isTask && (!Number.isInteger(neededPeople) || neededPeople < 1 || neededPeople > 100)) throw new Error('需要人数必须是 1-100 的整数');
  const creatorMemberId = currentMemberId();
  const item = local.normalizePost({
    id: `${isTask ? 'task' : 'p'}-${Date.now()}`,
    author: profile.name,
    initials: profile.initials,
    role: [profile.role, profile.city].filter(Boolean).join(' · '),
    color: profile.color,
    avatar: profile.avatar,
    time: '刚刚',
    title: input.title.trim(),
    content: input.content.trim(),
    contentType: isTask ? 'task' : 'discussion',
    tags: input.tags && input.tags.length ? input.tags : [isTask ? '活动协作' : '新鲜想法'],
    likes: 0, liked: false, comments: 0, hot: false, commentsList: [],
    ...(isTask ? { taskKind: input.taskKind, taskStatus: 'recruiting', neededPeople, deadline: input.deadline, linkedEventId: input.linkedEventId || '', creatorMemberId, interestedMemberIds: [], participantMemberIds: [] } : {}),
  });
  local.savePosts([item].concat(local.getPosts()));
  return decorateContent(item);
}

function updateContent(id, updater) {
  let updated = null;
  const posts = local.getPosts().map((item) => {
    if (item.id !== id) return item;
    updated = local.normalizePost(updater(item));
    return updated;
  });
  if (!updated) throw new Error('内容不存在');
  local.savePosts(posts);
  return decorateContent(updated);
}

function toggleInterest(id, memberId = currentMemberId()) {
  return updateContent(id, (item) => {
    if (item.contentType !== 'task') throw new Error('只有任务可以表达感兴趣');
    const ids = item.interestedMemberIds.includes(memberId) ? item.interestedMemberIds.filter((value) => value !== memberId) : item.interestedMemberIds.concat(memberId);
    return { ...item, interestedMemberIds: ids };
  });
}

function toggleJoin(id, memberId = currentMemberId()) {
  return updateContent(id, (item) => {
    if (item.contentType !== 'task') throw new Error('只有任务可以加入');
    if (!['recruiting', 'in_progress'].includes(item.taskStatus)) throw new Error('当前状态不能加入');
    if (!item.participantMemberIds.includes(memberId) && item.participantMemberIds.length >= item.neededPeople) throw new Error('任务人数已满');
    const ids = item.participantMemberIds.includes(memberId) ? item.participantMemberIds.filter((value) => value !== memberId) : item.participantMemberIds.concat(memberId);
    return { ...item, participantMemberIds: ids };
  });
}

function transitionTask(id, nextStatus, memberId = currentMemberId()) {
  return updateContent(id, (item) => {
    if (item.contentType !== 'task' || !(NEXT_STATUS[item.taskStatus] || []).includes(nextStatus)) throw new Error('不允许的状态变化');
    const profile = local.getProfile();
    const isAdmin = Boolean(profile.isAdmin) || /管理员|运营/.test(profile.role || '');
    if (!isAdmin && item.creatorMemberId && item.creatorMemberId !== memberId) throw new Error('只有任务发起人或管理员可以推进状态');
    return { ...item, taskStatus: nextStatus };
  });
}

module.exports = { ...local, TASK_KIND_LABELS, TASK_STATUS_LABELS, NEXT_STATUS, listContent, getContent, createContent, updateContent, toggleInterest, toggleJoin, transitionTask, currentMemberId };
