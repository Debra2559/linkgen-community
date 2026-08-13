const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function requireAdmin() {
  const ctx = cloud.getWXContext();
  const openid = ctx && ctx.OPENID;
  if (!openid) throw new Error('无法确认管理员身份');
  const result = await db.collection('admins').doc(openid).get().catch(() => null);
  if (!result || !result.data || result.data.status === 'disabled') throw new Error('无权修改活动候选');
  return openid;
}

exports.main = async (event = {}) => {
  try {
    const actor = await requireAdmin();
    const candidateId = String(event.candidateId || '');
    if (event.action === 'needs-info') {
      const reason = String(event.reason || '').trim().slice(0, 300);
      if (!candidateId || !reason) throw new Error('缺少候选或补充说明');
      const candidate = await db.collection('activity_candidates').doc(candidateId).get();
      if (!candidate.data || candidate.data.reviewStatus !== 'pending') throw new Error('候选不存在或已处理');
      await db.collection('activity_candidates').doc(candidateId).update({ data: { reviewStatus: 'needs_info', reviewReason: reason, reviewedBy: actor, reviewedAt: db.serverDate(), updatedAt: db.serverDate() } });
      await db.collection('audit_logs').add({ data: { action: 'mark_activity_candidate_needs_info', actor, candidateId, reason, createdAt: db.serverDate() } });
      return { code: 0, data: { candidateId, reviewStatus: 'needs_info', reason } };
    }
    const coverImageFileId = String(event.coverImageFileId || '').trim();
    if (!candidateId || !coverImageFileId) throw new Error('缺少候选或封面文件');
    if (!/^cloud:\/\//.test(coverImageFileId)) throw new Error('封面必须来自 Cloud Storage');
    const candidate = await db.collection('activity_candidates').doc(candidateId).get();
    if (!candidate.data || candidate.data.reviewStatus !== 'pending') throw new Error('候选不存在或已处理');
    await db.collection('activity_candidates').doc(candidateId).update({ data: { coverImageFileId, coverImageStatus: 'admin_uploaded', updatedAt: db.serverDate() } });
    await db.collection('audit_logs').add({ data: { action: 'update_activity_candidate_cover', actor, candidateId, coverImageFileId, createdAt: db.serverDate() } });
    return { code: 0, data: { candidateId, coverImageFileId } };
  } catch (error) {
    console.error('[updateActivityCandidate]', error);
    return { code: -1, message: error.message || '候选更新失败' };
  }
};
