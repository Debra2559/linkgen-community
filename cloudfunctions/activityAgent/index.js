const cloud = require('wx-server-sdk');
const crypto = require('crypto');
const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 2;
const FETCH_TIMEOUT_MS = 12000;
const MAX_FETCH_RETRIES = 2;
const RUN_LOCK_TTL_MS = 30 * 60 * 1000;
const ALLOWED_PLATFORM_STATUS = new Set(['owned', 'authorized', 'public_link']);

function normalizeUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value)) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function resolveUrl(rawUrl, baseUrl) {
  try {
    return new URL(normalizeUrl(rawUrl), baseUrl).toString();
  } catch (error) {
    return '';
  }
}

function safeResolvedUrl(rawUrl, baseUrl) {
  const value = resolveUrl(rawUrl, baseUrl);
  if (!isPublicHttpUrl(value) || isBlockedHost(value)) return '';
  return value;
}

function isPublicHttpUrl(rawUrl) {
  try {
    const url = new URL(normalizeUrl(rawUrl));
    const hostname = url.hostname.toLowerCase();
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(hostname);
  } catch (error) {
    return false;
  }
}

function isBlockedHost(rawUrl) {
  try {
    const hostname = new URL(normalizeUrl(rawUrl)).hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (hostname === 'localhost' || hostname.endsWith('.internal') || hostname.endsWith('.local')) return true;
    return isPrivateAddress(hostname);
  } catch (error) {
    return true;
  }
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

async function assertSafeUrl(rawUrl) {
  if (!isPublicHttpUrl(rawUrl) || isBlockedHost(rawUrl)) throw new Error('source URL is not an allowed public HTTP URL');
  const hostname = new URL(normalizeUrl(rawUrl)).hostname.replace(/^\[|\]$/g, '');
  const addresses = await dns.lookup(hostname, { all: true });
  if (addresses.some((entry) => isPrivateAddress(entry.address))) throw new Error('source URL resolves to a private network address');
}

async function requestTextOnce(rawUrl, redirectCount = 0, requestHeaders = {}) {
  await assertSafeUrl(rawUrl);
  const url = new URL(normalizeUrl(rawUrl));
  const client = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const request = client.get(url, { headers: { 'User-Agent': 'LinkGenActivityAgent/1.0', Accept: 'text/html,application/xhtml+xml,application/json', ...requestHeaders }, timeout: FETCH_TIMEOUT_MS }, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        if (redirectCount >= MAX_REDIRECTS) return reject(new Error('too many redirects'));
        return requestText(new URL(response.headers.location, url).toString(), redirectCount + 1, requestHeaders).then(resolve, reject);
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        return reject(new Error(`source returned HTTP ${response.statusCode}`));
      }
      const chunks = [];
      let size = 0;
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        size += Buffer.byteLength(chunk);
        if (size <= MAX_RESPONSE_BYTES) chunks.push(chunk);
        else request.destroy(new Error('source response exceeds 2 MB'));
      });
      response.on('end', () => resolve(chunks.join('')));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('source request timed out')));
    request.on('error', reject);
  });
}

function isRetryableFetchError(error) {
  const code = String(error && error.code || '');
  return ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENETUNREACH'].includes(code) || /source returned HTTP (408|425|429|500|502|503|504)|timed out/i.test(String(error && error.message || ''));
}

