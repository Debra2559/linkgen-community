const cloud = require('wx-server-sdk');
const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 2;
const FETCH_TIMEOUT_MS = 12000;
const MAX_FETCH_RETRIES = 2;
const PLATFORMS = [
  { key: 'wechat', label: '微信公众号', hosts: ['mp.weixin.qq.com', 'weixin.qq.com'] },
  { key: 'xiaohongshu', label: '小红书', hosts: ['xiaohongshu.com', 'xhslink.com'] },
];

function normalizeUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value)) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function detectPlatform(rawUrl) {
  try {
    const url = new URL(normalizeUrl(rawUrl));
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    return PLATFORMS.find((platform) => platform.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) || null;
  } catch (error) {
    return null;
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
  const normalized = normalizeUrl(rawUrl);
  const platform = detectPlatform(normalized);
  if (!platform) throw new Error('只支持公开的微信公众号或小红书链接');
  const url = new URL(normalized);
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (addresses.some((entry) => isPrivateAddress(entry.address))) throw new Error('链接指向了内网地址');
  return platform;
}

async function requestTextOnce(rawUrl, redirectCount = 0) {
  await assertSafeUrl(rawUrl);
  const url = new URL(normalizeUrl(rawUrl));
  const client = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const request = client.get(url, { headers: { 'User-Agent': 'LinkGenActivityLinkParser/1.0', Accept: 'text/html,application/xhtml+xml' }, timeout: FETCH_TIMEOUT_MS }, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        if (redirectCount >= MAX_REDIRECTS) return reject(new Error('链接跳转次数过多'));
        const nextUrl = new URL(response.headers.location, url).toString();
        return requestText(nextUrl, redirectCount + 1).then(resolve, reject);
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        return reject(new Error(`原文返回 HTTP ${response.statusCode}`));
      }
      const chunks = [];
      let size = 0;
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        size += Buffer.byteLength(chunk);
        if (size <= MAX_RESPONSE_BYTES) chunks.push(chunk);
        else request.destroy(new Error('原文超过 2MB，无法解析'));
      });
      response.on('end', () => resolve(chunks.join('')));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('原文请求超时')));
    request.on('error', reject);
  });
}

function isRetryableFetchError(error) {
  const code = String(error && error.code || '');
  return ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENETUNREACH'].includes(code) || /原文返回 HTTP (408|425|429|500|502|503|504)|超时/i.test(String(error && error.message || ''));
}

async function requestText(rawUrl, redirectCount = 0) {
  for (let attempt = 0; attempt <= MAX_FETCH_RETRIES; attempt += 1) {
    try {
      return await requestTextOnce(rawUrl, redirectCount);
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

function cleanText(value, limit = 260) {
  const text = decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
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
      const list = Array.isArray(parsed) ? parsed : parsed && (parsed['@graph'] || [parsed]);
      const event = (list || []).find((item) => /event/i.test(String(item && item['@type'] || '')));
      if (event) return event;
    } catch (error) {
      // Ignore malformed JSON-LD and use meta tags.
    }
  }
  return {};
}

function normalizeStartAt(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!Number.isNaN(new Date(raw).getTime())) return raw;
  const match = raw.match(/^(?:(20\d{2})[年\/-])?(\d{1,2})[月\/-](\d{1,2})日?(?:\s*([0-2]?\d)[:：](\d{2}))?/);
  if (!match) return raw;
  const year = Number(match[1] || new Date().getFullYear());
  return `${year}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}T${String(match[4] || '00').padStart(2, '0')}:${String(match[5] || '00').padStart(2, '0')}:00+08:00`;
}

function extractDateText(html) {
  const text = cleanText(html, 12000);
  return (text.match(/(?:20\d{2}[年\/-]\d{1,2}[月\/-]\d{1,2}(?:日)?|\d{1,2}月\d{1,2}日)(?:\s*[0-2]?\d[:：]\d{2})?/) || [])[0] || '';
}

function extractLabeledText(html, labels) {
  const text = cleanText(html, 12000);
  const pattern = new RegExp(`(?:${labels.join('|')})\\s*[:：]\\s*([^，。；\\n]{2,100})`, 'i');
  const value = (text.match(pattern) || [])[1] || '';
  return cleanText(value.replace(/\s+(?:报名入口|报名链接|主办方|活动时间|活动地点).*$/i, ''), 100);
}

