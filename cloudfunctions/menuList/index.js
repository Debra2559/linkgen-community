// 云函数 menuList：返回分类 + 菜品；首次调用时自动写入种子数据
// 后续菜单维护直接在云开发控制台改 categories / dishes 集合即可
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
// 版本标记：部署后用于确认采购方式和健身标签迁移已生效。
const VERSION = 'v3-0802';

const SEED = [
  {
    name: '荤菜硬菜',
    sort: 1,
    supplyType: 'purchase',
    dishes: [
      { name: '红烧肉', price: 28, desc: '肥而不腻，入口即化', emoji: '🥘' },
      { name: '糖醋排骨', price: 32, desc: '酸甜可口，排骨酥烂', emoji: '🍖' },
      { name: '回锅肉', price: 22, desc: '经典川味，蒜苗飘香', emoji: '🥓' },
      { name: '红烧排骨', price: 30, desc: '酱香浓郁，脱骨入味', emoji: '🦴' },
      { name: '鱼香肉丝', price: 20, desc: '酸甜微辣，超级下饭', emoji: '🌶️' },
    ],
  },
  {
    name: '鸡鸭禽蛋',
    sort: 2,
    supplyType: 'purchase',
    dishes: [
      { name: '可乐鸡翅', price: 22, desc: '小朋友最爱，甜甜嫩嫩', emoji: '🍗' },
      { name: '宫保鸡丁', price: 20, desc: '花生酥脆，鸡丁滑嫩', emoji: '🥜' },
      { name: '黄焖鸡', price: 24, desc: '汤汁浓郁，配饭一绝', emoji: '🐔' },
      { name: '番茄炒蛋', price: 12, desc: '国民第一下饭菜', emoji: '🍅', supplyType: 'stock', fitnessRecommended: true },
      { name: '虾仁蒸蛋', price: 16, desc: '嫩滑如布丁，入口即化', emoji: '🥚', fitnessRecommended: true },
      { name: '红烧鸡块', price: 22, desc: '家常经典，咸香入味', emoji: '🍲' },
    ],
  },
  {
    name: '鱼虾海鲜',
    sort: 3,
    supplyType: 'purchase',
    dishes: [
      { name: '清蒸鲈鱼', price: 32, desc: '鲜嫩少刺，原汁原味', emoji: '🐟', fitnessRecommended: true },
      { name: '红烧带鱼', price: 24, desc: '外酥里嫩，鲜香下饭', emoji: '🎣' },
      { name: '白灼虾', price: 30, desc: '鲜甜弹牙，蘸汁吃', emoji: '🦐', fitnessRecommended: true },
      { name: '蒜蓉粉丝蒸虾', price: 28, desc: '蒜香浓郁，粉丝吸满汤汁', emoji: '🧄' },
      { name: '葱姜炒花蛤', price: 18, desc: '鲜香入味，下酒小海鲜', emoji: '🐚' },
    ],
  },
  {
    name: '家常素菜',
    sort: 4,
    supplyType: 'stock',
    dishes: [
      { name: '酸辣土豆丝', price: 10, desc: '爽脆开胃，经典家常', emoji: '🥔', fitnessRecommended: true },
      { name: '地三鲜', price: 16, desc: '茄子土豆青椒，东北名菜', emoji: '🍆' },
      { name: '麻婆豆腐', price: 14, desc: '麻辣鲜香，拌饭一绝', emoji: '🫘' },
      { name: '干煸四季豆', price: 14, desc: '外焦里嫩，干香微辣', emoji: '🫘' },
      { name: '蒜蓉西兰花', price: 14, desc: '清淡健康，蒜香提味', emoji: '🥦', fitnessRecommended: true },
      { name: '蚝油生菜', price: 10, desc: '脆嫩爽口，简单快手', emoji: '🥬', fitnessRecommended: true },
      { name: '家常豆腐', price: 14, desc: '煎得金黄，酱汁浓郁', emoji: '🧈', fitnessRecommended: true },
      { name: '酸辣白菜', price: 10, desc: '酸辣脆爽，解腻神器', emoji: '🥬' },
    ],
  },
  {
    name: '凉菜小食',
    sort: 5,
    supplyType: 'stock',
    dishes: [
      { name: '拍黄瓜', price: 8, desc: '蒜泥醋汁，清爽开胃', emoji: '🥒', fitnessRecommended: true },
      { name: '凉拌木耳', price: 10, desc: '脆嫩爽口，酸辣提味', emoji: '🍄', fitnessRecommended: true },
      { name: '皮蛋豆腐', price: 12, desc: '冰凉滑嫩，经典小凉菜', emoji: '🧊' },
      { name: '凉拌三丝', price: 10, desc: '海带粉丝胡萝卜，清爽解腻', emoji: '🥗' },
      { name: '糖拌西红柿', price: 8, desc: '小时候的味道', emoji: '🍅' },
    ],
  },
  {
    name: '汤羹',
    sort: 6,
    supplyType: 'purchase',
    dishes: [
      { name: '玉米排骨汤', price: 18, desc: '鲜甜滋补，老少皆宜', emoji: '🌽' },
      { name: '番茄蛋花汤', price: 8, desc: '酸酸甜甜，简单暖胃', emoji: '🥣' },
      { name: '紫菜蛋花汤', price: 8, desc: '快手经典，鲜香可口', emoji: '🍲' },
      { name: '酸辣汤', price: 12, desc: '酸辣开胃，料足味浓', emoji: '🥄' },
      { name: '冬瓜排骨汤', price: 16, desc: '清淡解暑，鲜美不腻', emoji: '🍈', fitnessRecommended: true },
    ],
  },
  {
    name: '主食',
    sort: 7,
    supplyType: 'stock',
    dishes: [
      { name: '米饭', price: 2, desc: '东北大米，粒粒分明', emoji: '🍚' },
      { name: '蛋炒饭', price: 10, desc: '粒粒分明，葱香四溢', emoji: '🍳' },
      { name: '白馒头', price: 2, desc: '松软香甜，北方味道', emoji: '🥖' },
      { name: '手工水饺', price: 18, desc: '猪肉白菜馅，皮薄馅大', emoji: '🥟', supplyType: 'retail' },
      { name: '葱油拌面', price: 12, desc: '葱香扑鼻，简单美味', emoji: '🍜' },
    ],
  },
  {
    name: '饮品',
    sort: 8,
    supplyType: 'retail',
    dishes: [
      { name: '鲜榨橙汁', price: 8, desc: '鲜榨不加糖，维C满满', emoji: '🍊' },
      { name: '冰镇柠檬水', price: 6, desc: '清爽解渴，夏日必备', emoji: '🍋' },
      { name: '酸梅汤', price: 6, desc: '酸甜解暑，老北京味道', emoji: '🫖' },
    ],
  },
  {
    name: '锅物 · 肉类',
    sort: 1,
    menuType: 'sukiyaki',
    supplyType: 'purchase',
    dishes: [
      { name: '雪花牛肉', price: 38, desc: '薄切入锅，裹满寿喜汁', emoji: '🥩', fitnessRecommended: true },
      { name: '牛肩肉片', price: 32, desc: '肉香扎实，适合涮煮', emoji: '🍖', fitnessRecommended: true },
      { name: '猪五花', price: 24, desc: '肥瘦相间，甜口锅底很搭', emoji: '🥓' },
      { name: '鸡腿肉片', price: 22, desc: '嫩滑不柴，吸满汤汁', emoji: '🍗', fitnessRecommended: true },
    ],
  },
  {
    name: '锅物 · 蔬菜',
    sort: 2,
    menuType: 'sukiyaki',
    supplyType: 'stock',
    dishes: [
      { name: '娃娃菜', price: 8, desc: '清甜脆嫩，适合久煮', emoji: '🥬', fitnessRecommended: true },
      { name: '茼蒿', price: 9, desc: '带一点清香，涮后柔软', emoji: '🌿', fitnessRecommended: true },
      { name: '香菇拼盘', price: 12, desc: '菌香饱满，汤底更鲜', emoji: '🍄', fitnessRecommended: true },
      { name: '金针菇', price: 8, desc: '细嫩爽滑，锅物必点', emoji: '🪴', fitnessRecommended: true },
    ],
  },
  {
    name: '锅物 · 豆制品',
    sort: 3,
    menuType: 'sukiyaki',
    supplyType: 'purchase',
    dishes: [
      { name: '北豆腐', price: 10, desc: '吸汁饱满，口感扎实', emoji: '⬜', fitnessRecommended: true },
      { name: '油豆皮', price: 12, desc: '柔韧吸汁，越煮越香', emoji: '🟨' },
      { name: '魔芋结', price: 10, desc: '轻盈爽口，锅里很有存在感', emoji: '➰', fitnessRecommended: true },
    ],
  },
  {
    name: '锅物 · 海鲜',
    sort: 4,
    menuType: 'sukiyaki',
    supplyType: 'purchase',
    dishes: [
      { name: '鲜虾', price: 28, desc: '鲜甜弹牙，寿喜汁提味', emoji: '🦐', fitnessRecommended: true },
      { name: '巴沙鱼片', price: 22, desc: '细嫩少刺，涮煮方便', emoji: '🐟', fitnessRecommended: true },
      { name: '蟹柳', price: 16, desc: '微甜弹嫩，孩子也喜欢', emoji: '🦀' },
    ],
  },
  {
    name: '锅物 · 主食',
    sort: 5,
    menuType: 'sukiyaki',
    supplyType: 'retail',
    dishes: [
      { name: '乌冬面', price: 12, desc: '吸满汤汁，收尾刚好', emoji: '🍜' },
      { name: '可生食鸡蛋', price: 8, desc: '蘸肉片吃，口感更顺滑', emoji: '🥚', fitnessRecommended: true },
    ],
  },
  {
    name: '火锅 · 肉类',
    sort: 1,
    menuType: 'chongqing',
    supplyType: 'purchase',
    dishes: [
      { name: '精品肥牛', price: 36, desc: '油香丰盈，红汤里涮到刚好', emoji: '🥩' },
      { name: '羊肉卷', price: 30, desc: '鲜香细嫩，麻辣锅底很搭', emoji: '🍖' },
      { name: '毛肚', price: 32, desc: '七上八下，脆爽有嚼劲', emoji: '🫀' },
      { name: '鸭肠', price: 24, desc: '脆嫩弹口，涮久也不失味', emoji: '〰️' },
    ],
  },
  {
    name: '火锅 · 蔬菜',
    sort: 2,
    menuType: 'chongqing',
    supplyType: 'stock',
    dishes: [
      { name: '土豆片', price: 8, desc: '软糯吸汁，红汤里的安心牌', emoji: '🥔' },
      { name: '莴笋片', price: 10, desc: '清脆解辣，麻辣锅必备', emoji: '🥒', fitnessRecommended: true },
      { name: '藕片', price: 10, desc: '脆爽清甜，久煮不散', emoji: '⭕', fitnessRecommended: true },
      { name: '海带结', price: 9, desc: '鲜味清爽，吸汤不抢味', emoji: '🌊', fitnessRecommended: true },
    ],
  },
  {
    name: '火锅 · 丸滑',
    sort: 3,
    menuType: 'chongqing',
    supplyType: 'purchase',
    dishes: [
      { name: '手打牛肉丸', price: 18, desc: '弹牙多汁，一口一个', emoji: '⚪' },
      { name: '鱼豆腐', price: 14, desc: '柔软吸汁，孩子友好', emoji: '🔶' },
      { name: '虾滑', price: 22, desc: '鲜甜细腻，现挤入锅', emoji: '🦐', fitnessRecommended: true },
      { name: '午餐肉', price: 16, desc: '咸香绵软，重庆火锅老搭档', emoji: '🟥' },
    ],
  },
  {
    name: '火锅 · 豆制品',
    sort: 4,
    menuType: 'chongqing',
    supplyType: 'purchase',
    dishes: [
      { name: '豆皮', price: 10, desc: '薄韧吸辣，涮后更香', emoji: '🟨', fitnessRecommended: true },
      { name: '腐竹', price: 12, desc: '泡发柔软，红汤越煮越入味', emoji: '📜' },
      { name: '宽粉', price: 12, desc: '滑溜带劲，吸足牛油香', emoji: '〰️' },
    ],
  },
  {
    name: '火锅 · 主食',
    sort: 5,
    menuType: 'chongqing',
    supplyType: 'retail',
    dishes: [
      { name: '红糖糍粑', price: 14, desc: '外脆内糯，辣后收尾', emoji: '🟫' },
      { name: '火锅粉', price: 12, desc: '爽滑入味，最后一勺汤底', emoji: '🍜' },
    ],
  },
];

