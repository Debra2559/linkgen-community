const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function getActor() {
  const ctx = cloud.getWXContext();
  if (!ctx || !ctx.OPENID) throw new Error('请先完成微信登录');
  return { openid: ctx.OPENID, unionid: ctx.UNIONID || '' };
}

function cleanText(value, max) {
  return String(value || '').trim().slice(0, max);
}

function stableMemberId(openid) {
  return `m-${crypto.createHash('sha256').update(openid).digest('hex').slice(0, 24)}`;
}

async function ensureUser(actor, patch = {}) {
  const memberId = stableMemberId(actor.openid);
  const ref = db.collection('users').doc(actor.openid);
  const current = await ref.get().catch(() => ({ data: null }));
  const data = {
    ...(current.data || {}),
    memberId,
    status: current.data && current.data.status || 'active',
    updatedAt: db.serverDate(),
    ...patch,
  };
  if (!current.data) data.createdAt = db.serverDate();
  // `_id` and `_openid` are CloudBase-managed fields; the document id is set by doc().
  delete data._id;
  delete data._openid;
  delete data.openid;
  await ref.set({ data });
  return data;
}

async function listMine(actor) {
  const user = await ensureUser(actor);
  const [postsResult, commentsResult] = await Promise.all([
    db.collection('posts').where({ authorId: user.memberId, status: 'published' }).orderBy('createdAt', 'desc').limit(50).get().catch(() => ({ data: [] })),
    db.collection('post_comments').where({ authorId: user.memberId, status: 'published' }).orderBy('createdAt', 'desc').limit(100).get().catch(() => ({ data: [] })),
  ]);
  return { user, posts: postsResult.data || [], replies: commentsResult.data || [] };
}

async function createPost(actor, payload) {
  const user = await ensureUser(actor);
  const title = cleanText(payload.title, 120);
  const content = cleanText(payload.content, 5000);
  if (!title || !content) throw new Error('标题和正文不能为空');
  const tags = Array.isArray(payload.tags) ? payload.tags.map((item) => cleanText(item, 30)).filter(Boolean).slice(0, 3) : [];
  const result = await db.collection('posts').add({ data: { authorId: user.memberId, authorName: user.name || '', title, content, tags, status: 'published', likeCount: 0, commentCount: 0, createdAt: db.serverDate(), updatedAt: db.serverDate() } });
  return { postId: result._id, authorId: user.memberId };
}

async function createComment(actor, payload) {
  const user = await ensureUser(actor);
  const postId = cleanText(payload.postId, 64);
  const content = cleanText(payload.content, 2000);
  if (!postId || !content) throw new Error('缺少帖子或回复内容');
  const post = await db.collection('posts').doc(postId).get().catch(() => ({ data: null }));
  if (!post.data || post.data.status !== 'published') throw new Error('帖子不存在或已隐藏');
  const result = await db.collection('post_comments').add({ data: { postId, authorId: user.memberId, authorName: user.name || '', content, status: 'published', createdAt: db.serverDate() } });
  await db.collection('posts').doc(postId).update({ data: { commentCount: db.command.inc(1), updatedAt: db.serverDate() } });
  return { commentId: result._id };
}

async function toggleLike(actor, payload) {
  const user = await ensureUser(actor);
  const postId = cleanText(payload.postId, 64);
  if (!postId) throw new Error('缺少帖子 ID');
  const likeId = crypto.createHash('sha256').update(`${postId}:${user.memberId}`).digest('hex').slice(0, 32);
  const likeRef = db.collection('post_likes').doc(likeId);
  const existing = await likeRef.get().catch(() => ({ data: null }));
  const postRef = db.collection('posts').doc(postId);
  const post = await postRef.get().catch(() => ({ data: null }));
  if (!post.data || post.data.status !== 'published') throw new Error('帖子不存在或已隐藏');
  if (existing.data) {
    await likeRef.remove();
    await postRef.update({ data: { likeCount: db.command.inc(-1), updatedAt: db.serverDate() } });
    return { liked: false };
  }
  await likeRef.set({ data: { postId, memberId: user.memberId, createdAt: db.serverDate() } });
  await postRef.update({ data: { likeCount: db.command.inc(1), updatedAt: db.serverDate() } });
  return { liked: true };
}

exports.main = async (event = {}) => {
  try {
    const actor = getActor();
    if (event.action === 'listMine') return { code: 0, data: await listMine(actor) };
    if (event.action === 'updateProfile') {
      const patch = { name: cleanText(event.profile && event.profile.name, 40), role: cleanText(event.profile && event.profile.role, 60), city: cleanText(event.profile && event.profile.city, 40), purpose: cleanText(event.profile && event.profile.purpose, 160), bio: cleanText(event.profile && event.profile.bio, 300), tags: Array.isArray(event.profile && event.profile.tags) ? event.profile.tags.slice(0, 3) : [] };
      return { code: 0, data: { user: await ensureUser(actor, patch) } };
    }
    if (event.action === 'createPost') return { code: 0, data: await createPost(actor, event) };
    if (event.action === 'createComment') return { code: 0, data: await createComment(actor, event) };
    if (event.action === 'toggleLike') return { code: 0, data: await toggleLike(actor, event) };
    throw new Error('不支持的社区内容操作');
  } catch (error) {
    console.error('[manageCommunityContent]', error);
    return { code: -1, message: error.message || '社区内容操作失败' };
  }
};

exports._private = { stableMemberId, cleanText };
