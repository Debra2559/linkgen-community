const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const pad = (value) => String(value).padStart(2, '0');

function getDate(value) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPublished(event) {
  return event && (event.visibility === 'published'
    || (!event.visibility && !['待审核', '草稿', '未通过'].includes(event.status) && event.reviewStatus !== 'rejected'));
}

function serializeEvent(event, joined) {
  const date = getDate(event.startAt) || getDate(event.dateKey) || getDate(event.time);
  const community = event.community !== false;
  const attendees = Number(event.attendees) || 0;
  const max = Number(event.max) || 0;
  const readableTime = event.time && !/^20\d{2}-\d{2}-\d{2}T/.test(String(event.time))
    ? event.time
    : date ? `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}` : '时间待定';
  return {
    id: event._id || event.id,
    title: event.title || '',
    description: event.description || event.summary || '',
    summary: event.summary || event.description || '',
    articleSummary: event.articleSummary || event.summary || event.description || '',
    coverImage: event.coverImage || event.coverImageFileId || event.coverImageUrl || '',
    time: readableTime,
    dateKey: date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : event.dateKey || '',
    day: event.day || (date ? String(date.getDate()) : ''),
    month: event.month || (date ? `${date.getMonth() + 1}月` : ''),
    location: event.location || '',
    locationMode: event.locationMode || '',
    type: event.type || '',
    typeId: event.typeId || '',
    organizer: event.organizer || '',
    attendees,
    max,
    community,
    official: Boolean(event.official),
    status: event.status || '',
    color: event.color || '#db9c4e',
    joined: Boolean(joined),
    registrationUrl: event.registrationUrl || event.sourceUrl || '',
    sourceUrl: event.sourceUrl || '',
    sourcePlatform: event.sourcePlatform || '',
    sourceName: event.sourceName || event.organizer || '',
  };
}

exports.main = async (event = {}) => {
  try {
    const id = String(event.id || event.eventId || '');
    if (!id) return { code: -1, message: '缺少活动 ID' };
    const result = await db.collection('events').doc(id).get();
    if (!isPublished(result.data)) return { code: -1, message: '活动不存在或尚未发布' };
    const ctx = cloud.getWXContext();
    const registration = ctx && ctx.OPENID
      ? await db.collection('event_registrations').where({ eventId: id, _openid: ctx.OPENID, status: 'active' }).limit(1).get().catch(() => ({ data: [] }))
      : { data: [] };
    return { code: 0, data: { event: serializeEvent(result.data, Boolean(registration.data && registration.data.length)) } };
  } catch (error) {
    console.error('[getPublishedEvent]', error);
    return { code: -1, message: error.message || '活动详情查询失败' };
  }
};

exports._private = { getDate, isPublished, serializeEvent };
