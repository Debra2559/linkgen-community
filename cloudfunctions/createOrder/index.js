// 云函数 createOrder：创建订单（服务端核价，防止前端篡改金额）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
// 版本标记：部署后在小程序端返回里应看到 version: 'v2-0731'，用于确认云端跑的是最新代码
const VERSION = 'v2-0731';

exports.main = async (event) => {
  try {
    const { OPENID } = cloud.getWXContext();
    const {
      items,
      remark = '',
      name = '',
      notifySubscribed = false,
      notifyStatus = '',
      notifyError = '',
      notifyTemplateId = '',
    } = event;

    if (!Array.isArray(items) || items.length === 0) {
      return { code: -1, version: VERSION, message: '还没有选择菜品哦' };
    }
    if (!name.trim()) {
      return { code: -1, version: VERSION, message: '请告诉厨房是谁点的餐' };
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

    const categoryIds = [...new Set(dishRes.data.map((dish) => dish.categoryId).filter(Boolean))];
    const categoryRes = categoryIds.length
      ? await db.collection('categories').where({ _id: db.command.in(categoryIds) }).get()
      : { data: [] };
    const categoryMap = {};
    categoryRes.data.forEach((category) => {
      categoryMap[category._id] = category;
    });

    let totalPrice = 0;
    let totalCount = 0;
    const orderItems = [];
    for (const i of items) {
      const d = dishMap[i.dishId];
      const count = Math.max(1, Math.min(99, parseInt(i.count, 10) || 1));
      if (!d) continue; // 菜品已被删除则跳过
      if (d.soldOut) {
        return { code: -1, version: VERSION, message: `「${d.name}」今日已售罄，换个别的吧` };
      }
      if (d.categoryId && categoryMap[d.categoryId] && categoryMap[d.categoryId].enabled === false) {
        return { code: -1, version: VERSION, message: `「${d.name}」所属分类已下架，请重新选择` };
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
      return { code: -1, version: VERSION, message: '菜品已失效，请重新选择' };
    }

    const res = await db.collection('orders').add({
      data: {
        _openid: OPENID,
        name: name.trim().slice(0, 12),
        items: orderItems,
        totalCount,
        totalPrice: Math.round(totalPrice * 100) / 100,
        remark: remark.trim().slice(0, 100),
        notifySubscribed: !!notifySubscribed,
        notifyStatus: String(notifyStatus || '').slice(0, 32),
        notifyError: String(notifyError || '').slice(0, 160),
        notifyTemplateId: String(notifyTemplateId || '').slice(0, 128),
        status: 'pending', // pending=待处理 done=已完成
        createTime: db.serverDate(),
      },
    });

    return { code: 0, version: VERSION, data: { orderId: res._id } };
  } catch (e) {
    console.error('[createOrder] 执行失败', e);
    return { code: -1, version: VERSION, message: '下单失败：' + e.message };
  }
};
