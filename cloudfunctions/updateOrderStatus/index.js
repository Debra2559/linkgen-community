// 云函数 updateOrderStatus：owner 更新订单状态（仅 owner 可用）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
// 版本标记：部署后用于确认云端已经更新到通知诊断版本。
const VERSION = 'v3-0802';

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
    let notificationState = status === 'done' ? 'skipped' : '';
    let notificationError = '';
    let notificationCode = '';
    if (status === 'done' && !order.notifySubscribed) {
      notificationState = 'not_subscribed';
      notificationError = order.notifyError || '下单时没有允许订阅通知，请重新下单并在弹窗中选择允许';
    } else if (status === 'done' && !order.notifyTemplateId) {
      notificationState = 'missing_template';
      notificationError = '订单没有保存订阅模板 ID，请重新部署小程序后重新下单';
    } else if (status === 'done' && !order._openid) {
      notificationState = 'missing_user';
      notificationError = '订单缺少微信用户标识，无法发送通知';
    } else if (status === 'done') {
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
        notificationState = 'sent';
      } catch (notifyError) {
        // 通知失败不回滚订单状态，避免用户已取餐但订单仍显示待处理。
        console.error('[updateOrderStatus] 订阅消息发送失败', notifyError);
        notificationState = 'send_failed';
        notificationCode = String(notifyError.errCode || notifyError.errcode || notifyError.code || '');
        notificationError = formatNotificationError(notifyError);
      }
    }

    if (status === 'done') {
      await db.collection('orders').doc(orderId).update({
        data: {
          notificationSent,
          notificationState,
          notificationError,
          notificationCode,
          notificationTime: notificationSent ? db.serverDate() : null,
        },
      });
    }
    return {
      code: 0,
      version: VERSION,
      data: {
        ok: true,
        notificationSent,
        notificationState,
        notificationCode,
        notificationError,
      },
    };
  } catch (e) {
    console.error('[updateOrderStatus] 执行失败', e);
    return { code: -1, version: VERSION, message: '操作失败：' + e.message };
  }
};

function formatNotificationError(error) {
  const code = String(error && (error.errCode || error.errcode || error.code) || '');
  const raw = error && (error.errMsg || error.message) || '订阅消息发送失败';
  const known = {
    '43101': '用户未接受订阅，或该模板的订阅额度已用尽',
    '41030': '模板 ID 不存在，或未在当前小程序中配置',
    '40037': '模板 ID 无效，请核对订阅消息模板 ID',
    '47003': '模板字段与公众平台配置不匹配，请核对 phrase1、time2、thing3',
    '45009': '订阅消息接口调用频率受限，请稍后重试',
    '41028': '下单用户的微信身份无效，请重新登录下单',
  }[code];
  if (known) return `${known}（错误码 ${code}）`;
  return code ? `${raw}（错误码 ${code}）` : raw;
}

function formatDate(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
