const SUPPLY_TYPES = [
  { key: 'stock', label: '现有食材' },
  { key: 'purchase', label: '需要采买' },
  { key: 'retail', label: '直接购买' },
];

const SUPPLY_FILTERS = [{ key: '', label: '全部' }, ...SUPPLY_TYPES];
const MENU_FILTERS = [...SUPPLY_FILTERS, { key: 'fitness', label: '健身推荐' }];

function normalizeSupplyType(value) {
  return SUPPLY_TYPES.some((item) => item.key === value) ? value : 'stock';
}

function getSupplyTypeLabel(value) {
  const type = SUPPLY_TYPES.find((item) => item.key === normalizeSupplyType(value));
  return type.label;
}

function getMenuFilterLabel(value) {
  const filter = MENU_FILTERS.find((item) => item.key === value);
  return filter ? filter.label : '全部采购方式';
}

module.exports = {
  SUPPLY_TYPES,
  SUPPLY_FILTERS,
  MENU_FILTERS,
  normalizeSupplyType,
  getSupplyTypeLabel,
  getMenuFilterLabel,
};
