// 云函数 manageMenu：Owner 管理分类和菜品
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const VERSION = 'v2-0731';
const SUPPLY_TYPES = ['stock', 'purchase', 'retail'];

async function getOwner(openid) {
  return db.collection('admins').doc(openid).get().catch(() => null);
}

function cleanDish(event) {
  const name = String(event.name || '').trim().slice(0, 24);
  const desc = String(event.desc || '').trim().slice(0, 60);
  const price = Number(event.price);
  if (!name) throw new Error('菜品名称不能为空');
  if (!event.categoryId) throw new Error('请选择分类');
  if (!Number.isFinite(price) || price < 0) throw new Error('价格必须是有效数字');
  const supplyType = SUPPLY_TYPES.includes(event.supplyType) ? event.supplyType : 'stock';
  return {
    name,
    desc,
    price: Math.round(price * 100) / 100,
    categoryId: event.categoryId,
    image: String(event.image || '').trim().slice(0, 500),
    emoji: String(event.emoji || '✦').slice(0, 4),
    supplyType,
    fitnessRecommended: !!event.fitnessRecommended,
    soldOut: !!event.soldOut,
    sort: Number(event.sort) || 99,
  };
}

function cleanCategory(event) {
  const name = String(event.name || '').trim().slice(0, 18);
  if (!name) throw new Error('分类名称不能为空');
  return {
    name,
    sort: Number(event.sort) || 99,
    enabled: event.enabled !== false,
  };
}

exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext();
    if (!(await getOwner(OPENID))) {
      return { code: -1, version: VERSION, message: '只有 Owner 可以配置菜单' };
    }

    const action = event.action || 'list';
    if (action === 'list') {
      const [categoryRes, dishRes] = await Promise.all([
        db.collection('categories').orderBy('sort', 'asc').get(),
        db.collection('dishes').orderBy('sort', 'asc').limit(100).get(),
      ]);
      return {
        code: 0,
        version: VERSION,
        data: { categories: categoryRes.data, dishes: dishRes.data },
      };
    }

    if (action === 'upsert') {
      const data = cleanDish(event);
      if (event.dishId) {
        await db.collection('dishes').doc(event.dishId).update({ data });
      } else {
        await db.collection('dishes').add({ data });
      }
      return { code: 0, version: VERSION, data: { ok: true } };
    }

    if (action === 'upsertCategory') {
      const data = cleanCategory(event);
      if (event.categoryId) {
        await db.collection('categories').doc(event.categoryId).update({ data });
      } else {
        await db.collection('categories').add({ data });
      }
      return { code: 0, version: VERSION, data: { ok: true } };
    }

    if (action === 'toggleCategory') {
      if (!event.categoryId) throw new Error('缺少分类 ID');
      await db.collection('categories').doc(event.categoryId).update({
        data: { enabled: event.enabled !== false },
      });
      return { code: 0, version: VERSION, data: { ok: true } };
    }

    if (action === 'reorderCategories') {
      const categoryIds = [...new Set(Array.isArray(event.categoryIds) ? event.categoryIds.filter(Boolean) : [])].slice(0, 100);
      if (!categoryIds.length) throw new Error('没有可排序的分类');
      await Promise.all(
        categoryIds.map((categoryId, index) =>
          db.collection('categories').doc(categoryId).update({ data: { sort: index + 1 } })
        )
      );
      return { code: 0, version: VERSION, data: { ok: true } };
    }

    if (action === 'reorderDishes') {
      const dishIds = [...new Set(Array.isArray(event.dishIds) ? event.dishIds.filter(Boolean) : [])].slice(0, 100);
      if (!dishIds.length) throw new Error('没有可排序的菜品');
      await Promise.all(
        dishIds.map((dishId, index) =>
          db.collection('dishes').doc(dishId).update({ data: { sort: index + 1 } })
        )
      );
      return { code: 0, version: VERSION, data: { ok: true } };
    }

    if (action === 'removeCategory') {
      if (!event.categoryId) throw new Error('缺少分类 ID');
      const dishCount = await db.collection('dishes').where({ categoryId: event.categoryId }).count();
      if (dishCount.total > 0) throw new Error('该分类还有菜品，请先移动或删除菜品');
      await db.collection('categories').doc(event.categoryId).remove();
      return { code: 0, version: VERSION, data: { ok: true } };
    }

    if (action === 'toggleSoldOut') {
      if (!event.dishId) throw new Error('缺少菜品 ID');
      await db.collection('dishes').doc(event.dishId).update({
        data: { soldOut: !!event.soldOut },
      });
      return { code: 0, version: VERSION, data: { ok: true } };
    }

    if (action === 'batchSoldOut') {
      const dishIds = [...new Set(Array.isArray(event.dishIds) ? event.dishIds.filter(Boolean) : [])].slice(0, 100);
      if (!dishIds.length) throw new Error('当前批次没有菜品');
      const soldOut = !!event.soldOut;
      await Promise.all(
        dishIds.map((dishId) => db.collection('dishes').doc(dishId).update({ data: { soldOut } }))
      );
      return { code: 0, version: VERSION, data: { ok: true, count: dishIds.length } };
    }

    if (action === 'remove') {
      if (!event.dishId) throw new Error('缺少菜品 ID');
      await db.collection('dishes').doc(event.dishId).remove();
      return { code: 0, version: VERSION, data: { ok: true } };
    }

    return { code: -1, version: VERSION, message: '不支持的菜单操作' };
  } catch (e) {
    console.error('[manageMenu] 执行失败', e);
    return { code: -1, version: VERSION, message: '菜单操作失败：' + e.message };
  }
};
