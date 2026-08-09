// 云函数 listOrders：订单列表
// owner 看全部订单（可按状态筛选），普通成员只能看自己下的单
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
// 版本标记：部署后在小程序端返回里应看到 version: 'v2-0731'，用于确认云端跑的是最新代码
const VERSION = 'v2-0731';

exports.main = async (event) => {
  try {
    const { OPENID } = cloud.getWXContext();
    const { status = '', page = 1, pageSize = 20 } = event || {};

    const admin = await db
      .collection('admins')
      .doc(OPENID)
      .get()
      .catch(() => null);
    const isOwner = !!admin;

    const where = {};
    if (!isOwner) {
      where._openid = OPENID;
    }
    if (status && ['pending', 'done'].includes(status)) {
      where.status = status;
    }

    const res = await db
      .collection('orders')
      .where(where)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    // owner 视角额外给一个待处理总数，方便展示角标
    let pendingTotal = 0;
    if (isOwner) {
      const c = await db
        .collection('orders')
        .where({ status: 'pending' })
        .count();
      pendingTotal = c.total;
    }

    return {
      code: 0,
      version: VERSION,
      data: { list: res.data, isOwner, pendingTotal, viewerOpenid: OPENID },
    };
  } catch (e) {
    console.error('[listOrders] 执行失败', e);
    return { code: -1, version: VERSION, message: '订单加载失败：' + e.message };
  }
};
