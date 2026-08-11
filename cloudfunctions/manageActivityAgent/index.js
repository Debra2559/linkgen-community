const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const AUTHORIZATION_STATUSES = new Set(['unknown', 'authorized', 'owned', 'public_link']);
async function requireAdmin() {
  const ctx = cloud.getWXContext();
  const openid = ctx && ctx.OPENID;
  if (!openid) throw new Error('无法确认管理员身份');
  const admin = await db.collection('admins').doc(openid).get().catch(() => null);
  if (!admin || !admin.data || admin.data.status === 'disabled') throw new Error('无权管理活动 Agent');
  return openid;
}

function cleanSource(source = {}) {
  const urls = (Array.isArray(source.urls) ? source.urls : String(source.url || '').split(/[\n\r]+/))
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 20);
  return {
    id: String(source.id || source._id || '').slice(0, 32),
    kind: ['search', 'feed'].includes(source.kind) ? source.kind : 'url',
    platform: String(source.platform || '').slice(0, 30),
    name: String(source.name || '').slice(0, 80),
    note: String(source.note || '').slice(0, 160),
    url: String(urls[0] || '').slice(0, 500),
    urls: urls.map((item) => item.slice(0, 500)),
    query: String(source.query || '').trim().slice(0, 200),
    allowedDomains: Array.isArray(source.allowedDomains) ? source.allowedDomains.map((item) => String(item).trim().toLowerCase()).filter(Boolean).slice(0, 20) : [],
    maxResults: Math.max(1, Math.min(10, Number(source.maxResults || 5))),
    authorizationStatus: AUTHORIZATION_STATUSES.has(String(source.authorizationStatus || 'unknown')) ? String(source.authorizationStatus || 'unknown') : 'unknown',
    qualityThreshold: Math.max(0, Math.min(100, Number(source.qualityThreshold || 75))),
    enabled: Boolean(source.enabled),
    focus: Boolean(source.focus),
    defaultScope: source.defaultScope === 'community' ? 'community' : 'featured',
    updatedAt: db.serverDate(),
  };
}

async function listData() {
  const [candidateResult, sourceResult, runResult, settingsResult, sourceItemResult] = await Promise.all([
    db.collection('activity_candidates').orderBy('createdAt', 'desc').limit(100).get(),
    db.collection('agent_sources').orderBy('name', 'asc').limit(100).get(),
    db.collection('agent_runs').orderBy('createdAt', 'desc').limit(1).get(),
    db.collection('agent_settings').doc('default').get().catch(() => null),
    db.collection('source_items').orderBy('fetchedAt', 'desc').limit(100).get().catch(() => ({ data: [] })),
  ]);
  const candidates = candidateResult.data || [];
  const shareItems = (sourceItemResult.data || []).filter((item) => item.contentType === 'share').slice(0, 8);
  const latestRun = runResult.data && runResult.data[0] ? runResult.data[0] : null;
  return {
    candidates,
    sources: sourceResult.data || [],
    settings: settingsResult && settingsResult.data ? settingsResult.data : { enabled: true, schedule: '每天 09:00', qualityThreshold: 75 },
    latestRun,
    shareItems,
    pendingCount: candidates.filter((item) => item.reviewStatus === 'pending').length,
  };
}

async function saveSources(sources = []) {
  if (!Array.isArray(sources) || sources.length > 100) throw new Error('监控来源数量不合法');
  const saved = [];
  for (const rawSource of sources) {
    const source = cleanSource(rawSource);
    if (!source.id || !source.name || !source.platform) continue;
    await db.collection('agent_sources').doc(source.id).set({ data: { ...source, createdAt: db.serverDate() } });
    saved.push(source.id);
  }
  return saved;
}

exports.main = async (event = {}) => {
  try {
    const actor = await requireAdmin();
    if (event.action === 'saveSources') {
      const ids = await saveSources(event.sources);
      await db.collection('audit_logs').add({ data: { action: 'update_agent_sources', actor, sourceIds: ids, createdAt: db.serverDate() } });
      return { code: 0, data: await listData() };
    }
    if (event.action === 'setEnabled') {
      const enabled = Boolean(event.enabled);
      const existing = await db.collection('agent_settings').doc('default').get().catch(() => ({ data: {} }));
      const data = { ...(existing.data || {}), enabled, updatedAt: db.serverDate() };
      delete data._id;
      delete data._openid;
      await db.collection('agent_settings').doc('default').set({ data });
      await db.collection('audit_logs').add({ data: { action: enabled ? 'enable_agent' : 'disable_agent', actor, createdAt: db.serverDate() } });
      return { code: 0, data: await listData() };
    }
    if (event.action === 'setNotificationPreference') {
      const subscribed = Boolean(event.subscribed);
      await db.collection('admins').doc(actor).update({ data: { agentNotify: subscribed, notificationTemplateId: String(event.templateId || '').slice(0, 128), notificationUpdatedAt: db.serverDate() } });
      await db.collection('audit_logs').add({ data: { action: subscribed ? 'enable_agent_notification' : 'disable_agent_notification', actor, createdAt: db.serverDate() } });
      return { code: 0, data: { subscribed } };
    }
    return { code: 0, data: await listData() };
  } catch (error) {
    console.error('[manageActivityAgent]', error);
    return { code: -1, message: error.message || 'Agent 管理失败' };
  }
};
