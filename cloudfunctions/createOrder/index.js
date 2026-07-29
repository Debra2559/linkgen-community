// 云函数 createOrder：创建订单（服务端核价，防止前端篡改金额）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { items, remark = '', name = '' } = event;

  if (!Array.isArray(items) || items.length === 0) {
    return { code: -1, message: '还没有选择菜品哦' };
  }
  if (!name.trim()) {
    return { code: -1, message: '请告诉厨房是谁点的餐' };
  }

  // 服务端重新取价，不信任前端价格
  const ids = items.map((i) => i.dishId);
  const dishRes = await db
    .collection('dishes')
    .where({ _id: db.command.in(ids) })
    .get();
  const dishMap = {};
  dishRes.data.forEach((d) => {
    dishMap[d._id] = d;
  });

  let totalPrice = 0;
  let totalCount = 0;
  const orderItems = [];
  for (const i of items) {
    const d = dishMap[i.dishId];
    const count = Math.max(1, Math.min(99, parseInt(i.count, 10) || 1));
    if (!d) continue; // 菜品已被删除则跳过
    if (d.soldOut) {
      return { code: -1, message: `「${d.name}」今日已售罄，换个别的吧` };
    }
    totalPrice += d.price * count;
    totalCount += count;
    orderItems.push({
      dishId: d._id,
      name: d.name,
      price: d.price,
      emoji: d.emoji || '',
      count,
    });
  }

  if (orderItems.length === 0) {
    return { code: -1, message: '菜品已失效，请重新选择' };
  }

  const res = await db.collection('orders').add({
    data: {
      _openid: OPENID,
      name: name.trim().slice(0, 12),
      items: orderItems,
      totalCount,
      totalPrice: Math.round(totalPrice * 100) / 100,
      remark: remark.trim().slice(0, 100),
      status: 'pending', // pending=待处理 done=已完成
      createTime: db.serverDate(),
    },
  });

  return { code: 0, data: { orderId: res._id } };
};
