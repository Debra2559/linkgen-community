// 云函数 login：获取 openid，并判断是否为管理员
// 生产环境必须通过 LINKGEN_OWNER_OPENID 显式指定首个 owner，不能把公开小程序的首个访客提升为管理员。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
// 版本标记：部署后在小程序端返回里应看到 version: 'v2-0731'，用于确认云端跑的是最新代码
const VERSION = 'v2-0731';

exports.main = async (event = {}) => {
  try {
    // loginCode 由客户端 wx.login 产生；云开发通过 WXContext 提供可信 openid。
    void event.loginCode;
    const ctx = cloud.getWXContext();
    console.log('[login] WXContext', ctx);
    const OPENID = ctx && ctx.OPENID;
    if (!OPENID) {
      return {
        code: -1,
        version: VERSION,
        message: '无法获取用户 OPENID，可能原因：1）login 云函数未部署 2）当前是模拟器且无登录态 3）云开发环境未开通',
      };
    }

    const admins = db.collection('admins');
    const { total } = await admins.count();

    const configuredOwnerOpenid = String(process.env.LINKGEN_OWNER_OPENID || '').trim();
    if (total === 0 && configuredOwnerOpenid && configuredOwnerOpenid === OPENID) {
      await admins.add({
        data: { _id: OPENID, role: 'owner', status: 'active', agentNotify: false, createTime: db.serverDate() },
      });
      return { code: 0, version: VERSION, data: { openid: OPENID, isOwner: true } };
    }

    if (total === 0) return { code: 0, version: VERSION, data: { openid: OPENID, isOwner: false, needsOwnerSetup: true } };

    const admin = await admins
      .doc(OPENID)
      .get()
      .catch(() => null);
    return { code: 0, version: VERSION, data: { openid: OPENID, isOwner: Boolean(admin && admin.data && admin.data.status !== 'disabled'), needsOwnerSetup: false } };
  } catch (e) {
    console.error('[login] 云函数内部错误', e);
    return { code: -1, version: VERSION, message: 'login 云函数执行失败：' + e.message };
  }
};
