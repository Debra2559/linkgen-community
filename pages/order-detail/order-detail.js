// pages/order-detail/order-detail.js - 订单详情
const { call, fen2yuanText, formatTime } = require('../../utils/cloud');

Page({
  data: {
    order: null,
    isOwner: false,
    loading: true,
  },

  onLoad(options) {
    this.orderId = options.id;
    this.loadDetail();
  },

  async loadDetail() {
    try {
      // 复用 listOrders 拿 isOwner；订单数据从列表缓存或重新拉
      const { list, isOwner } = await call('listOrders', {});
      const order = list.find((o) => o._id === this.orderId);
      if (!order) {
        this.setData({ loading: false });
        wx.showToast({ title: '订单不存在或无权查看', icon: 'none' });
        return;
      }
      this.setData({
        isOwner,
        loading: false,
        order: {
          ...order,
          totalPriceText: fen2yuanText(order.totalPrice),
          timeText: formatTime(order.createTime),
          doneTimeText: formatTime(order.doneTime),
        },
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e.message, icon: 'none' });
    }
  },

  async onToggleStatus() {
    const { order } = this.data;
    const next = order.status === 'pending' ? 'done' : 'pending';
    const tip = next === 'done' ? '确认这单做好了？' : '把这单恢复为待处理？';
    wx.showModal({
      title: tip,
      confirmText: '确认',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await call('updateOrderStatus', { orderId: order._id, status: next });
          wx.showToast({ title: '已更新', icon: 'success' });
          this.loadDetail();
        } catch (err) {
          wx.showToast({ title: err.message, icon: 'none' });
        }
      },
    });
  },
});
