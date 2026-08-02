// 微信公众平台「订阅消息」模板 ID。申请模板后填入，不填则跳过通知请求。
const ORDER_DONE_TEMPLATE_ID = 'ntENoI8OqYpq03k_tK0WapkdV6qBZABp-JZw0Q5rCvk';

function requestOrderDoneSubscription() {
  if (!ORDER_DONE_TEMPLATE_ID || typeof wx.requestSubscribeMessage !== 'function') {
    return Promise.resolve({ accepted: false, templateId: ORDER_DONE_TEMPLATE_ID });
  }

  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: [ORDER_DONE_TEMPLATE_ID],
      success: (result) => {
        resolve({
          accepted: result[ORDER_DONE_TEMPLATE_ID] === 'accept',
          status: result[ORDER_DONE_TEMPLATE_ID] || 'unknown',
          templateId: ORDER_DONE_TEMPLATE_ID,
        });
      },
      fail: (error) => resolve({
        accepted: false,
        status: 'error',
        error: error.errMsg || '订阅请求失败',
        templateId: ORDER_DONE_TEMPLATE_ID,
      }),
    });
  });
}

module.exports = { ORDER_DONE_TEMPLATE_ID, requestOrderDoneSubscription };
