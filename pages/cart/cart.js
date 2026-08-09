// pages/cart/cart.js - 下单确认页
const { call, fen2yuanText } = require('../../utils/cloud');
const { DISH_IMAGE_VERSION, resolveDishImages } = require('../../utils/menu-images');
const { requestOrderDoneSubscription } = require('../../utils/subscribe');

const CART_KEY = 'family_cart';
const NAME_KEY = 'family_user_name';
const QUICK_NAMES = ['爸爸', '妈妈', '爷爷', '奶奶', '宝宝'];

Page({
  data: {
    cartList: [],
    totalPriceText: '0.00',
    totalCount: 0,
    name: '',
    quickNames: QUICK_NAMES,
    remark: '',
    submitting: false,
  },

  async onLoad() {
    await this.ensureMenuCache();
    this.buildCart();
    const savedName = wx.getStorageSync(NAME_KEY) || '';
    this.setData({ name: savedName });
  },

  async ensureMenuCache() {
    const cached = wx.getStorageSync('family_menu_cache') || {};
    if (cached.imageVersion === DISH_IMAGE_VERSION) return;
    try {
      const result = await call('menuList');
      wx.setStorageSync('family_menu_cache', {
        imageVersion: DISH_IMAGE_VERSION,
        categories: result.categories || [],
        dishes: resolveDishImages(result.dishes || []),
      });
    } catch (error) {
      wx.showToast({ title: error.message || '菜单加载失败', icon: 'none' });
    }
  },

  buildCart() {
    const cartMap = wx.getStorageSync(CART_KEY) || {};
    const app = getApp();
    // dishMap 需要菜单数据：从缓存的菜单快照取（menu 页写入）
    const menuCache = wx.getStorageSync('family_menu_cache') || { dishes: [] };
    const dishMap = {};
    menuCache.dishes.forEach((d) => (dishMap[d._id] = d));

    let total = 0;
    let totalCount = 0;
    const cartList = [];
    Object.keys(cartMap).forEach((id) => {
      const d = dishMap[id];
      const count = cartMap[id];
      if (!d || count <= 0) return;
      total += d.price * count;
      totalCount += count;
      cartList.push({ dish: d, count });
    });

    this.setData({
      cartList,
      totalCount,
      totalPriceText: fen2yuanText(total),
    });
  },

  onInputName(e) {
    this.setData({ name: e.detail.value });
  },

  onPickName(e) {
    this.setData({ name: e.currentTarget.dataset.name });
  },

  onInputRemark(e) {
    this.setData({ remark: e.detail.value });
  },

  async submitOrder() {
    if (this.data.submitting) return;
    if (!this.data.cartList.length) {
      wx.showToast({ title: '购物车是空的', icon: 'none' });
      return;
    }
    if (!this.data.name.trim()) {
      wx.showToast({ title: '告诉厨房是谁点的吧', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      // 必须在用户点击提交的事件链内请求订阅，云函数无法替用户申请订阅权限。
      const subscription = await requestOrderDoneSubscription();
      if (!subscription.accepted) {
        const shouldContinue = await new Promise((resolve) => {
          wx.showModal({
            title: '微信通知未开启',
            content: `${subscription.error || '请允许订单进度提醒'}\n继续下单后，菜做好时不会收到微信通知。`,
            cancelText: '返回',
            confirmText: '仍然下单',
            success: (result) => resolve(!!result.confirm),
            fail: () => resolve(false),
          });
        });
        if (!shouldContinue) {
          this.setData({ submitting: false });
          return;
        }
      }
      wx.showLoading({ title: '提交中…', mask: true });
      const items = this.data.cartList.map((c) => ({
        dishId: c.dish._id,
        name: c.dish.name,
        count: c.count,
      }));
      await call('createOrder', {
        items,
        name: this.data.name,
        remark: this.data.remark,
        notifySubscribed: subscription.accepted,
        notifyStatus: subscription.status || '',
        notifyError: subscription.error || '',
        notifyTemplateId: subscription.templateId,
      });

      // 下单成功：清空购物车、记住称呼
      wx.removeStorageSync(CART_KEY);
      wx.setStorageSync(NAME_KEY, this.data.name.trim());
      wx.hideLoading();
      wx.showToast({ title: '下单成功，等开饭！', icon: 'success' });

      setTimeout(() => {
        wx.redirectTo({ url: '/pages/orders/orders' });
      }, 800);
    } catch (e) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showModal({
        title: '下单失败',
        content: e.message || '请稍后重试',
        showCancel: false,
      });
    }
  },
});
