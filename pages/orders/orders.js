// pages/orders/orders.js - 订单列表：成员看自己，owner 看全部 + 状态筛选
const { call, fen2yuanText, formatTime } = require('../../utils/cloud');

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
      const { list, isOwner, pendingTotal } = await call('listOrders', {
        status: this.data.activeTab,
      });
      this.setData({
        isOwner,
        pendingTotal,
        loading: false,
        list: list.map((o) => ({
          ...o,
          totalPriceText: fen2yuanText(o.totalPrice),
          timeText: formatTime(o.createTime),
          summary: o.items
            .map((i) => `${i.name}×${i.count}`)
            .join('、')
            .slice(0, 40),
        })),
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e.message, icon: 'none' });
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
          await call('updateOrderStatus', { orderId: id, status: 'done' });
          wx.showToast({ title: '已完成', icon: 'success' });
          this.loadOrders();
        } catch (err) {
          wx.showToast({ title: err.message, icon: 'none' });
        }
      },
    });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` });
  },
});
