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
  },

  globalData: {
    openid: '',
    isOwner: false,
    loginReady: false,
    authorized: false,
    userProfile: null,
  },

  // wx.login 建立微信身份会话；openid 仍由云函数通过 WXContext 获取。
  wechatLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res && res.code) {
            resolve(res.code);
          } else {
            reject(new Error('微信登录未返回 code，请重试'));
          }
        },
        fail: (err) => reject(new Error(err.errMsg || '微信登录失败，请重试')),
      });
    });
  },

  async silentLogin(loginCode = '') {
    try {
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: loginCode ? { loginCode } : {},
      });
      console.log('[login] 云函数返回', res);

      // 多种返回结构兼容：
      // 1) 我们的标准结构：{ code: 0, data: { openid, isOwner } }
      // 2) 旧版/默认云函数：{ openid, ... }
      // 3) 某些工具版本：{ userInfo: { openId/openid, appid } }
      let openid = '';
      let isOwner = false;
      if (res && res.result) {
        if (res.result.data && res.result.data.openid) {
          openid = res.result.data.openid;
          isOwner = !!res.result.data.isOwner;
        } else if (res.result.openid) {
          openid = res.result.openid;
        } else if (res.result.userInfo) {
          openid = res.result.userInfo.openId || res.result.userInfo.openid || '';
        }
      }

      if (!openid) {
        const errMsg = (res && res.result && res.result.message) || JSON.stringify(res);
        throw new Error('login 云函数未返回有效 openid，请确认云函数已部署且 admins 集合已创建：' + errMsg);
      }

      this.globalData.openid = openid;
      this.globalData.isOwner = isOwner;
      this.globalData.loginReady = true;
      // 页面可能在 login 完成前已 onLoad，回调通知
      if (this.loginReadyCallback) {
        this.loginReadyCallback({ openid, isOwner });
      }
      return { openid, isOwner };
    } catch (e) {
      console.error('[login] 静默登录失败，请确认：1）login 云函数已部署 2）已创建 admins 集合', e);
      this.globalData.loginReady = true;
      if (this.loginReadyCallback) {
        this.loginReadyCallback({ openid: '', isOwner: false });
      }
      return { openid: '', isOwner: false, error: e };
    }
  },

  async startSession(userProfile, loginCode = '') {
    this.globalData.userProfile = userProfile || null;
    const code = loginCode || (await this.wechatLogin());
    const session = await this.silentLogin(code);
    if (!session.openid) {
      throw session.error || new Error('微信登录失败，请检查云开发环境');
    }
    this.globalData.authorized = true;
    return session;
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
