// 云函数 updateOrderStatus：owner 更新订单状态（仅 owner 可用）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
// 版本标记：部署后在小程序端返回里应看到 version: 'v2-0731'，用于确认云端跑的是最新代码
const VERSION = 'v2-0731';

exports.main = async (event) => {
  try {
    const { OPENID } = cloud.getWXContext();
    const { orderId, status } = event;

    // 权限校验：必须是 admins 集合中的 owner
    const admin = await db
      .collection('admins')
      .doc(OPENID)
      .get()
      .catch(() => null);
    if (!admin) {
      return { code: -1, version: VERSION, message: '只有 owner 可以操作订单' };
    }

    if (!orderId || !['pending', 'done'].includes(status)) {
      return { code: -1, version: VERSION, message: '参数错误' };
    }

    const orderRes = await db.collection('orders').doc(orderId).get();
    const order = orderRes.data;
    if (!order) return { code: -1, version: VERSION, message: '订单不存在' };

    await db.collection('orders').doc(orderId).update({
      data: {
        status,
        doneTime: status === 'done' ? db.serverDate() : null,
      },
    });

    let notificationSent = false;
    let notificationError = '';
    if (status === 'done' && order.notifySubscribed && order.notifyTemplateId && order._openid) {
      const summary = (order.items || [])
        .map((item) => `${item.name}×${item.count}`)
        .join('、')
        .slice(0, 20);
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: order._openid,
          templateId: order.notifyTemplateId,
          page: `pages/order-detail/order-detail?id=${orderId}`,
          data: {
            phrase1: { value: '已完成' },
            time2: { value: formatDate(new Date()) },
            thing3: { value: summary || '菜已做好，请及时取餐' },
          },
        });
        notificationSent = true;
      } catch (notifyError) {
        // 通知失败不回滚订单状态，避免用户已取餐但订单仍显示待处理。
        console.error('[updateOrderStatus] 订阅消息发送失败', notifyError);
        notificationError = notifyError.errMsg || notifyError.message || '订阅消息发送失败';
      }
    }

    if (status === 'done' && !order.notifySubscribed) {
      notificationError = '下单时没有允许订阅通知';
    }
    return {
      code: 0,
      version: VERSION,
      data: { ok: true, notificationSent, notificationError },
    };
  } catch (e) {
    console.error('[updateOrderStatus] 执行失败', e);
    return { code: -1, version: VERSION, message: '操作失败：' + e.message };
  }
};

function formatDate(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
