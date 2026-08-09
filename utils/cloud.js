// utils/cloud.js - 云函数调用统一封装
// 约定所有云函数返回 { code: 0, data } 或 { code: -1, message }
const call = (name, data = {}) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        const r = res.result || {};
        if (r.code === 0) {
          resolve(r.data || {});
          return;
        }
        reject(new Error(r.message || r.errMsg || r.error || `[${name}] 云函数返回格式异常，请重新上传并部署`));
      },
      fail: (err) => {
        reject(new Error(`[${name}] ${err.errMsg || '网络异常，请稍后重试'}`));
      },
    });
  });
};

// 金额格式化：12.5 -> "12.50"
const fen2yuanText = (n) => {
  return (Math.round((n || 0) * 100) / 100).toFixed(2);
};

// 时间格式化：Date/毫秒 -> "MM-DD HH:mm"
const formatTime = (t) => {
  if (!t) return '';
  const d = new Date(t);
  if (isNaN(d.getTime())) return '';
  const pad = (v) => (v < 10 ? '0' + v : '' + v);
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

module.exports = { call, fen2yuanText, formatTime };
