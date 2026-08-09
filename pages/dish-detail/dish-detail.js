// pages/dish-detail/dish-detail.js - 菜品详情与购物车操作
const { call } = require('../../utils/cloud');
const { DISH_IMAGE_VERSION, resolveDishImages } = require('../../utils/menu-images');

const CART_KEY = 'family_cart';

Page({
  data: {
    loading: true,
    errorMessage: '',
    dish: null,
    categoryName: '',
    count: 0,
  },

  onLoad(options) {
    this.dishId = options.id || '';
    if (!this.dishId) {
      this.setData({ loading: false, errorMessage: '没有找到这道菜' });
      return;
    }
    this.loadDish();
  },

  onShow() {
    if (this.data.dish) this.syncCount();
  },

  async loadDish() {
    const cached = wx.getStorageSync('family_menu_cache') || {};
    const isCurrentCache = cached.imageVersion === DISH_IMAGE_VERSION;
    let dish = isCurrentCache ? (cached.dishes || []).find((item) => item._id === this.dishId) : null;
    let categories = isCurrentCache ? (cached.categories || []) : [];

    if (!dish) {
      try {
        const result = await call('menuList');
        categories = result.categories || [];
        const dishes = resolveDishImages(result.dishes || []);
        wx.setStorageSync('family_menu_cache', { imageVersion: DISH_IMAGE_VERSION, categories, dishes });
        dish = dishes.find((item) => item._id === this.dishId);
      } catch (error) {
        this.setData({ loading: false, errorMessage: error.message || '菜品加载失败' });
        return;
      }
    }

    if (!dish) {
      this.setData({ loading: false, errorMessage: '这道菜已下架或不存在' });
      return;
    }

    const category = categories.find((item) => item._id === dish.categoryId);
    this.setData({
      loading: false,
      dish,
      categoryName: category ? category.name : '',
    }, () => this.syncCount());
  },

  syncCount() {
    const cartMap = wx.getStorageSync(CART_KEY) || {};
    this.setData({ count: Number(cartMap[this.dishId] || 0) });
  },

  updateCart(nextCount) {
    const cartMap = { ...(wx.getStorageSync(CART_KEY) || {}) };
    if (nextCount > 0) cartMap[this.dishId] = nextCount;
    else delete cartMap[this.dishId];
    wx.setStorageSync(CART_KEY, cartMap);
    this.setData({ count: nextCount });
  },

  onPlus() {
    if (this.data.dish && this.data.dish.soldOut) return;
    this.updateCart(this.data.count + 1);
  },

  onMinus() {
    if (this.data.count > 0) this.updateCart(this.data.count - 1);
  },

  goCart() {
    if (this.data.dish && this.data.dish.soldOut) return;
    if (!this.data.count) {
      this.updateCart(1);
      wx.showToast({ title: '已加入菜单', icon: 'success' });
      return;
    }
    wx.navigateTo({ url: '/pages/cart/cart' });
  },

  goBack() {
    wx.navigateBack();
  },
});
