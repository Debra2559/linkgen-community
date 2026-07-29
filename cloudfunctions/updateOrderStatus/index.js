// 云函数 updateOrderStatus：owner 更新订单状态（仅 owner 可用）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { orderId, status } = event;

  // 权限校验：必须是 admins 集合中的 owner
  const admin = await db
    .collection('admins')
    .doc(OPENID)
    .get()
    .catch(() => null);
  if (!admin) {
    return { code: -1, message: '只有 owner 可以操作订单' };
  }

  if (!orderId || !['pending', 'done'].includes(status)) {
    return { code: -1, message: '参数错误' };
  }

  try {
    await db
      .collection('orders')
      .doc(orderId)
      .update({
        data: {
          status,
          doneTime: status === 'done' ? db.serverDate() : null,
        },
      });
    return { code: 0, data: { ok: true } };
  } catch (e) {
    return { code: -1, message: '操作失败：' + e.message };
  }
};
