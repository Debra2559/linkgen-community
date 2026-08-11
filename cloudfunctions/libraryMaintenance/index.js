const cloud = require('wx-server-sdk');
const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const REVIEW_AFTER_DAYS = 90;
const LINK_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 2;

function toTimestamp(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && value.$date) return new Date(value.$date).getTime();
  return new Date(value).getTime();
}

function isPrivateAddress(address) {
  const value = String(address || '').toLowerCase();
  if (net.isIP(value) === 4) {
    const parts = value.split('.').map(Number);
    return parts[0] === 10 || parts[0] === 127 || parts[0] === 169 && parts[1] === 254 || parts[0] === 192 && parts[1] === 168 || parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
  }
  if (net.isIP(value) === 6) return value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb');
  return false;
}

async function checkLink(rawUrl, redirectCount = 0, method = 'HEAD') {
  let url;
  try {
    url = new URL(String(rawUrl || '').trim());
  } catch (error) {
    return { status: 'invalid', httpStatus: 0 };
  }
  if (!['http:', 'https:'].includes(url.protocol)) return { status: 'invalid', httpStatus: 0 };
  let addresses;
  try {
    addresses = await dns.lookup(url.hostname, { all: true });
  } catch (error) {
    return { status: 'unknown', httpStatus: 0 };
  }
  if (addresses.some((entry) => isPrivateAddress(entry.address))) return { status: 'blocked', httpStatus: 0 };
  const client = url.protocol === 'https:' ? https : http;
  return new Promise((resolve) => {
    const request = client.request(url, { method, headers: { 'User-Agent': 'LinkGenLibraryMaintenance/1.0', Range: 'bytes=0-0' }, timeout: LINK_TIMEOUT_MS }, (response) => {
      const statusCode = Number(response.statusCode || 0);
      const location = response.headers.location;
      response.resume();
      if ([301, 302, 303, 307, 308].includes(statusCode) && location && redirectCount < MAX_REDIRECTS) {
        return checkLink(new URL(location, url).toString(), redirectCount + 1, method).then(resolve).catch(() => resolve({ status: 'unknown', httpStatus: statusCode }));
      }
      if (statusCode === 405 && method === 'HEAD') return checkLink(url.toString(), redirectCount, 'GET').then(resolve).catch(() => resolve({ status: 'unknown', httpStatus: statusCode }));
      if (statusCode >= 200 && statusCode < 400) return resolve({ status: 'ok', httpStatus: statusCode });
      if ([401, 403].includes(statusCode)) return resolve({ status: 'restricted', httpStatus: statusCode });
      return resolve({ status: 'broken', httpStatus: statusCode });
    });
    request.on('timeout', () => { request.destroy(); resolve({ status: 'unknown', httpStatus: 0 }); });
    request.on('error', () => resolve({ status: 'unknown', httpStatus: 0 }));
    request.end();
  });
}

async function requireAdminIfManual() {
  const ctx = cloud.getWXContext();
  if (!ctx || !ctx.OPENID) return '';
  const admin = await db.collection('admins').doc(ctx.OPENID).get().catch(() => null);
  if (!admin || !admin.data || admin.data.status === 'disabled') throw new Error('无权运行资料复核');
  return ctx.OPENID;
}

exports.main = async () => {
  try {
    const actor = await requireAdminIfManual();
    const cutoff = Date.now() - REVIEW_AFTER_DAYS * 24 * 60 * 60 * 1000;
    const result = await db.collection('library_resources').where({ reviewStatus: 'published' }).limit(200).get();
    let marked = 0;
    let checked = 0;
    let broken = 0;
    let restricted = 0;
    for (const resource of result.data || []) {
      const updatedAt = toTimestamp(resource.updatedAt || resource.createdAt);
      const link = await checkLink(resource.sourceUrl);
      checked += 1;
      if (link.status === 'broken') broken += 1;
      if (link.status === 'restricted') restricted += 1;
      const stale = !updatedAt || updatedAt <= cutoff;
      const needsRecheck = stale || link.status === 'broken';
      const data = { linkStatus: link.status, linkHttpStatus: link.httpStatus, lastLinkCheckAt: db.serverDate(), updatedAt: db.serverDate() };
      if (needsRecheck) {
        data.reviewStatus = 'needs_recheck';
        data.needsRecheckAt = db.serverDate();
        data.needsRecheckReason = link.status === 'broken' ? 'source_link_broken' : 'stale_content';
        marked += 1;
      }
      await db.collection('library_resources').doc(resource._id).update({ data });
      if (needsRecheck) await db.collection('audit_logs').add({ data: { action: 'mark_library_resource_needs_recheck', actor: actor || 'scheduled', resourceId: resource._id, reason: data.needsRecheckReason, createdAt: db.serverDate() } });
    }
    return { code: 0, data: { marked, checked, broken, restricted, cutoffDays: REVIEW_AFTER_DAYS } };
  } catch (error) {
    console.error('[libraryMaintenance]', error);
    return { code: -1, message: error.message || '资料复核任务失败' };
  }
};

exports._private = { toTimestamp, isPrivateAddress, checkLink };
