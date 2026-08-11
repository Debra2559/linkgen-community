const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function isMember(openid) {
  if (!openid) return false;
  const result = await db.collection('users').where({ _openid: openid, status: 'active' }).limit(1).get().catch(() => ({ data: [] }));
  return Boolean(result.data && result.data.length);
}

async function visibleToUser(resource, openid, member) {
  if (resource.reviewStatus !== 'published') return false;
  if (resource.accessPolicy === 'public') return true;
  return member;
}

function serializeResource(resource, saved) {
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
    saved,
  };
}

exports.main = async () => {
  try {
    const ctx = cloud.getWXContext();
    const openid = ctx && ctx.OPENID;
    const result = await db.collection('library_resources').orderBy('updatedAt', 'desc').limit(100).get();
    const member = await isMember(openid);
    const resources = [];
    for (const item of result.data || []) {
      if (await visibleToUser(item, openid, member)) resources.push(item);
    }
    const savedResult = openid
      ? await db.collection('library_saves').where({ _openid: openid }).limit(100).get().catch(() => ({ data: [] }))
      : { data: [] };
    const savedIds = new Set((savedResult.data || []).map((item) => item.resourceId));
    return { code: 0, data: { resources: resources.map((item) => serializeResource(item, savedIds.has(item._id))) } };
  } catch (error) {
    console.error('[listLibraryResources]', error);
    return { code: -1, message: error.message || '学习库查询失败' };
  }
};