function getSeedDish(category, dish) {
  return (category.dishes || []).find((item) => item.name === dish.name) || {};
}

function getSeedMetadata(category, dish) {
  const seedDish = getSeedDish(category, dish);
  return {
    menuType: category.menuType || 'home',
    supplyType: seedDish.supplyType || category.supplyType || 'stock',
    fitnessRecommended: !!seedDish.fitnessRecommended,
  };
}

function getDishMetadata(category, dish) {
  const seedMetadata = getSeedMetadata(category, dish);
  return {
    menuType: dish.menuType || seedMetadata.menuType,
    supplyType: dish.supplyType || seedMetadata.supplyType,
    fitnessRecommended: typeof dish.fitnessRecommended === 'boolean'
      ? dish.fitnessRecommended
      : seedMetadata.fitnessRecommended,
  };
}

async function backfillDishMetadata(existingDishes, existingCategories) {
  const dishes = db.collection('dishes');
  const categoryById = new Map(existingCategories.map((category) => [category._id, category]));
  const seedByName = new Map(SEED.map((category) => [category.name, category]));
  await Promise.all(existingDishes.map(async (dish) => {
    const category = categoryById.get(dish.categoryId);
    const seedCategory = category ? seedByName.get(category.name) : null;
    if (!seedCategory) return;
    const metadata = getSeedMetadata(seedCategory, dish);
    const data = {};
    if (!dish.menuType) data.menuType = metadata.menuType;
    if (!dish.supplyType || (dish.supplyType === 'stock' && metadata.supplyType !== 'stock')) {
      data.supplyType = metadata.supplyType;
    }
    if (typeof dish.fitnessRecommended !== 'boolean' || (!dish.fitnessRecommended && metadata.fitnessRecommended)) {
      data.fitnessRecommended = metadata.fitnessRecommended;
    }
    if (Object.keys(data).length) await dishes.doc(dish._id).update({ data });
  }));
}

