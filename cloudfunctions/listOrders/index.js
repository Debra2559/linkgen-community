// 云函数 listOrders：订单列表
// owner 看全部订单（可按状态筛选），普通成员只能看自己下的单
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { status = '', page = 1, pageSize = 20 } = event;

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

  try {
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
      data: { list: res.data, isOwner, pendingTotal },
    };
  } catch (e) {
    return { code: -1, message: '订单加载失败：' + e.message };
  }
};
