const sourceList = [
  { key: 'wechat', label: '微信公众号', hosts: ['mp.weixin.qq.com', 'weixin.qq.com'] },
  { key: 'xiaohongshu', label: '小红书', hosts: ['xiaohongshu.com', 'www.xiaohongshu.com', 'xhslink.com'] },
];

function normalizeUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function detectSource(rawUrl) {
  const normalizedUrl = normalizeUrl(rawUrl);
  const hostMatch = normalizedUrl.match(/^https?:\/\/([^/?#]+)/i);
  const host = hostMatch ? hostMatch[1].toLowerCase().replace(/^www\./, '') : '';
  const source = sourceList.find((item) => item.hosts.some((itemHost) => itemHost.replace(/^www\./, '') === host || host.endsWith(`.${itemHost.replace(/^www\./, '')}`)));
  return source ? { ...source, normalizedUrl } : null;
}

function buildLocalDraft(rawUrl) {
  const source = detectSource(rawUrl);
  if (!source) return null;
  return {
    sourceKey: source.key,
    sourceLabel: source.label,
    sourceUrl: source.normalizedUrl,
    modeLabel: '本地演示解析',
    confidenceLabel: '需人工确认',
    title: `${source.label}活动（待核对）`,
    description: `已识别${source.label}链接，请核对活动正文、时间、地点和报名信息。`,
    time: '待确认时间',
    location: '待确认地点',
    expectedCount: '30',
  };
}

module.exports = { detectSource, buildLocalDraft, sourceList };
