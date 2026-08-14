const { seedLocalData } = require('./utils/linkgen-data');
const { getThemeMode, applyThemeChrome } = require('./utils/theme');

App({
  onLaunch() {
    if (wx.cloud && typeof wx.cloud.init === 'function') {
      try {
        const cloudOptions = { traceUser: true };
        if (wx.cloud.DYNAMIC_CURRENT_ENV) cloudOptions.env = wx.cloud.DYNAMIC_CURRENT_ENV;
        wx.cloud.init(cloudOptions);
        this.globalData.cloudReady = true;
      } catch (error) {
        this.globalData.cloudReady = false;
        console.warn('[LinkGen] CloudBase 初始化失败，将使用本地演示数据', error);
      }
    }
    seedLocalData();
    applyThemeChrome(getThemeMode());
    if (wx.onAppRoute) wx.onAppRoute(() => {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const themeMode = getThemeMode();
      if (currentPage && currentPage.data.themeMode !== themeMode) currentPage.setData({ themeMode });
      applyThemeChrome(themeMode);
    });
  },
  onShow() { applyThemeChrome(getThemeMode()); },
  globalData: {
    cloudReady: false,
    currentUser: { id: 'u-me', name: '林小满', initials: '满', role: '产品设计师', city: '上海', tags: ['AI 产品', '设计协作'], color: '#e77b61' },
  },
});
