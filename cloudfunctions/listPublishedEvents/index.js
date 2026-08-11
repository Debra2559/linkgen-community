const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const pad = (value) => String(value).padStart(2, '0');

function getDate(value) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEventDate(event) {
  return getDate(event.startAt) || getDate(event.dateKey) || getDate(event.time);
}

function isPublished(event) {
  return event.visibility === 'published'
    || (!event.visibility && !['待审核', '草稿', '未通过'].includes(event.status) && event.reviewStatus !== 'rejected');
}

function formatTime(event, date) {
  if (event.time && !/^20\d{2}-\d{2}-\d{2}T/.test(String(event.time))) return event.time;
  if (!date) return event.time || '时间待定';
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function serializeEvent(event, joinedIds) {
  const date = getEventDate(event);
  const attendees = Number(event.attendees) || 0;
  const max = Number(event.max) || 0;
  const community = event.community !== false;
  return {
    id: event._id || event.id,
    title: event.title || '',
    description: event.description || event.summary || '',
    summary: event.summary || event.description || '',
    articleSummary: event.articleSummary || event.summary || event.description || '',
    coverImage: event.coverImage || event.coverImageFileId || event.coverImageUrl || '',
    time: formatTime(event, date),
    startAt: event.startAt || '',
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
    joined: joinedIds.has(String(event._id || event.id)),
    registrationUrl: event.registrationUrl || event.sourceUrl || '',
    sourceUrl: event.sourceUrl || '',
    sourcePlatform: event.sourcePlatform || '',
    sourceName: event.sourceName || event.organizer || '',
  };
}

async function getJoinedIds(openid) {
  if (!openid) return new Set();
  const result = await db.collection('event_registrations').where({ _openid: openid, status: 'active' }).limit(100).get().catch(() => ({ data: [] }));
  return new Set((result.data || []).map((item) => String(item.eventId)));
}

exports.main = async () => {
  try {
    const ctx = cloud.getWXContext();
    const [eventResult, joinedIds] = await Promise.all([
      db.collection('events').orderBy('startAt', 'asc').limit(200).get(),
      getJoinedIds(ctx && ctx.OPENID),
    ]);
    const events = (eventResult.data || []).filter(isPublished).map((event) => serializeEvent(event, joinedIds));
    return { code: 0, data: { events } };
  } catch (error) {
    console.error('[listPublishedEvents]', error);
    return { code: -1, message: error.message || '活动查询失败' };
  }
};

exports._private = { getDate, isPublished, serializeEvent };