async function requestText(rawUrl, redirectCount = 0, requestHeaders = {}) {
  for (let attempt = 0; attempt <= MAX_FETCH_RETRIES; attempt += 1) {
    try {
      return await requestTextOnce(rawUrl, redirectCount, requestHeaders);
    } catch (error) {
      if (!isRetryableFetchError(error) || attempt === MAX_FETCH_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw new Error('source request failed');
}

function decodeHtml(value) {
  return String(value || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function cleanText(value, limit = 220) {
  const text = decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function extractDateText(html) {
  const text = cleanText(html, 8000);
  return (text.match(/(?:20\d{2}[年\/-]\d{1,2}[月\/-]\d{1,2}(?:日)?|\d{1,2}月\d{1,2}日)(?:\s*[0-2]?\d[:：]\d{2})?/) || [])[0] || '';
}

function extractFeedLinks(xml, feedUrl) {
  const links = [];
  const entries = String(xml || '').match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) || [];
  for (const entry of entries) {
    const hrefMatch = entry.match(/<link\b[^>]+href=["']([^"']+)["']/i);
    const textMatch = entry.match(/<link\b[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const link = resolveUrl((hrefMatch || textMatch || [])[1], feedUrl);
    if (link && !links.includes(link)) links.push(link);
  }
  return links.slice(0, 30);
}

function normalizeStartAt(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!Number.isNaN(new Date(raw).getTime())) return raw;
  const match = raw.match(/^(?:(20\d{2})[年\/-])?(\d{1,2})[月\/-](\d{1,2})日?(?:\s*([0-2]?\d)[:：](\d{2}))?/);
  if (!match) return raw;
  const year = Number(match[1] || new Date().getFullYear());
  const month = String(match[2]).padStart(2, '0');
  const day = String(match[3]).padStart(2, '0');
  const hour = String(match[4] || '00').padStart(2, '0');
  const minute = String(match[5] || '00').padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:00+08:00`;
}

function isFutureStartAt(value) {
  const time = new Date(value || '').getTime();
  return Number.isFinite(time) && time > Date.now() - 60 * 60 * 1000;
}

function extractLabeledText(html, labels) {
  const text = cleanText(html, 12000);
  const pattern = new RegExp(`(?:${labels.join('|')})\\s*[:：]\\s*([^，。；\\n]{2,100})`, 'i');
  const value = (text.match(pattern) || [])[1] || '';
  return cleanText(value.replace(/\s+(?:报名入口|报名链接|主办方|活动时间|活动地点).*$/i, ''), 100);
}

function extractRegistrationUrl(html, baseUrl) {
  const linkPattern = /<a\b[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkPattern.exec(String(html || '')))) {
    const text = cleanText(match[2], 100);
    if (/(报名|注册|购票|预约|报名入口|ticket|register|signup|eventbrite)/i.test(text)) {
      const url = safeResolvedUrl(decodeHtml(match[1]), baseUrl);
      if (url) return url;
    }
  }
  return '';
}

function getMeta(html, name) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i');
  const reversePattern = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i');
  return decodeHtml((html.match(pattern) || html.match(reversePattern) || [])[1] || '');
}

function extractJsonLd(html) {
  const matches = [...String(html || '').matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const list = Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed];
      const event = list.find((item) => /event/i.test(String(item && item['@type'] || '')));
      if (event) return event;
    } catch (error) {
      // Ignore malformed JSON-LD and continue with meta tags.
    }
  }
  return {};
}

function classifyContent(title, description) {
  const text = `${title} ${description}`;
  const activity = /(活动|报名|分享会|交流会|论坛|峰会|工作坊|讲座|开放日|直播|meetup|workshop|conference|summit)/i.test(text);
  const share = /(教程|指南|解读|观点|周报|复盘|测评|分享经验|文章)/i.test(text);
  return activity ? { type: 'activity', confidence: share ? 0.82 : 0.9 } : { type: 'share', confidence: 0.88 };
}

function buildCandidate(source, html, rawSourceUrl = source.url, searchHit = {}) {
  const jsonLd = extractJsonLd(html);
  const title = cleanText(jsonLd.name || getMeta(html, 'og:title') || getMeta(html, 'twitter:title') || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || searchHit.name, 120);
  const description = cleanText(jsonLd.description || getMeta(html, 'og:description') || getMeta(html, 'description') || searchHit.snippet, 260);
  const classification = classifyContent(title, description);
  const startAt = jsonLd.startDate || '';
  const jsonLdImage = jsonLd.image && (Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image);
  const imageValue = jsonLdImage && typeof jsonLdImage === 'object' ? jsonLdImage.url : jsonLdImage;
  const imageUrl = safeResolvedUrl(imageValue || getMeta(html, 'og:image') || searchHit.thumbnailUrl || '', rawSourceUrl);
  const locationAddress = jsonLd.location && jsonLd.location.address;
  const location = typeof jsonLd.location === 'string' ? jsonLd.location : jsonLd.location && (jsonLd.location.name || (locationAddress && (locationAddress.streetAddress || locationAddress.addressLocality || locationAddress.name))) || extractLabeledText(html, ['地点', '地址', '场地']);
  const organizer = typeof jsonLd.organizer === 'string' ? jsonLd.organizer : jsonLd.organizer && jsonLd.organizer.name || source.name;
  const sourceUrl = normalizeUrl(rawSourceUrl);
  const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
  const registrationUrl = safeResolvedUrl(offers && offers.url || jsonLd.registrationUrl || extractRegistrationUrl(html, sourceUrl), sourceUrl);
  const extractedTime = normalizeStartAt(startAt || extractDateText(html));
  const qualityReasons = [classification.type === 'activity' ? '活动意图明确' : '内容更像资料分享', extractedTime ? '已提取未来时间' : '缺少明确时间', imageUrl ? '已有活动图片' : '缺少活动图片', source.focus ? '重点来源' : '普通来源'];
  const score = Math.round((classification.confidence * 70) + (extractedTime ? 15 : 0) + (imageUrl ? 5 : 0) + (source.focus ? 10 : 0));
  const canonicalUrl = safeResolvedUrl(getMeta(html, 'og:url') || sourceUrl, sourceUrl) || sourceUrl;
  const eventFingerprint = crypto.createHash('sha256').update(`${title.toLowerCase()}|${extractedTime}|${String(location || '').toLowerCase()}`).digest('hex');
  return { sourceUrl, canonicalUrl, sourcePlatform: source.platform, sourceAccount: source.name, authorizationStatus: source.authorizationStatus || 'unknown', title, description, summary: description, articleSummary: description, contentType: classification.type, confidence: classification.confidence, qualityScore: score, qualityReasons, coverImageUrl: imageUrl, startAt: extractedTime, location, organizer, registrationUrl, scope: source.defaultScope || 'featured', fieldEvidence: { title: Boolean(title), startAt: Boolean(extractedTime), location: Boolean(location), coverImage: Boolean(imageUrl), registrationUrl: Boolean(registrationUrl) }, riskFlags: [!extractedTime && 'missing_start_time', !location && 'missing_location', !imageUrl && 'missing_cover_image', !registrationUrl && 'missing_registration_url'].filter(Boolean), fetchedAt: new Date().toISOString(), contentHash: crypto.createHash('sha256').update(`${canonicalUrl}|${title}|${extractedTime}|${source.name}`).digest('hex'), eventFingerprint };
}

async function searchWeb(query, settings = {}) {
  const apiKey = process.env.BING_SEARCH_KEY;
  if (!apiKey) throw new Error('search_not_configured');
  const endpoint = String(process.env.BING_SEARCH_ENDPOINT || settings.searchEndpoint || 'https://api.bing.microsoft.com/v7.0/search');
  const url = new URL(endpoint);
  url.searchParams.set('q', String(query || '').slice(0, 200));
  url.searchParams.set('count', '10');
  url.searchParams.set('mkt', 'zh-CN');
  const body = await requestText(url.toString(), 0, { 'Ocp-Apim-Subscription-Key': apiKey, Accept: 'application/json' });
  const parsed = JSON.parse(body);
  return (parsed.webPages && parsed.webPages.value || []).map((item) => ({ name: cleanText(item.name, 120), url: item.url, snippet: cleanText(item.snippet, 260), thumbnailUrl: item.thumbnailUrl || '' })).filter((item) => isPublicHttpUrl(item.url));
}

function isAllowedSearchResult(rawUrl, source) {
  const allowedDomains = Array.isArray(source.allowedDomains) ? source.allowedDomains.map((item) => String(item).toLowerCase().replace(/^www\./, '')) : [];
  if (!allowedDomains.length) return true;
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
    return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch (error) {
    return false;
  }
}

async function assertAdmin(openid) {
  if (!openid) return;
  const result = await db.collection('admins').doc(openid).get().catch(() => null);
  if (!result || !result.data || result.data.status === 'disabled') throw new Error('无权运行活动巡查');
}

async function getSources() {
  const result = await db.collection('agent_sources').where({ enabled: true }).limit(100).get();
  return result.data || [];
}

async function getAgentSettings() {
  const result = await db.collection('agent_settings').doc('default').get().catch(() => null);
  return result && result.data ? result.data : { enabled: true };
}

async function saveSourceItem(candidate) {
  const collection = db.collection('source_items');
  const existing = await collection.where({ canonicalUrl: candidate.canonicalUrl }).limit(1).get();
  if (existing.data && existing.data.length) {
    await collection.doc(existing.data[0]._id).update({ data: { ...candidate, updatedAt: db.serverDate() } });
    return existing.data[0]._id;
  }
  const result = await collection.add({ data: { ...candidate, createdAt: db.serverDate(), updatedAt: db.serverDate() } });
  return result._id;
}

async function saveActivityCandidate(candidate, sourceItemId) {
  const collection = db.collection('activity_candidates');
  const byFingerprint = candidate.eventFingerprint
    ? await collection.where({ eventFingerprint: candidate.eventFingerprint }).limit(1).get()
    : { data: [] };
  const existing = byFingerprint.data && byFingerprint.data.length
    ? byFingerprint
    : await collection.where({ contentHash: candidate.contentHash }).limit(1).get();
  if (existing.data && existing.data.length) {
    await collection.doc(existing.data[0]._id).update({ data: { ...candidate, sourceItemId, updatedAt: db.serverDate() } });
    return { id: existing.data[0]._id, created: false };
  }
  const stableId = `ac-${String(candidate.contentHash || '').slice(0, 29)}`;
  const existingStable = await collection.doc(stableId).get().catch(() => ({ data: null }));
  if (existingStable.data) return { id: stableId, created: false };
  await collection.doc(stableId).set({ data: { ...candidate, sourceItemId, reviewStatus: 'pending', createdAt: db.serverDate(), updatedAt: db.serverDate() } });
  return { id: stableId, created: true };
}

async function notifyAdmins(candidates, runId, settings = {}) {
  const templateId = process.env.AGENT_NOTIFY_TEMPLATE_ID || settings.notificationTemplateId;
  if (!templateId || !candidates.length) return { status: 'not_configured', sent: 0 };
  const admins = await db.collection('admins').where({ agentNotify: true }).limit(50).get();
  let sent = 0;
  const errors = [];
  for (const admin of (admins.data || []).filter((item) => item.status !== 'disabled')) {
    try {
      const fields = settings.notificationFields || {};
      const data = {};
      const titleField = fields.title || 'thing1';
      const countField = fields.count || 'number2';
      const taskField = fields.task || 'thing3';
      data[titleField] = { value: cleanText(candidates[0].title, 20) };
      data[countField] = { value: String(candidates.length) };
      data[taskField] = { value: `巡查任务 ${runId}` };
      await cloud.openapi.subscribeMessage.send({ touser: admin._openid || admin._id, templateId, page: 'pages/admin-review/admin-review', data });
      sent += 1;
    } catch (error) {
      errors.push({ adminId: admin._id, message: error.message || '发送失败' });
    }
  }
  return { status: errors.length ? (sent ? 'partial' : 'failed') : 'sent', sent, errors };
}

async function markCandidatesNotified(candidates, notification) {
  if (!notification || !['sent', 'partial'].includes(notification.status)) return;
  await Promise.all((candidates || []).map((candidate) => db.collection('activity_candidates').doc(candidate.id).update({ data: { notificationStatus: 'sent', notifiedAt: db.serverDate(), updatedAt: db.serverDate() } }).catch(() => null)));
}

async function findActiveRun() {
  const result = await db.collection('agent_runs').where({ status: 'running' }).limit(10).get().catch(() => ({ data: [] }));
  const now = Date.now();
  return (result.data || []).find((item) => {
    const startedAt = new Date(item.startedAt || '').getTime();
    return Number.isFinite(startedAt) && now - startedAt < RUN_LOCK_TTL_MS;
  }) || null;
}

async function updateRun(runId, data) {
  await db.collection('agent_runs').doc(runId).update({ data }).catch((error) => console.error('[activityAgent] update run failed', error));
}

async function processSourceUrl(source, sourceUrl, result, searchHit = {}) {
  try {
    const html = await requestText(sourceUrl);
    const candidate = buildCandidate(source, html, sourceUrl, searchHit);
    result.scanned += 1;
    if (candidate.contentType === 'share') {
      result.shares += 1;
      await saveSourceItem(candidate);
      await db.collection('agent_sources').doc(source._id || source.id).update({ data: { lastScanAt: db.serverDate(), lastScanStatus: 'success', updatedAt: db.serverDate() } }).catch(() => null);
      return;
    }
    result.activities += 1;
    const sourceItemId = await saveSourceItem(candidate);
    if (candidate.qualityScore >= Number(source.qualityThreshold || 75) && candidate.title && isFutureStartAt(candidate.startAt)) {
      const saved = await saveActivityCandidate(candidate, sourceItemId);
      if (saved.created) result.candidates.push({ id: saved.id, title: candidate.title, source: candidate.sourceAccount, sourceUrl: candidate.sourceUrl, registrationUrl: candidate.registrationUrl, coverImageUrl: candidate.coverImageUrl, summary: candidate.summary, startAt: candidate.startAt, location: candidate.location, contentType: candidate.contentType, scope: candidate.scope, qualityScore: candidate.qualityScore, qualityReasons: candidate.qualityReasons, riskFlags: candidate.riskFlags });
    } else if (candidate.qualityScore >= Number(source.qualityThreshold || 75)) {
      result.skipped.push({ source: source.name, sourceUrl: candidate.sourceUrl, reason: 'missing_or_past_activity_time', contentHash: candidate.contentHash });
    }
    await db.collection('agent_sources').doc(source._id || source.id).update({ data: { lastScanAt: db.serverDate(), lastScanStatus: 'success', updatedAt: db.serverDate() } }).catch(() => null);
  } catch (error) {
    result.errors.push({ source: source.name, sourceUrl, message: error.message });
    await db.collection('agent_sources').doc(source._id || source.id).update({ data: { lastScanAt: db.serverDate(), lastScanStatus: 'failed', lastScanError: error.message, updatedAt: db.serverDate() } }).catch(() => null);
  }
}

async function runAgent() {
  const runId = `agent-${Date.now()}`;
  const activeRun = await findActiveRun();
  if (activeRun) {
    return { runId, status: 'already_running', activeRunId: activeRun.runId || activeRun._id, notification: { status: 'skipped', sent: 0 } };
  }
  await db.collection('agent_runs').doc(runId).set({ data: { runId, status: 'running', startedAt: new Date().toISOString(), createdAt: db.serverDate() } });
  const settings = await getAgentSettings();
  const result = { runId, scanned: 0, searches: 0, activities: 0, shares: 0, candidates: [], skipped: [], errors: [] };
  try {
    if (settings.enabled === false) {
      result.status = 'paused';
      result.notification = { status: 'paused', sent: 0 };
      await updateRun(runId, { ...result, completedAt: new Date().toISOString() });
      return result;
    }
    const sources = await getSources();
    if (!sources.length) {
      result.status = 'no_sources';
      result.notification = { status: 'not_configured', sent: 0 };
      await updateRun(runId, { ...result, completedAt: new Date().toISOString() });
      return result;
    }
    for (const source of sources) {
      if (!source.enabled) continue;
      if (source.kind === 'search') {
        if (!ALLOWED_PLATFORM_STATUS.has(source.authorizationStatus || 'unknown')) {
          result.skipped.push({ source: source.name, reason: 'authorization_required' });
          continue;
        }
        if (!source.query) {
          result.skipped.push({ source: source.name, reason: 'missing_search_query' });
          continue;
        }
        try {
          const hits = await searchWeb(source.query, settings);
          result.searches += 1;
          const maxResults = Math.max(1, Math.min(10, Number(source.maxResults || 5)));
          for (const hit of hits.filter((item) => isAllowedSearchResult(item.url, source)).slice(0, maxResults)) {
            await processSourceUrl(source, hit.url, result, hit);
          }
        } catch (error) {
          result.skipped.push({ source: source.name, reason: error.message === 'search_not_configured' ? 'search_not_configured' : 'search_failed', message: error.message });
        }
        continue;
      }
      if (source.kind === 'feed') {
        const feedUrls = (Array.isArray(source.urls) && source.urls.length ? source.urls : [source.url]).filter(Boolean);
        if (!feedUrls.length) {
          result.skipped.push({ source: source.name, reason: 'missing_feed_url' });
          continue;
        }
        if (!ALLOWED_PLATFORM_STATUS.has(source.authorizationStatus || 'unknown')) {
          result.skipped.push({ source: source.name, reason: 'authorization_required' });
          continue;
        }
        for (const feedUrl of feedUrls) {
          try {
            const feed = await requestText(feedUrl);
            const links = extractFeedLinks(feed, feedUrl);
            if (!links.length) result.skipped.push({ source: source.name, sourceUrl: feedUrl, reason: 'feed_has_no_items' });
            for (const link of links) await processSourceUrl(source, link, result);
            await db.collection('agent_sources').doc(source._id || source.id).update({ data: { lastScanAt: db.serverDate(), lastScanStatus: 'success', updatedAt: db.serverDate() } }).catch(() => null);
          } catch (error) {
            result.errors.push({ source: source.name, sourceUrl: feedUrl, message: error.message });
            await db.collection('agent_sources').doc(source._id || source.id).update({ data: { lastScanAt: db.serverDate(), lastScanStatus: 'failed', lastScanError: error.message, updatedAt: db.serverDate() } }).catch(() => null);
          }
        }
        continue;
      }
      const sourceUrls = (Array.isArray(source.urls) && source.urls.length ? source.urls : [source.url]).filter(Boolean);
      if (!sourceUrls.length) {
        result.skipped.push({ source: source.name, reason: 'missing_source_url' });
        continue;
      }
      if (!ALLOWED_PLATFORM_STATUS.has(source.authorizationStatus || 'unknown')) {
        result.skipped.push({ source: source.name, reason: 'authorization_required' });
        continue;
      }
      for (const sourceUrl of sourceUrls) await processSourceUrl(source, sourceUrl, result);
    }
    result.notification = await notifyAdmins(result.candidates, runId, settings).catch((error) => ({ status: 'failed', sent: 0, message: error.message }));
    await markCandidatesNotified(result.candidates, result.notification);
    result.status = result.errors.length ? 'partial' : 'success';
    await updateRun(runId, { ...result, completedAt: new Date().toISOString() });
    return result;
  } catch (error) {
    await updateRun(runId, { ...result, status: 'failed', error: error.message || '巡查失败', completedAt: new Date().toISOString() });
    throw error;
  }
}

exports.main = async () => {
  try {
    const ctx = cloud.getWXContext();
    await assertAdmin(ctx && ctx.OPENID);
    return { code: 0, data: await runAgent() };
  } catch (error) {
    console.error('[activityAgent]', error);
    return { code: -1, message: error.message || '活动巡查失败' };
  }
};

exports._private = { normalizeUrl, resolveUrl, safeResolvedUrl, isPublicHttpUrl, isBlockedHost, isRetryableFetchError, classifyContent, buildCandidate, cleanText, normalizeStartAt, isFutureStartAt, extractFeedLinks, extractRegistrationUrl, extractLabeledText };
