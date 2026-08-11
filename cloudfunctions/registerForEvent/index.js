const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function registrationId(eventId, openid) {
  return `r-${crypto.createHash('sha256').update(`${eventId}:${openid}`).digest('hex').slice(0, 30)}`;
}

function isPublished(event) {
  return event && (event.visibility === 'published'
    || (!event.visibility && !['待审核', '草稿', '未通过'].includes(event.status) && event.reviewStatus !== 'rejected'));
}

exports.main = async (payload = {}) => {
  try {
    const ctx = cloud.getWXContext();
    const openid = ctx && ctx.OPENID;
    const eventId = String(payload.eventId || '');
    const action = payload.action === 'cancel' ? 'cancel' : 'join';
    if (!openid || !eventId) return { code: -1, message: '缺少用户或活动信息' };
    if (payload.setupComplete === false && action === 'join') return { code: -1, message: '请先完成个人名片' };

    const id = registrationId(eventId, openid);
    await db.runTransaction(async (transaction) => {
      const eventResult = await transaction.collection('events').doc(eventId).get();
      const current = eventResult.data;
      if (!isPublished(current) || current.community === false) throw new Error('该活动不支持社区报名');
      const existingResult = await transaction.collection('event_registrations').doc(id).get().catch(() => ({ data: null }));
      const existing = existingResult.data;
      const active = existing && existing.status === 'active';
      const attendees = Number(current.attendees) || 0;
      const max = Number(current.max) || 0;
      if (action === 'join') {
        if (active) return;
        if (max > 0 && attendees >= max) throw new Error('活动报名已满');
        await transaction.collection('event_registrations').doc(id).set({ data: { eventId, status: 'active', joinedAt: db.serverDate(), cancelledAt: null } });
        await transaction.collection('events').doc(eventId).update({ data: { attendees: db.command.inc(1) } });
        return;
      }
      if (!active) return;
      await transaction.collection('event_registrations').doc(id).update({ data: { status: 'cancelled', cancelledAt: db.serverDate() } });
      await transaction.collection('events').doc(eventId).update({ data: { attendees: db.command.inc(-1) } });
    });
    return { code: 0, data: { joined: action === 'join' } };
  } catch (error) {
    console.error('[registerForEvent]', error);
    return { code: -1, message: error.message || '报名操作失败' };
  }
};

exports._private = { registrationId, isPublished };
