const MENU_TYPES = [
  { key: 'home', label: '家常菜' },
  { key: 'sukiyaki', label: '寿喜锅' },
  { key: 'chongqing', label: '重庆火锅' },
];

function normalizeMenuType(value) {
  return MENU_TYPES.some((item) => item.key === value) ? value : 'home';
}

function getMenuTypeLabel(value) {
  const type = MENU_TYPES.find((item) => item.key === normalizeMenuType(value));
  return type.label;
}

module.exports = { MENU_TYPES, normalizeMenuType, getMenuTypeLabel };
