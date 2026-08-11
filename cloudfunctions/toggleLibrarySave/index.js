const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function canView(resource, openid) {
  if (resource.accessPolicy === 'public') return true;
  const members = await db.collection('users').where({ _openid: openid, status: 'active' }).limit(1).get().catch(() => ({ data: [] }));
  return Boolean(members.data && members.data.length);
}

exports.main = async (event = {}) => {
  try {
    const ctx = cloud.getWXContext();
    const openid = ctx && ctx.OPENID;
    const resourceId = String(event.resourceId || '');
    if (!openid) throw new Error('请先登录后收藏资料');
    if (!resourceId) throw new Error('缺少资料 ID');
    const resource = await db.collection('library_resources').doc(resourceId).get();
    if (!resource.data || resource.data.reviewStatus !== 'published' || !(await canView(resource.data, openid))) throw new Error('资料不存在或尚未发布');
    const collection = db.collection('library_saves');
    const saveId = crypto.createHash('sha256').update(`${openid}:${resourceId}`).digest('hex').slice(0, 32);
    const existing = await collection.doc(saveId).get().catch(() => null);
    if (existing && existing.data) {
      await collection.doc(saveId).remove();
      return { code: 0, data: { saved: false } };
    }
    await collection.doc(saveId).set({ data: { resourceId, createdAt: db.serverDate() } });
    return { code: 0, data: { saved: true } };
  } catch (error) {
    console.error('[toggleLibrarySave]', error);
    return { code: -1, message: error.message || '收藏失败' };
  }
};
