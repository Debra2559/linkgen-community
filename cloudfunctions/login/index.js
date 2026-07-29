// 云函数 login：获取 openid，并判断是否为 owner
// 规则：admins 集合为空时，第一个进入的人自动成为 owner；之后可在云数据库手动添加其他 admin
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  try {
    const ctx = cloud.getWXContext();
    console.log('[login] WXContext', ctx);
    const OPENID = ctx && ctx.OPENID;
    if (!OPENID) {
      return {
        code: -1,
        message: '无法获取用户 OPENID，可能原因：1）login 云函数未部署 2）当前是模拟器且无登录态 3）云开发环境未开通',
      };
    }

    const admins = db.collection('admins');
    const { total } = await admins.count();

    if (total === 0) {
      await admins.add({
        data: { _id: OPENID, createTime: db.serverDate() },
      });
      return { code: 0, data: { openid: OPENID, isOwner: true } };
    }

    const admin = await admins
      .doc(OPENID)
      .get()
      .catch(() => null);
    return { code: 0, data: { openid: OPENID, isOwner: !!admin } };
  } catch (e) {
    console.error('[login] 云函数内部错误', e);
    return { code: -1, message: 'login 云函数执行失败：' + e.message };
  }
};
