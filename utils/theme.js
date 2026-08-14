const THEME_KEY = 'linkgen_theme_v2';

function getThemeMode() {
  return wx.getStorageSync(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

function setThemeMode(mode) {
  const themeMode = mode === 'dark' ? 'dark' : 'light';
  wx.setStorageSync(THEME_KEY, themeMode);
  return themeMode;
}

function applyThemeChrome(themeMode = getThemeMode()) {
  const dark = themeMode === 'dark';
  if (wx.setNavigationBarColor) {
    wx.setNavigationBarColor({
      frontColor: dark ? '#f5f7ff' : '#ffffff',
      backgroundColor: dark ? '#050816' : '#161310',
      animation: { duration: 120, timingFunc: 'easeIn' },
    });
  }
  if (wx.setTabBarStyle) {
    wx.setTabBarStyle({
      color: dark ? '#7180a0' : '#83918c',
      selectedColor: dark ? '#9b7bff' : '#f36b4f',
      backgroundColor: dark ? '#0d1428' : '#ffffff',
      borderStyle: dark ? 'black' : 'white',
    });
  }
}

module.exports = { THEME_KEY, getThemeMode, setThemeMode, applyThemeChrome };