function resolveUrl(rawUrl, baseUrl) {
  try {
    return new URL(String(rawUrl || ''), baseUrl).toString();
  } catch (error) {
    return '';
  }
}

function safeResolvedUrl(rawUrl, baseUrl) {
  const value = resolveUrl(rawUrl, baseUrl);
  if (!value || !/^https?:\/\//i.test(value)) return '';
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal') || isPrivateAddress(hostname)) return '';
  } catch (error) {
    return '';
  }
  return value;
}

function extractRegistrationUrl(html, baseUrl) {
  const linkPattern = /<a\b[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkPattern.exec(String(html || '')))) {
    if (/(报名|注册|购票|预约|报名入口|ticket|register|signup)/i.test(cleanText(match[2], 100))) return safeResolvedUrl(decodeHtml(match[1]), baseUrl);
  }
  return '';
}

function classify(title, description) {
  const text = `${title} ${description}`;
  const activity = /(活动|报名|分享会|交流会|论坛|峰会|工作坊|讲座|开放日|直播|meetup|workshop|conference|summit)/i.test(text);
  const share = /(教程|指南|解读|观点|周报|复盘|测评|文章|经验)/i.test(text);
  return { contentType: activity ? 'activity' : 'share', confidence: activity && share ? 0.82 : activity ? 0.9 : 0.86 };
}

function formatTime(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return value || '待确认时间';
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function buildDraft(sourceUrl, html, platform) {
  const jsonLd = extractJsonLd(html);
  const title = cleanText(jsonLd.name || getMeta(html, 'og:title') || getMeta(html, 'twitter:title') || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1], 120);
  const summary = cleanText(jsonLd.description || getMeta(html, 'og:description') || getMeta(html, 'description'), 300);
  const type = classify(title, summary);
  const date = normalizeStartAt(jsonLd.startDate || extractDateText(html));
  const imageValue = jsonLd.image && (Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image);
  const imageUrl = safeResolvedUrl(imageValue && typeof imageValue === 'object' ? imageValue.url : imageValue || getMeta(html, 'og:image'), sourceUrl);
  const address = jsonLd.location && jsonLd.location.address;
  const location = typeof jsonLd.location === 'string' ? jsonLd.location : jsonLd.location && (jsonLd.location.name || address && (address.streetAddress || address.addressLocality)) || extractLabeledText(html, ['地点', '地址', '场地']);
  const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
  const registrationUrl = safeResolvedUrl(offers && offers.url || jsonLd.registrationUrl || extractRegistrationUrl(html, sourceUrl), sourceUrl);
  const fieldEvidence = { title: Boolean(title), summary: Boolean(summary), startAt: Boolean(date), location: Boolean(location), coverImage: Boolean(imageUrl), registrationUrl: Boolean(registrationUrl) };
  return { sourceUrl, sourceKey: platform.key, sourceLabel: platform.label, title, description: summary, summary, time: formatTime(date), startAt: date, location, registrationUrl, coverImageUrl: imageUrl, contentType: type.contentType, confidence: type.confidence, modeLabel: '服务端公开页面解析', confidenceLabel: type.confidence >= 0.85 ? '较高，仍需确认' : '需人工确认', fieldEvidence, riskFlags: Object.keys(fieldEvidence).filter((key) => !fieldEvidence[key]).map((key) => `missing_${key}`) };
}

exports.main = async (event = {}) => {
  try {
    const sourceUrl = normalizeUrl(event.url);
    const platform = await assertSafeUrl(sourceUrl);
    const html = await requestText(sourceUrl);
    const draft = buildDraft(sourceUrl, html, platform);
    if (!draft.title) throw new Error('页面没有可识别的标题');
    return { code: 0, data: draft };
  } catch (error) {
    console.error('[parseActivityLink]', error);
    return { code: -1, message: error.message || '活动链接解析失败' };
  }
};

exports._private = { normalizeUrl, detectPlatform, normalizeStartAt, extractDateText, classify, buildDraft, safeResolvedUrl, isRetryableFetchError, extractLabeledText };
