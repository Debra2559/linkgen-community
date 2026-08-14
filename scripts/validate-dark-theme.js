const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const app = JSON.parse(read('app.json'));
const appCss = read('app.wxss');
const theme = read('utils/theme.js');

if (app.window.backgroundColor !== '#fffaf1') throw new Error('默认页面背景必须保持负责人亮色主题');
if (app.tabBar.backgroundColor !== '#ffffff') throw new Error('默认 tabBar 必须保持负责人亮色主题');
if (!appCss.includes('--bg: #fffaf1;')) throw new Error('亮色变量缺失');
if (!appCss.includes('.theme-dark {') || !appCss.includes('--bg: #050816;')) throw new Error('暗色变量缺失');
if (!theme.includes("const THEME_KEY = 'linkgen_theme_v2';")) throw new Error('主题必须使用新 key，避免继承旧 PR 的暗色状态');
if (!theme.includes("return wx.getStorageSync(THEME_KEY) === 'dark' ? 'dark' : 'light';")) throw new Error('主题默认值必须是 light');
if (!read('pages/profile/profile.js').includes('toggleTheme')) throw new Error('主题切换入口缺失');
if (!read('pages/profile/profile.wxml').includes('class="theme-switch')) throw new Error('主题滑块缺失');

for (const pagePath of app.pages) {
  const pageName = `${pagePath}.wxml`;
  const markup = read(pageName);
  if (!markup.includes("themeMode === 'dark'")) throw new Error(`页面未接入主题类：${pageName}`);
}

console.log(`Dark theme contract OK: ${app.pages.length} app pages, light default preserved`);
