// pages/orders/orders.js - 订单列表：成员看自己，owner 看全部 + 状态筛选
const { call, fen2yuanText, formatTime } = require('../../utils/cloud');

const maskOpenid = (openid) => {
  if (!openid) return '';
  if (openid.length <= 10) return openid;
  return `${openid.slice(0, 6)}...${openid.slice(-4)}`;
};

Page({
  data: {
    isOwner: false,
    tabs: [
      { key: '', label: '全部' },
      { key: 'pending', label: '待处理' },
      { key: 'done', label: '已完成' },
    ],
    activeTab: '',
    list: [],
    loading: true,
    pendingTotal: 0,
    errorMessage: '',
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    // 从详情页返回时刷新（可能改了状态）
    if (!this.data.loading) this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().finally(() => wx.stopPullDownRefresh());
  },

  async loadOrders() {
    try {
      const { list = [], isOwner, pendingTotal } = await call('listOrders', {
        status: this.data.activeTab,
      });
      this.setData({
        isOwner,
        pendingTotal,
        loading: false,
        errorMessage: '',
        list: list.map((o) => ({
          ...o,
          openidText: isOwner ? maskOpenid(o._openid) : '',
          totalPriceText: fen2yuanText(o.totalPrice),
          timeText: formatTime(o.createTime),
          summary: o.items
            .map((i) => `${i.name}×${i.count}`)
            .join('、')
            .slice(0, 40),
        })),
      });
    } catch (e) {
      this.setData({ loading: false, errorMessage: e.message || '订单加载失败' });
      wx.showModal({
        title: '订单加载失败',
        content: e.message || '请稍后重试',
        showCancel: false,
      });
    }
  },

  onSwitchTab(e) {
    const key = e.currentTarget.dataset.key;
    if (key === this.data.activeTab) return;
    this.setData({ activeTab: key, loading: true }, () => this.loadOrders());
  },

  async onMarkDone(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '这单做好啦？',
      content: '确认后将标记为「已完成」',
      confirmText: '做好了',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const result = await call('updateOrderStatus', { orderId: id, status: 'done' });
          if (result.notificationSent) {
            wx.showToast({ title: '已完成，已通知', icon: 'success' });
          } else {
            wx.showModal({
              title: '订单已完成',
              content: result.notificationError || '通知未发出，请检查订阅设置',
              showCancel: false,
            });
          }
          this.loadOrders();
        } catch (err) {
          wx.showModal({
            title: '更新失败',
            content: err.message || '请稍后重试',
            showCancel: false,
          });
        }
      },
    });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` });
  },

  goMenuAdmin() {
    wx.navigateTo({ url: '/pages/admin-menu/admin-menu' });
  },
});
