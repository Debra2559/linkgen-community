// pages/order-detail/order-detail.js - 订单详情
const { call, fen2yuanText, formatTime } = require('../../utils/cloud');

const maskOpenid = (openid) => {
  if (!openid) return '';
  if (openid.length <= 10) return openid;
  return `${openid.slice(0, 6)}...${openid.slice(-4)}`;
};

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
          openidText: isOwner ? maskOpenid(order._openid) : '',
          totalPriceText: fen2yuanText(order.totalPrice),
          timeText: formatTime(order.createTime),
          doneTimeText: formatTime(order.doneTime),
        },
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showModal({
        title: '订单加载失败',
        content: e.message || '请稍后重试',
        showCancel: false,
      });
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
          const result = await call('updateOrderStatus', { orderId: order._id, status: next });
          if (next === 'done' && !result.notificationSent) {
            wx.showModal({
              title: '订单已完成',
              content: result.notificationError || '通知未发出，请检查订阅设置',
              showCancel: false,
            });
          } else {
            wx.showToast({ title: '已更新', icon: 'success' });
          }
          this.loadDetail();
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
});
