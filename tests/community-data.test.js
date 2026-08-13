const assert = require('assert');
const storage = {};
global.wx = { getStorageSync: (key) => storage[key], setStorageSync: (key, value) => { storage[key] = JSON.parse(JSON.stringify(value)); } };

const service = require('../utils/community-data');
service.seedLocalData();

const legacy = service.listContent().find((item) => item.id === 'p-1');
assert.equal(legacy.contentType, 'discussion');
assert.equal(legacy.contentTypeLabel, '讨论');

assert.throws(() => service.createContent({ contentType: 'task', taskKind: 'preparation', title: '缺少活动', content: '应被阻止' }), /关联活动/);
assert.throws(() => service.createContent({ contentType: 'discussion', title: '  ', content: '正文' }), /标题和正文不能为空/);
assert.throws(() => service.createContent({ contentType: 'task', taskKind: 'collaboration', title: '人数错误', content: '应被阻止', neededPeople: 101, deadline: '2026-09-01' }), /1-100/);
assert.throws(() => service.createContent({ contentType: 'task', taskKind: 'collaboration', title: '日期错误', content: '应被阻止', neededPeople: 1, deadline: '明天' }), /有效的截止日期/);
assert.throws(() => service.createContent({ contentType: 'task', taskKind: 'unknown', title: '类型错误', content: '应被阻止', neededPeople: 1, deadline: '2026-09-01' }), /任务类型无效/);
assert.throws(() => service.createContent({ contentType: 'task', taskKind: 'collaboration', title: '日期错误', content: '应被阻止', neededPeople: 1, deadline: '2026-99-99' }), /有效的截止日期/);

const task = service.createContent({ contentType: 'task', taskKind: 'preparation', linkedEventId: 'e-1', title: '测试任务', content: '走通核心任务流程', neededPeople: 2, deadline: '2026-09-01', tags: ['活动协作'] });
assert.equal(task.taskStatus, 'recruiting');
assert.equal(task.linkedEventTitle, 'AI 产品经理的 100 个工作流');

assert.equal(service.toggleInterest(task.id).interestedCount, 1);
assert.equal(service.toggleJoin(task.id).participantCount, 1);
assert.equal(service.getContent(task.id).isParticipating, true);
assert.throws(() => service.toggleJoin(task.id, 'other-member') && service.toggleJoin(task.id, 'third-member'), /任务人数已满/);
assert.equal(service.transitionTask(task.id, 'in_progress').taskStatus, 'in_progress');
assert.equal(service.transitionTask(task.id, 'completed').taskStatus, 'completed');
assert.throws(() => service.transitionTask(task.id, 'recruiting'), /不允许/);

console.log('community-data: 17 assertions passed');
