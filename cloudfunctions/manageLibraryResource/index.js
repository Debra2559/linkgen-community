const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const CATEGORIES = new Set(['社群沉淀', '入门', 'Agent', '产品', '独立开发']);
const SOURCE_TYPES = new Set(['飞书文档', '公众号文章', '小红书笔记', '官方文档', '公开课程']);
const REVIEW_STATUSES = new Set(['draft', 'published', 'archived', 'needs_recheck']);
const ACCESS_POLICIES = new Set(['public', 'member']);

async function requireAdmin() {
  const ctx = cloud.getWXContext();
  const openid = ctx && ctx.OPENID;
  if (!openid) throw new Error('无法确认管理员身份');
  const admin = await db.collection('admins').doc(openid).get().catch(() => null);
  if (!admin || !admin.data || admin.data.status === 'disabled') throw new Error('无权管理学习库');
  return openid;
}

function cleanResource(resource = {}) {
  const result = {
    id: String(resource.id || resource._id || '').slice(0, 32),
    title: String(resource.title || '').trim().slice(0, 120),
    summary: String(resource.summary || '').trim().slice(0, 300),
    category: String(resource.category || '社群沉淀'),
    tags: Array.isArray(resource.tags) ? resource.tags.map((item) => String(item).trim()).filter(Boolean).slice(0, 4) : [],
    sourceLabel: String(resource.sourceLabel || '').trim().slice(0, 80),
    sourceType: String(resource.sourceType || '飞书文档'),
    sourceUrl: String(resource.sourceUrl || '').trim().slice(0, 500),
    readTime: String(resource.readTime || '').trim().slice(0, 30),
    owner: String(resource.owner || '').trim().slice(0, 50),
    reviewStatus: String(resource.reviewStatus || 'draft'),
    accessPolicy: String(resource.accessPolicy || 'member'),
    featured: Boolean(resource.featured),
    sourceItemId: String(resource.sourceItemId || '').slice(0, 64),
    updatedAt: db.serverDate(),
  };
  if (!result.title || !result.summary || !result.owner || !result.sourceLabel) throw new Error('标题、摘要、来源和维护人不能为空');
  if (!CATEGORIES.has(result.category) || !SOURCE_TYPES.has(result.sourceType)) throw new Error('资料分类或来源类型不合法');
  if (!REVIEW_STATUSES.has(result.reviewStatus) || !ACCESS_POLICIES.has(result.accessPolicy)) throw new Error('资料状态或访问范围不合法');
  if (result.reviewStatus === 'published' && !/^https?:\/\//i.test(result.sourceUrl)) throw new Error('发布资料必须有有效来源链接');
  return result;
}

exports.main = async (event = {}) => {
  try {
    const actor = await requireAdmin();
    if (event.action === 'list') {
      const result = await db.collection('library_resources').orderBy('updatedAt', 'desc').limit(100).get();
      return { code: 0, data: { resources: result.data || [] } };
    }
    if (event.action === 'archive') {
      const resourceId = String(event.resourceId || '');
      if (!resourceId) throw new Error('缺少资料 ID');
      await db.collection('library_resources').doc(resourceId).update({ data: { reviewStatus: 'archived', featured: false, updatedAt: db.serverDate() } });
      await db.collection('audit_logs').add({ data: { action: 'archive_library_resource', actor, resourceId, createdAt: db.serverDate() } });
      return { code: 0, data: { resourceId, reviewStatus: 'archived' } };
    }
    if (event.action === 'fromSourceItem') {
      const sourceItemId = String(event.sourceItemId || '');
      if (!sourceItemId) throw new Error('缺少来源内容 ID');
      const sourceItem = await db.collection('source_items').doc(sourceItemId).get();
      if (!sourceItem.data || sourceItem.data.contentType !== 'share') throw new Error('只能收录已识别为分享的内容');
      const source = sourceItem.data;
      const sourceType = /小红书/.test(source.sourcePlatform || '') ? '小红书笔记' : /公众号/.test(source.sourcePlatform || '') ? '公众号文章' : '官方文档';
      const draft = { title: String(source.title || '').slice(0, 120), summary: String(source.summary || source.description || '').slice(0, 300), category: '社群沉淀', tags: [source.sourcePlatform || '外部资料'].slice(0, 4), sourceLabel: source.sourceAccount || '外部来源', sourceType, sourceUrl: source.sourceUrl || source.canonicalUrl || '', readTime: '待估时长', owner: 'LinkGen 运营', reviewStatus: 'draft', accessPolicy: 'public', featured: false, sourceItemId, createdAt: db.serverDate(), updatedAt: db.serverDate() };
      if (!draft.title || !draft.summary || !draft.sourceUrl) throw new Error('来源内容缺少标题、摘要或链接');
      const existing = await db.collection('library_resources').where({ sourceItemId }).limit(1).get();
      if (existing.data && existing.data.length) return { code: 0, data: { resourceId: existing.data[0]._id, alreadyExists: true } };
      const created = await db.collection('library_resources').add({ data: draft });
      await db.collection('audit_logs').add({ data: { action: 'create_library_draft_from_source', actor, sourceItemId, resourceId: created._id, createdAt: db.serverDate() } });
      return { code: 0, data: { resourceId: created._id } };
    }
    if (event.action === 'upsert') {
      const resource = cleanResource(event.resource);
      const collection = db.collection('library_resources');
      if (resource.id) {
        await collection.doc(resource.id).set({ data: { ...resource, updatedAt: db.serverDate() } });
      } else {
        const created = await collection.add({ data: { ...resource, createdAt: db.serverDate() } });
        resource.id = created._id;
      }
      await db.collection('audit_logs').add({ data: { action: resource.reviewStatus === 'published' ? 'publish_library_resource' : 'save_library_resource', actor, resourceId: resource.id, createdAt: db.serverDate() } });
      return { code: 0, data: { resourceId: resource.id } };
    }
    throw new Error('不支持的资料管理操作');
  } catch (error) {
    console.error('[manageLibraryResource]', error);
    return { code: -1, message: error.message || '学习库管理失败' };
  }
};
