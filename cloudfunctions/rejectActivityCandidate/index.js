const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event = {}) => {
  try {
    const ctx = cloud.getWXContext();
    const actor = ctx && ctx.OPENID;
    const admin = await db.collection('admins').doc(actor).get().catch(() => null);
    if (!admin || !admin.data || admin.data.status === 'disabled') throw new Error('无权驳回活动');
    const candidateId = String(event.candidateId || '');
    if (!candidateId) throw new Error('缺少候选活动 ID');
    const candidate = await db.collection('activity_candidates').doc(candidateId).get();
    if (!candidate.data || candidate.data.reviewStatus !== 'pending') throw new Error('候选不存在或已处理');
    const reason = String(event.reason || '未达到公开活动收录标准').slice(0, 120);
    await db.collection('activity_candidates').doc(candidateId).update({ data: { reviewStatus: 'rejected', reviewReason: reason, reviewedAt: db.serverDate(), updatedAt: db.serverDate() } });
    await db.collection('audit_logs').add({ data: { action: 'reject_activity_candidate', actor, candidateId, reason, createdAt: db.serverDate() } });
    return { code: 0, data: { candidateId, reviewStatus: 'rejected' } };
  } catch (error) {
    console.error('[rejectActivityCandidate]', error);
    return { code: -1, message: error.message || '驳回失败' };
  }
};
