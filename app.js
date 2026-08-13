const { seedLocalData } = require('./utils/linkgen-data');

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
    if (wx.onAppRoute) wx.onAppRoute(() => this.applyTheme());
  },
  applyTheme(themeMode = wx.getStorageSync('linkgen_theme') || 'dark') {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.data.themeMode !== themeMode) currentPage.setData({ themeMode });
    const light = themeMode === 'light';
    wx.setNavigationBarColor({ frontColor: light ? '#000000' : '#ffffff', backgroundColor: light ? '#fffaf1' : '#050816', animation: { duration: 0, timingFunc: 'linear' } });
    if (wx.setTabBarStyle) wx.setTabBarStyle({ color: light ? '#83918c' : '#7180a0', selectedColor: light ? '#f36b4f' : '#9b7bff', backgroundColor: light ? '#ffffff' : '#0d1428', borderStyle: light ? 'white' : 'black' });
  },
  globalData: {
    cloudReady: false,
    currentUser: { id: 'u-me', name: '林小满', initials: '满', role: '产品设计师', city: '上海', tags: ['AI 产品', '设计协作'], color: '#e77b61' },
  },
});
