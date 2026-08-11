const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function toDateParts(startAt) {
  const raw = String(startAt || '');
  const dateMatch = raw.match(/^(?:20\d{2})[-\/]([0-1]?\d)[-\/]([0-3]?\d)/);
  if (dateMatch) return { day: String(Number(dateMatch[2])), month: `${Number(dateMatch[1])}月` };
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) return { day: '', month: '' };
  return { day: String(date.getDate()), month: `${date.getMonth() + 1}月` };
}

function getRegistrationUrl(candidate) {
  if (candidate.registrationUrl) return candidate.registrationUrl;
  return candidate.scope === 'community' ? '' : candidate.sourceUrl;
}

async function assertAdmin(openid) {
  if (!openid) throw new Error('无法确认管理员身份');
  const result = await db.collection('admins').doc(openid).get().catch(() => null);
  if (!result || !result.data || result.data.status === 'disabled') throw new Error('无权审批活动');
}

exports.main = async (event = {}) => {
  try {
    const ctx = cloud.getWXContext();
    await assertAdmin(ctx && ctx.OPENID);
    const candidateId = String(event.candidateId || '');
    if (!candidateId) throw new Error('缺少候选活动 ID');

    const candidateResult = await db.collection('activity_candidates').doc(candidateId).get();
    const candidate = candidateResult.data;
    if (candidate && candidate.publishedEventId) return { code: 0, data: { eventId: candidate.publishedEventId, alreadyApproved: true } };
    if (!candidate || candidate.reviewStatus !== 'pending') throw new Error('候选不存在或已处理');
    if (!candidate.title || !candidate.startAt || !candidate.sourceUrl) throw new Error('标题、时间和来源链接必须补齐');

    const parts = toDateParts(candidate.startAt);
    const community = candidate.scope === 'community';
    const eventData = {
      title: candidate.title,
      description: candidate.description || candidate.summary || '',
      summary: candidate.summary || '',
      coverImage: candidate.coverImageFileId || candidate.coverImageUrl || '',
      time: candidate.startAt,
      startAt: candidate.startAt,
      day: parts.day,
      month: parts.month,
      location: candidate.location || (candidate.locationMode === 'online' ? '线上活动' : '待核验地点'),
      locationMode: candidate.locationMode || 'offline',
      type: candidate.type || (candidate.locationMode === 'online' ? '线上分享' : '线下聚会'),
      typeId: candidate.locationMode === 'online' ? 'online' : 'offline',
      organizer: candidate.organizer || candidate.sourceAccount || '活动主办方',
      attendees: 0,
      max: Number(candidate.expectedCount) || 0,
      official: true,
      community,
      status: '报名中',
      color: community ? '#f36b4f' : '#db9c4e',
      sourceUrl: candidate.sourceUrl,
      registrationUrl: getRegistrationUrl(candidate),
      sourcePlatform: candidate.sourcePlatform || '',
      sourceName: candidate.sourceAccount || '',
      authorizationStatus: candidate.authorizationStatus || 'unknown',
      articleSummary: candidate.summary || candidate.description || '',
      qualityScore: Number(candidate.qualityScore) || 0,
      qualityReasons: candidate.qualityReasons || [],
      fieldEvidence: candidate.fieldEvidence || {},
      riskFlags: candidate.riskFlags || [],
      sourceItemId: candidate.sourceItemId || '',
      eventFingerprint: candidate.eventFingerprint || '',
      discoveryMode: 'agent',
      visibility: 'published',
      reviewStatus: 'approved',
      joined: false,
      publishedAt: db.serverDate(),
      createdAt: db.serverDate(),
    };
    const stableEventId = `ev-${candidateId}`.slice(0, 32);
    const existingEvent = await db.collection('events').doc(stableEventId).get().catch(() => ({ data: null }));
    if (existingEvent.data) {
      await db.collection('activity_candidates').doc(candidateId).update({ data: { reviewStatus: 'approved', publishedEventId: stableEventId, reviewedAt: db.serverDate(), updatedAt: db.serverDate() } });
      return { code: 0, data: { eventId: stableEventId, alreadyApproved: true } };
    }
    await db.collection('events').doc(stableEventId).set({ data: eventData });
    await db.collection('activity_candidates').doc(candidateId).update({ data: { reviewStatus: 'approved', publishedEventId: stableEventId, reviewedAt: db.serverDate(), updatedAt: db.serverDate() } });
    await db.collection('audit_logs').add({ data: { action: 'approve_activity_candidate', actor: ctx.OPENID, candidateId, eventId: stableEventId, createdAt: db.serverDate() } });
    return { code: 0, data: { eventId: stableEventId } };
  } catch (error) {
    console.error('[approveActivityCandidate]', error);
    return { code: -1, message: error.message || '审批失败' };
  }
};
