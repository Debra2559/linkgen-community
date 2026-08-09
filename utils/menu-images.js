const DISH_IMAGES = {
  '红烧肉': '../../assets/dishes/dish-001.jpg',
  '糖醋排骨': '../../assets/dishes/dish-002.jpg',
  '回锅肉': '../../assets/dishes/dish-003.jpg',
  '红烧排骨': '../../assets/dishes/dish-004.jpg',
  '鱼香肉丝': '../../assets/dishes/dish-005.jpg',
  '可乐鸡翅': '../../assets/dishes/dish-006.jpg',
  '宫保鸡丁': '../../assets/dishes/dish-007.jpg',
  '黄焖鸡': '../../assets/dishes/dish-008.jpg',
  '番茄炒蛋': '../../assets/dishes/dish-009.jpg',
  '虾仁蒸蛋': '../../assets/dishes/dish-010.jpg',
  '红烧鸡块': '../../assets/dishes/dish-011.jpg',
  '清蒸鲈鱼': '../../assets/dishes/dish-012.jpg',
  '红烧带鱼': '../../assets/dishes/dish-013.jpg',
  '白灼虾': '../../assets/dishes/dish-014.jpg',
  '蒜蓉粉丝蒸虾': '../../assets/dishes/dish-015.jpg',
  '葱姜炒花蛤': '../../assets/dishes/dish-016.jpg',
  '酸辣土豆丝': '../../assets/dishes/dish-017.jpg',
  '地三鲜': '../../assets/dishes/dish-018.jpg',
  '麻婆豆腐': '../../assets/dishes/dish-019.jpg',
  '干煸四季豆': '../../assets/dishes/dish-020.jpg',
  '蒜蓉西兰花': '../../assets/dishes/dish-021.jpg',
  '蚝油生菜': '../../assets/dishes/dish-022.jpg',
  '家常豆腐': '../../assets/dishes/dish-023.jpg',
  '酸辣白菜': '../../assets/dishes/dish-024.jpg',
  '拍黄瓜': '../../assets/dishes/dish-025.jpg',
  '凉拌木耳': '../../assets/dishes/dish-026.jpg',
  '皮蛋豆腐': '../../assets/dishes/dish-027.jpg',
  '凉拌三丝': '../../assets/dishes/dish-028.jpg',
  '糖拌西红柿': '../../assets/dishes/dish-029.jpg',
  '玉米排骨汤': '../../assets/dishes/dish-030.jpg',
  '番茄蛋花汤': '../../assets/dishes/dish-031.jpg',
  '紫菜蛋花汤': '../../assets/dishes/dish-032.jpg',
  '酸辣汤': '../../assets/dishes/dish-033.jpg',
  '冬瓜排骨汤': '../../assets/dishes/dish-034.jpg',
  '米饭': '../../assets/dishes/dish-035.jpg',
  '蛋炒饭': '../../assets/dishes/dish-036.jpg',
  '白馒头': '../../assets/dishes/dish-037.jpg',
  '手工水饺': '../../assets/dishes/dish-038.jpg',
  '葱油拌面': '../../assets/dishes/dish-039.jpg',
  '鲜榨橙汁': '../../assets/dishes/dish-040.jpg',
  '冰镇柠檬水': '../../assets/dishes/dish-041.jpg',
  '酸梅汤': '../../assets/dishes/dish-042.jpg',
  '雪花牛肉': '../../assets/dishes/dish-043.jpg',
  '牛肩肉片': '../../assets/dishes/dish-044.jpg',
  '猪五花': '../../assets/dishes/dish-045.jpg',
  '鸡腿肉片': '../../assets/dishes/dish-046.jpg',
  '娃娃菜': '../../assets/dishes/dish-047.jpg',
  '茼蒿': '../../assets/dishes/dish-048.jpg',
  '香菇拼盘': '../../assets/dishes/dish-049.jpg',
  '金针菇': '../../assets/dishes/dish-050.jpg',
  '北豆腐': '../../assets/dishes/dish-051.jpg',
  '油豆皮': '../../assets/dishes/dish-052.jpg',
  '魔芋结': '../../assets/dishes/dish-053.jpg',
  '鲜虾': '../../assets/dishes/dish-054.jpg',
  '巴沙鱼片': '../../assets/dishes/dish-055.jpg',
  '蟹柳': '../../assets/dishes/dish-056.jpg',
  '乌冬面': '../../assets/dishes/dish-057.jpg',
  '可生食鸡蛋': '../../assets/dishes/dish-058.jpg',
  '精品肥牛': '../../assets/dishes/dish-059.jpg',
  '羊肉卷': '../../assets/dishes/dish-060.jpg',
  '毛肚': '../../assets/dishes/dish-061.jpg',
  '鸭肠': '../../assets/dishes/dish-062.jpg',
  '土豆片': '../../assets/dishes/dish-063.jpg',
  '莴笋片': '../../assets/dishes/dish-064.jpg',
  '藕片': '../../assets/dishes/dish-065.jpg',
  '海带结': '../../assets/dishes/dish-066.jpg',
  '手打牛肉丸': '../../assets/dishes/dish-067.jpg',
  '鱼豆腐': '../../assets/dishes/dish-068.jpg',
  '虾滑': '../../assets/dishes/dish-069.jpg',
  '午餐肉': '../../assets/dishes/dish-070.jpg',
  '豆皮': '../../assets/dishes/dish-071.jpg',
  '腐竹': '../../assets/dishes/dish-072.jpg',
  '宽粉': '../../assets/dishes/dish-073.jpg',
  '红糖糍粑': '../../assets/dishes/dish-074.jpg',
  '火锅粉': '../../assets/dishes/dish-075.jpg',
};

const DISH_IMAGE_LIST = Object.values(DISH_IMAGES);
const DISH_IMAGE_VERSION = 'jpeg-320-v3';

// 云端新增菜品没有本地图片字段时，按当前菜单分配未占用图片，避免所有新菜都回退到同一张图。
function resolveDishImages(dishes = []) {
  const used = new Set();
  let nextIndex = 0;
  return dishes.map((dish) => {
    const namedImage = DISH_IMAGES[dish.name];
    const image = dish.image || namedImage || (dish.menuType && dish.menuType !== 'home' ? '' : (() => {
      while (used.has(DISH_IMAGE_LIST[nextIndex]) && nextIndex < DISH_IMAGE_LIST.length) nextIndex += 1;
      return DISH_IMAGE_LIST[Math.min(nextIndex++, DISH_IMAGE_LIST.length - 1)];
    })());
    used.add(image);
    return { ...dish, image };
  });
}

module.exports = { DISH_IMAGES, DISH_IMAGE_LIST, DISH_IMAGE_VERSION, resolveDishImages };
