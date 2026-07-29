// app.js - 全局入口：初始化云开发 + 静默登录（拿 openid / 判断 owner）

// ★ 云开发环境 ID：开通云开发后，在「云开发控制台 → 设置 → 环境 ID」复制粘贴到这里
//   留空则自动使用当前账号的默认环境（DYNAMIC_CURRENT_ENV）
const CLOUD_ENV = 'cloud1-d0g19pds769790bbf';

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: CLOUD_ENV || wx.cloud.DYNAMIC_CURRENT_ENV,
      traceUser: true,
    });
    this.silentLogin();
  },

  globalData: {
    openid: '',
    isOwner: false,
    loginReady: false,
  },

  async silentLogin() {
    try {
      const res = await wx.cloud.callFunction({ name: 'login' });
      console.log('[login] 云函数返回', res);
      // 兼容：云函数部署异常/集合未建时返回的错误结构里没有 data
      if (!res || !res.result || !res.result.data) {
        const errMsg = (res && res.result && res.result.message) || JSON.stringify(res);
        throw new Error('login 云函数未返回有效数据，请确认云函数已部署且 admins 集合已创建：' + errMsg);
      }
      const { openid, isOwner } = res.result.data;
      if (!openid) {
        throw new Error('login 云函数返回了空 openid，请检查云开发环境及登录状态');
      }
      this.globalData.openid = openid;
      this.globalData.isOwner = isOwner || false;
      this.globalData.loginReady = true;
      // 页面可能在 login 完成前已 onLoad，回调通知
      if (this.loginReadyCallback) {
        this.loginReadyCallback({ openid, isOwner });
      }
    } catch (e) {
      console.error('[login] 静默登录失败，请确认：1）login 云函数已部署 2）已创建 admins 集合', e);
      this.globalData.loginReady = true;
      if (this.loginReadyCallback) {
        this.loginReadyCallback({ openid: '', isOwner: false });
      }
    }
  },

  // 页面侧等待登录结果的工具方法
  waitLogin() {
    return new Promise((resolve) => {
      if (this.globalData.loginReady) {
        resolve({
          openid: this.globalData.openid,
          isOwner: this.globalData.isOwner,
        });
      } else {
        this.loginReadyCallback = resolve;
      }
    });
  },
});
