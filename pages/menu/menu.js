// pages/menu/menu.js - 点餐首页：分类联动 + 购物车
const { call, fen2yuanText } = require('../../utils/cloud');
const { DISH_IMAGE_VERSION, resolveDishImages } = require('../../utils/menu-images');
const { MENU_FILTERS, getSupplyTypeLabel, normalizeSupplyType } = require('../../utils/supply-types');
const { MENU_TYPES, normalizeMenuType } = require('../../utils/menu-types');

const CART_KEY = 'family_cart';

Page({
  data: {
    loading: true,
    menuError: '',
    sections: [], // [{ _id, name, dishes: [] }]
    categories: [],
    allDishes: [],
    menuTypes: MENU_TYPES,
    menuType: 'home',
    supplyFilters: MENU_FILTERS,
    supplyFilter: '',
    activeCategory: '',
    heroCollapsed: false,
    scrollIntoId: '',
    cartMap: {}, // { dishId: count }
    dishMap: {}, // { dishId: dish } 快速查找
    cartCount: 0,
    totalPriceText: '0.00',
    showCartPanel: false,
    cartList: [], // 弹层用 [{dish, count}]
  },

  onLoad() {
    this._sectionTops = []; // 右侧滚动联动用
    this._scrollTimer = null;
    this.loadMenu();
  },

  onShow() {
    // 从下单页返回时同步购物车（下单成功会清空）
    this.syncCartFromStorage();
  },

  onPullDownRefresh() {
    this.loadMenu().then(() => wx.stopPullDownRefresh());
  },

  async loadMenu() {
    try {
      const { categories = [], dishes = [] } = await call('menuList');
      const normalizedCategories = categories.map((category) => ({
        ...category,
        menuType: normalizeMenuType(category.menuType),
      }));
      const dishesWithImages = resolveDishImages(dishes).map((dish) => ({
        ...dish,
        supplyType: normalizeSupplyType(dish.supplyType),
        supplyTypeLabel: getSupplyTypeLabel(dish.supplyType),
        fitnessRecommended: !!dish.fitnessRecommended,
      }));
      // 缓存菜单快照，下单确认页用它还原购物车中的菜品信息
      wx.setStorageSync('family_menu_cache', {
        imageVersion: DISH_IMAGE_VERSION,
        categories: normalizedCategories,
        dishes: dishesWithImages,
      });
      const dishMap = {};
      dishesWithImages.forEach((d) => (dishMap[d._id] = d));

      this.setData({
        loading: false,
        menuError: '',
        categories: normalizedCategories,
        allDishes: dishesWithImages,
        dishMap,
      }, () => this.applyMenuFilter());
      this.syncCartFromStorage();
    } catch (e) {
      this.setData({ loading: false, menuError: e.message || '菜单加载失败' });
      wx.showToast({ title: e.message, icon: 'none' });
    }
  },

  applyMenuFilter() {
    const { categories, allDishes, menuType, supplyFilter } = this.data;
    const visibleCategories = categories.filter((category) => (
      category.enabled !== false && normalizeMenuType(category.menuType) === menuType
    ));
    const visibleCategoryIds = new Set(visibleCategories.map((category) => category._id));
    const visibleDishes = allDishes.filter((dish) => visibleCategoryIds.has(dish.categoryId));
    const filteredDishes = supplyFilter === 'fitness'
      ? visibleDishes.filter((dish) => dish.fitnessRecommended)
      : supplyFilter
        ? visibleDishes.filter((dish) => dish.supplyType === supplyFilter)
        : visibleDishes;
    const sections = visibleCategories
      .map((category) => ({
        _id: category._id,
        name: category.name,
        dishes: filteredDishes.filter((dish) => dish.categoryId === category._id),
      }))
      .filter((section) => section.dishes.length > 0);
    this.setData({
      sections,
      activeCategory: sections.length ? sections[0]._id : '',
      scrollIntoId: '',
      heroCollapsed: false,
    }, () => this.measureSections());
  },

  onSupplyFilter(e) {
    const supplyFilter = e.currentTarget.dataset.key || '';
    if (supplyFilter === this.data.supplyFilter) return;
    this.setData({ supplyFilter }, () => this.applyMenuFilter());
  },

  onMenuType(e) {
    const menuType = normalizeMenuType(e.currentTarget.dataset.key);
    if (menuType === this.data.menuType) return;
    this.setData({ menuType, supplyFilter: '' }, () => this.applyMenuFilter());
  },

  // 测量各分类区块的 offsetTop，用于右侧滚动时高亮左侧分类
  measureSections() {
    const query = wx.createSelectorQuery().in(this);
    query.selectAll('.dish-section').boundingClientRect();
    query.select('.dish-scroll').boundingClientRect();
    query.exec((res) => {
      if (!res || !res[0] || !res[1]) return;
      const scrollTop = res[1].top;
      this._sectionTops = res[0].map((r) => ({
        id: r.id.replace('sec-', ''),
        top: r.top - scrollTop,
      }));
    });
  },

  onTapCategory(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      activeCategory: id,
      scrollIntoId: 'sec-' + id,
    });
  },

  onDishScroll(e) {
    // 节流处理滚动，避免频繁 setData 跨线程通信
    if (this._scrollTimer) return;
    this._scrollTimer = setTimeout(() => {
      this._scrollTimer = null;
      const top = e.detail.scrollTop;
      const heroCollapsed = top > 42;
      if (heroCollapsed !== this.data.heroCollapsed) {
        this.setData({ heroCollapsed });
      }
      const tops = this._sectionTops || [];
      let current = this.data.sections.length ? this.data.sections[0]._id : '';
      for (const s of tops) {
        if (top >= s.top - 20) current = s.id;
      }
      if (current && current !== this.data.activeCategory) {
        this.setData({ activeCategory: current });
      }
    }, 120);
  },

  onDishTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/dish-detail/dish-detail?id=${id}` });
  },

  // ---------- 购物车 ----------
  syncCartFromStorage() {
    const cartMap = wx.getStorageSync(CART_KEY) || {};
    // 过滤掉菜单里已不存在的菜品
    const dishMap = this.data.dishMap;
    const valid = {};
    Object.keys(cartMap).forEach((id) => {
      if (dishMap[id] && cartMap[id] > 0) valid[id] = cartMap[id];
    });
    this.applyCart(valid);
  },

  applyCart(cartMap) {
    const dishMap = this.data.dishMap;
    let cartCount = 0;
    let total = 0;
    const cartList = [];
    Object.keys(cartMap).forEach((id) => {
      const d = dishMap[id];
      const count = cartMap[id];
      if (!d || count <= 0) return;
      cartCount += count;
      total += d.price * count;
      cartList.push({ _id: d._id, dish: d, count });
    });
    wx.setStorageSync(CART_KEY, cartMap);
    this.setData({
      cartMap,
      cartCount,
      cartList,
      totalPriceText: fen2yuanText(total),
      showCartPanel: cartCount === 0 ? false : this.data.showCartPanel,
    });
  },

  onPlus(e) {
    const id = e.currentTarget.dataset.id;
    const cartMap = { ...this.data.cartMap };
    cartMap[id] = (cartMap[id] || 0) + 1;
    this.applyCart(cartMap);
  },

  onMinus(e) {
    const id = e.currentTarget.dataset.id;
    const cartMap = { ...this.data.cartMap };
    if (!cartMap[id]) return;
    cartMap[id] -= 1;
    if (cartMap[id] <= 0) delete cartMap[id];
    this.applyCart(cartMap);
  },

  clearCart() {
    this.applyCart({});
  },

  toggleCartPanel() {
    if (this.data.cartCount === 0) return;
    this.setData({ showCartPanel: !this.data.showCartPanel });
  },

  goCart() {
    if (this.data.cartCount === 0) {
      wx.showToast({ title: '先选几道菜吧', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/cart/cart' });
  },

  goOrders() {
    wx.navigateTo({ url: '/pages/orders/orders' });
  },

  onShareAppMessage() {
    return {
      title: '今天想吃什么？来点单～',
      path: '/pages/menu/menu',
    };
  },
});
