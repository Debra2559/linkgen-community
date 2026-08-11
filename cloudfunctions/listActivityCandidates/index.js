const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  try {
    const ctx = cloud.getWXContext();
    const admin = await db.collection('admins').doc(ctx && ctx.OPENID).get().catch(() => null);
    if (!admin || !admin.data || admin.data.status === 'disabled') return { code: -1, message: '无权查看活动审核队列' };
    const result = await db.collection('activity_candidates').orderBy('createdAt', 'desc').limit(100).get();
    return { code: 0, data: { candidates: result.data || [] } };
  } catch (error) {
    console.error('[listActivityCandidates]', error);
    return { code: -1, message: error.message || '候选查询失败' };
  }
};
