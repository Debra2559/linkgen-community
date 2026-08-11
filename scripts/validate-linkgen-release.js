const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const requiredFunctions = [
  'login',
  'activityAgent',
  'parseActivityLink',
  'manageActivityAgent',
  'listActivityCandidates',
  'approveActivityCandidate',
  'rejectActivityCandidate',
  'updateActivityCandidate',
  'listPublishedEvents',
  'getPublishedEvent',
  'registerForEvent',
  'listLibraryResources',
  'getLibraryResource',
  'toggleLibrarySave',
  'manageLibraryResource',
  'libraryMaintenance',
];
const requiredPages = [
  'pages/events/events',
  'pages/event-detail/event-detail',
  'pages/admin-review/admin-review',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const app = readJson('app.json');
const project = readJson('project.config.json');
assert(project.cloudfunctionRoot === 'cloudfunctions/', 'project.config.json 未指向 cloudfunctions/');
for (const page of requiredPages) assert(app.pages.includes(page), `app.json 缺少页面：${page}`);

for (const name of requiredFunctions) {
  const functionDir = path.join(root, 'cloudfunctions', name);
  assert(fs.existsSync(path.join(functionDir, 'index.js')), `缺少云函数入口：${name}`);
  const manifest = readJson(path.join('cloudfunctions', name, 'package.json'));
  assert(manifest.name === name, `${name}/package.json name 不匹配`);
}

const agentTrigger = readJson('cloudfunctions/activityAgent/config.json');
const libraryTrigger = readJson('cloudfunctions/libraryMaintenance/config.json');
const agentSources = readJson('db-import/agent-sources.json');
const libraryResources = readJson('db-import/library-resources.json');
assert(agentTrigger.triggers && agentTrigger.triggers.length === 1, 'activityAgent 缺少定时触发器');
assert(libraryTrigger.triggers && libraryTrigger.triggers.length === 1, 'libraryMaintenance 缺少定时触发器');
assert(agentTrigger.triggers[0].config === '0 0 9 * * * *', 'activityAgent 不是每天 09:00');
assert(libraryTrigger.triggers[0].config === '0 0 3 * * 0 *', 'libraryMaintenance 不是每周维护');
assert(fs.existsSync(path.join(root, 'db-import', 'agent-sources.json')), '缺少 Agent 来源种子');
assert(fs.existsSync(path.join(root, 'db-import', 'library-resources.json')), '缺少学习库种子');
assert(fs.existsSync(path.join(root, 'scripts', 'prepare-linkgen-seed.js')), '缺少 CloudBase 种子转换脚本');
assert(agentSources.length >= 5, 'Agent 来源池少于 5 个来源');
for (const id of ['wechat-saibozhixin', 'wechat-kazike', 'wechat-tone', 'wechat-linkgen', 'xiaohongshu-discovery']) {
  assert(agentSources.some((source) => source._id === id), `Agent 来源池缺少：${id}`);
}
assert(agentSources.some((source) => source.defaultScope === 'community'), 'Agent 来源池缺少社区活动归属');
assert(agentSources.some((source) => source.defaultScope === 'featured'), 'Agent 来源池缺少社区外精选归属');
assert(libraryResources.length >= 4, '学习库种子资料不足');
for (const resource of libraryResources.filter((item) => item.reviewStatus === 'published')) {
  assert(/^https?:\/\//i.test(resource.sourceUrl), `已发布资料缺少有效链接：${resource.title}`);
  assert(resource.summary && resource.owner && resource.sourceLabel, `已发布资料缺少摘要/维护人/来源：${resource.title}`);
}
const agentSourceCode = readText('cloudfunctions/activityAgent/index.js');
const adminCode = readText('cloudfunctions/manageActivityAgent/index.js');
const approvalCode = readText('cloudfunctions/approveActivityCandidate/index.js');
const parserCode = readText('cloudfunctions/parseActivityLink/index.js');
const loginCode = readText('cloudfunctions/login/index.js');
assert(agentSourceCode.includes('extractFeedLinks') && agentSourceCode.includes('eventFingerprint'), 'Agent 缺少 Feed 展开或活动去重');
assert(agentSourceCode.includes('notifyAdmins') && agentSourceCode.includes('markCandidatesNotified'), 'Agent 缺少通知审计');
assert(agentSourceCode.includes('findActiveRun') && agentSourceCode.includes('already_running'), 'Agent 缺少运行互斥');
assert(adminCode.includes('setNotificationPreference'), '缺少管理员通知偏好写入');
assert(adminCode.includes('AUTHORIZATION_STATUSES'), '来源管理缺少授权状态白名单');
assert(approvalCode.includes('articleSummary') && approvalCode.includes('registrationUrl'), '审批入库缺少活动摘要或报名链接');
assert(parserCode.includes('assertSafeUrl') && parserCode.includes('buildDraft'), '链接解析函数缺少安全校验或结构化草稿');
assert(loginCode.includes('LINKGEN_OWNER_OPENID') && loginCode.includes('needsOwnerSetup'), '登录函数仍允许未配置 owner 时自动提权');
console.log(`LinkGen release structure OK: ${requiredFunctions.length} cloud functions, ${requiredPages.length} pages`);
