// 云函数 login：获取 openid，并判断是否为 owner
// 规则：admins 集合为空时，第一个进入的人自动成为 owner；之后可在云数据库手动添加其他 admin
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

    if (total === 0) {
      await admins.add({
        data: { _id: OPENID, createTime: db.serverDate() },
      });
      return { code: 0, version: VERSION, data: { openid: OPENID, isOwner: true } };
    }

    const admin = await admins
      .doc(OPENID)
      .get()
      .catch(() => null);
    return { code: 0, version: VERSION, data: { openid: OPENID, isOwner: !!admin } };
  } catch (e) {
    console.error('[login] 云函数内部错误', e);
    return { code: -1, version: VERSION, message: 'login 云函数执行失败：' + e.message };
  }
};
