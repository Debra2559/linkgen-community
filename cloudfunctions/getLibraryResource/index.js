const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function isMember(openid) {
  if (!openid) return false;
  const result = await db.collection('users').where({ _openid: openid, status: 'active' }).limit(1).get().catch(() => ({ data: [] }));
  return Boolean(result.data && result.data.length);
}

function canView(resource, member) {
  return resource && resource.reviewStatus === 'published' && (resource.accessPolicy === 'public' || member);
}

function serialize(resource, saved) {
  return {
    id: resource._id,
    title: resource.title || '',
    summary: resource.summary || '',
    category: resource.category || '社群沉淀',
    tags: Array.isArray(resource.tags) ? resource.tags : [],
    sourceLabel: resource.sourceLabel || '',
    sourceType: resource.sourceType || '',
    sourceUrl: resource.sourceUrl || '',
    readTime: resource.readTime || '',
    owner: resource.owner || '',
    featured: Boolean(resource.featured),
    accessPolicy: resource.accessPolicy || 'public',
    updatedAt: resource.updatedAt || null,
    linkStatus: resource.linkStatus || '',
    saved,
  };
}

exports.main = async (event = {}) => {
  try {
    const id = String(event.id || event.resourceId || '');
    if (!id) throw new Error('缺少资料 ID');
    const result = await db.collection('library_resources').doc(id).get();
    const ctx = cloud.getWXContext();
    const openid = ctx && ctx.OPENID;
    const member = await isMember(openid);
    if (!canView(result.data, member)) throw new Error('资料不存在或尚未发布');
    const saved = openid
      ? Boolean((await db.collection('library_saves').where({ _openid: openid, resourceId: id }).limit(1).get().catch(() => ({ data: [] }))).data.length)
      : false;
    return { code: 0, data: { resource: serialize(result.data, saved) } };
  } catch (error) {
    console.error('[getLibraryResource]', error);
    return { code: -1, message: error.message || '资料详情查询失败' };
  }
};

exports._private = { canView, serialize };
