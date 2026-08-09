const AUTH_KEY = 'family_authorized';
const PROFILE_KEY = 'family_user_profile';

Page({
  data: {
    loading: false,
  },

  onShow() {
    const profile = wx.getStorageSync(PROFILE_KEY);
    if (!wx.getStorageSync(AUTH_KEY)) return;

    // 本地标记不等于真实登录态，每次重新进入都让云函数重新校验 openid。
    this.setData({ loading: true });
    getApp()
      .startSession(profile)
      .then(() => {
        wx.reLaunch({ url: '/pages/menu/menu' });
      })
      .catch(() => {
        wx.removeStorageSync(AUTH_KEY);
        wx.removeStorageSync(PROFILE_KEY);
        getApp().globalData.authorized = false;
        this.setData({ loading: false });
      });
  },

  requestUserProfile() {
    return new Promise((resolve, reject) => {
      if (typeof wx.getUserProfile !== 'function') {
        resolve(null);
        return;
      }
      wx.getUserProfile({
        desc: '用于识别下单成员',
        success: ({ userInfo }) => resolve(userInfo || null),
        fail: (err) => reject(new Error(err.errMsg || '你取消了微信授权')),
      });
    });
  },

  async authorize() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const loginCode = await getApp().wechatLogin();
      const userProfile = await this.requestUserProfile();
      await getApp().startSession(userProfile, loginCode);
      wx.setStorageSync(AUTH_KEY, true);
      if (userProfile) wx.setStorageSync(PROFILE_KEY, userProfile);
      wx.reLaunch({ url: '/pages/menu/menu' });
    } catch (e) {
      this.setData({ loading: false });
      wx.showModal({
        title: '授权未完成',
        content: e.message || '请允许微信授权后再进入',
        showCancel: false,
      });
    }
  },
});