async function backfillCategoryMetadata(existingCategories) {
  const categories = db.collection('categories');
  await Promise.all(existingCategories.map(async (category) => {
    if (category.menuType) return;
    await categories.doc(category._id).update({ data: { menuType: 'home' } });
  }));
}

async function seedIfEmpty() {
  const categories = db.collection('categories');
  const dishes = db.collection('dishes');
  try {
    const [categoryRes, dishRes] = await Promise.all([
      categories.limit(100).get(),
      dishes.limit(100).get(),
    ]);
    const existingCategories = categoryRes.data || [];
    const existingDishes = dishRes.data || [];
    const categoryByName = new Map(existingCategories.map((c) => [c.name, c]));

    // 分类已经存在但菜品未导入时，按已有分类补齐菜品，避免首页得到空数组。
    for (let index = 0; index < SEED.length; index += 1) {
      const seedCategory = SEED[index];
      let category = categoryByName.get(seedCategory.name);
      if (!category) {
        const res = await categories.add({
          data: {
            _id: `cat_${String(index + 1).padStart(3, '0')}`,
            name: seedCategory.name,
            sort: seedCategory.sort,
            menuType: seedCategory.menuType || 'home',
            enabled: true,
          },
        });
        category = { _id: res._id, name: seedCategory.name, sort: seedCategory.sort };
        categoryByName.set(category.name, category);
      }

      const hasDishes = existingDishes.some((dish) => dish.categoryId === category._id);
      if (hasDishes) continue;

      for (const dish of seedCategory.dishes) {
        await dishes.add({
          data: {
            name: dish.name,
            price: dish.price,
            desc: dish.desc,
            emoji: dish.emoji,
            categoryId: category._id,
            menuType: seedCategory.menuType || 'home',
            ...getDishMetadata(seedCategory, dish),
            soldOut: false,
            sort: dish.price,
          },
        });
      }
    }
    await backfillCategoryMetadata(existingCategories);
    await backfillDishMetadata(existingDishes, existingCategories);
  } catch (e) {
    console.error('[menuList] categories 集合不存在或查询失败', e);
    throw new Error('请先创建 categories 和 dishes 集合');
  }
}

exports.main = async () => {
  try {
    await seedIfEmpty();
    const catRes = await db.collection('categories').orderBy('sort', 'asc').get();
    const dishRes = await db.collection('dishes').orderBy('sort', 'asc').limit(100).get();
    return {
      code: 0,
      version: VERSION,
      data: { categories: catRes.data, dishes: dishRes.data },
    };
  } catch (e) {
    return { code: -1, version: VERSION, message: '菜单加载失败：' + e.message };
  }
};
