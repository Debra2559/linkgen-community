// 云函数 menuList：返回分类 + 菜品；首次调用时自动写入种子数据
// 后续菜单维护直接在云开发控制台改 categories / dishes 集合即可
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
// 版本标记：部署后在小程序端返回里应看到 version: 'v2-0731'，用于确认云端跑的是最新代码
const VERSION = 'v2-0731';

const SEED = [
  {
    name: '荤菜硬菜',
    sort: 1,
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
    dishes: [
      { name: '可乐鸡翅', price: 22, desc: '小朋友最爱，甜甜嫩嫩', emoji: '🍗' },
      { name: '宫保鸡丁', price: 20, desc: '花生酥脆，鸡丁滑嫩', emoji: '🥜' },
      { name: '黄焖鸡', price: 24, desc: '汤汁浓郁，配饭一绝', emoji: '🐔' },
      { name: '番茄炒蛋', price: 12, desc: '国民第一下饭菜', emoji: '🍅' },
      { name: '虾仁蒸蛋', price: 16, desc: '嫩滑如布丁，入口即化', emoji: '🥚' },
      { name: '红烧鸡块', price: 22, desc: '家常经典，咸香入味', emoji: '🍲' },
    ],
  },
  {
    name: '鱼虾海鲜',
    sort: 3,
    dishes: [
      { name: '清蒸鲈鱼', price: 32, desc: '鲜嫩少刺，原汁原味', emoji: '🐟' },
      { name: '红烧带鱼', price: 24, desc: '外酥里嫩，鲜香下饭', emoji: '🎣' },
      { name: '白灼虾', price: 30, desc: '鲜甜弹牙，蘸汁吃', emoji: '🦐' },
      { name: '蒜蓉粉丝蒸虾', price: 28, desc: '蒜香浓郁，粉丝吸满汤汁', emoji: '🧄' },
      { name: '葱姜炒花蛤', price: 18, desc: '鲜香入味，下酒小海鲜', emoji: '🐚' },
    ],
  },
  {
    name: '家常素菜',
    sort: 4,
    dishes: [
      { name: '酸辣土豆丝', price: 10, desc: '爽脆开胃，经典家常', emoji: '🥔' },
      { name: '地三鲜', price: 16, desc: '茄子土豆青椒，东北名菜', emoji: '🍆' },
      { name: '麻婆豆腐', price: 14, desc: '麻辣鲜香，拌饭一绝', emoji: '🫘' },
      { name: '干煸四季豆', price: 14, desc: '外焦里嫩，干香微辣', emoji: '🫘' },
      { name: '蒜蓉西兰花', price: 14, desc: '清淡健康，蒜香提味', emoji: '🥦' },
      { name: '蚝油生菜', price: 10, desc: '脆嫩爽口，简单快手', emoji: '🥬' },
      { name: '家常豆腐', price: 14, desc: '煎得金黄，酱汁浓郁', emoji: '🧈' },
      { name: '酸辣白菜', price: 10, desc: '酸辣脆爽，解腻神器', emoji: '🥬' },
    ],
  },
  {
    name: '凉菜小食',
    sort: 5,
    dishes: [
      { name: '拍黄瓜', price: 8, desc: '蒜泥醋汁，清爽开胃', emoji: '🥒' },
      { name: '凉拌木耳', price: 10, desc: '脆嫩爽口，酸辣提味', emoji: '🍄' },
      { name: '皮蛋豆腐', price: 12, desc: '冰凉滑嫩，经典小凉菜', emoji: '🧊' },
      { name: '凉拌三丝', price: 10, desc: '海带粉丝胡萝卜，清爽解腻', emoji: '🥗' },
      { name: '糖拌西红柿', price: 8, desc: '小时候的味道', emoji: '🍅' },
    ],
  },
  {
    name: '汤羹',
    sort: 6,
    dishes: [
      { name: '玉米排骨汤', price: 18, desc: '鲜甜滋补，老少皆宜', emoji: '🌽' },
      { name: '番茄蛋花汤', price: 8, desc: '酸酸甜甜，简单暖胃', emoji: '🥣' },
      { name: '紫菜蛋花汤', price: 8, desc: '快手经典，鲜香可口', emoji: '🍲' },
      { name: '酸辣汤', price: 12, desc: '酸辣开胃，料足味浓', emoji: '🥄' },
      { name: '冬瓜排骨汤', price: 16, desc: '清淡解暑，鲜美不腻', emoji: '🍈' },
    ],
  },
  {
    name: '主食',
    sort: 7,
    dishes: [
      { name: '米饭', price: 2, desc: '东北大米，粒粒分明', emoji: '🍚' },
      { name: '蛋炒饭', price: 10, desc: '粒粒分明，葱香四溢', emoji: '🍳' },
      { name: '白馒头', price: 2, desc: '松软香甜，北方味道', emoji: '🥖' },
      { name: '手工水饺', price: 18, desc: '猪肉白菜馅，皮薄馅大', emoji: '🥟' },
      { name: '葱油拌面', price: 12, desc: '葱香扑鼻，简单美味', emoji: '🍜' },
    ],
  },
  {
    name: '饮品',
    sort: 8,
    dishes: [
      { name: '鲜榨橙汁', price: 8, desc: '鲜榨不加糖，维C满满', emoji: '🍊' },
      { name: '冰镇柠檬水', price: 6, desc: '清爽解渴，夏日必备', emoji: '🍋' },
      { name: '酸梅汤', price: 6, desc: '酸甜解暑，老北京味道', emoji: '🫖' },
    ],
  },
];

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
            supplyType: dish.supplyType || 'stock',
            fitnessRecommended: !!dish.fitnessRecommended,
            soldOut: false,
            sort: dish.price,
          },
        });
      }
    }
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
