const { call } = require('../../utils/cloud');
const { resolveDishImages } = require('../../utils/menu-images');
const { SUPPLY_TYPES, MENU_FILTERS, getMenuFilterLabel, getSupplyTypeLabel, normalizeSupplyType } = require('../../utils/supply-types');

Page({
  data: {
    loading: true,
    saving: false,
    uploadingImage: false,
    categories: [],
    categoryDishCounts: {},
    dishes: [],
    visibleDishes: [],
    activeTab: 'dishes',
    tabs: [
      { key: 'dishes', label: '菜品管理' },
      { key: 'categories', label: '分类管理' },
    ],
    draggingCategoryId: '',
    draggingDishId: '',
    activeCategoryId: '',
    supplyTypes: SUPPLY_TYPES,
    supplyFilters: MENU_FILTERS,
    supplyFilter: '',
    editing: false,
    editingCategory: false,
    categoryIndex: 0,
    supplyTypeIndex: 0,
    categoryForm: {
      categoryId: '',
      name: '',
      sort: 99,
      enabled: true,
    },
    form: {
      dishId: '',
      name: '',
      price: '',
      desc: '',
      emoji: '✦',
      categoryId: '',
      supplyType: 'stock',
      fitnessRecommended: false,
      image: '',
      soldOut: false,
    },
  },

  onLoad() {
    this.loadMenu();
  },

  async loadMenu() {
    this.setData({ loading: true });
    try {
      const { categories = [], dishes = [] } = await call('manageMenu', { action: 'list' });
      const normalized = resolveDishImages(dishes).map((dish, index) => ({
        ...dish,
        supplyType: normalizeSupplyType(dish.supplyType),
        supplyTypeLabel: getSupplyTypeLabel(dish.supplyType),
        fitnessRecommended: !!dish.fitnessRecommended,
        storedImage: dishes[index].image || '',
        dragOffset: 0,
      }));
      const normalizedCategories = categories.map((category) => ({
        ...category,
        enabled: category.enabled !== false,
        dragOffset: 0,
      }));
      const categoryDishCounts = {};
      normalized.forEach((dish) => {
        categoryDishCounts[dish.categoryId] = (categoryDishCounts[dish.categoryId] || 0) + 1;
      });
      this.setData({
        categories: normalizedCategories,
        categoryDishCounts,
        dishes: normalized,
        loading: false,
      }, () => this.applyFilter());
    } catch (e) {
      this.setData({ loading: false });
      wx.showModal({ title: '菜单加载失败', content: e.message || '请确认当前账号是 Owner', showCancel: false });
    }
  },

  applyFilter() {
    const { activeCategoryId, supplyFilter, dishes } = this.data;
    this.setData({
      visibleDishes: dishes.filter((dish) => {
        const matchCategory = !activeCategoryId || dish.categoryId === activeCategoryId;
        const matchSupply = supplyFilter === 'fitness'
          ? dish.fitnessRecommended
          : !supplyFilter || dish.supplyType === supplyFilter;
        return matchCategory && matchSupply;
      }).map((dish) => ({ ...dish, dragOffset: 0 })),
    });
  },

  onPickCategory(e) {
    this.setData({ activeCategoryId: e.currentTarget.dataset.id }, () => this.applyFilter());
  },

  onPickSupplyFilter(e) {
    const supplyFilter = e.currentTarget.dataset.key || '';
    this.setData({ supplyFilter }, () => this.applyFilter());
  },

  onSwitchTab(e) {
    const activeTab = e.currentTarget.dataset.key;
    if (activeTab === this.data.activeTab) return;
    this.setData({ activeTab, editing: false, editingCategory: false });
  },

  openAddDish() {
    const categoryId = this.data.activeCategoryId || (this.data.categories[0] && this.data.categories[0]._id) || '';
    if (!categoryId) {
      wx.showToast({ title: '请先创建菜品分类', icon: 'none' });
      return;
    }
    this.setData({
      editing: true,
      categoryIndex: Math.max(0, this.data.categories.findIndex((category) => category._id === categoryId)),
      supplyTypeIndex: 0,
      form: { dishId: '', name: '', price: '', desc: '', emoji: '✦', categoryId, supplyType: 'stock', fitnessRecommended: false, image: '', soldOut: false },
    });
  },

  openEdit(e) {
    const dish = this.data.dishes.find((item) => item._id === e.currentTarget.dataset.id);
    if (!dish) return;
    this.setData({
      editing: true,
      categoryIndex: Math.max(0, this.data.categories.findIndex((category) => category._id === dish.categoryId)),
      supplyTypeIndex: Math.max(0, this.data.supplyTypes.findIndex((type) => type.key === dish.supplyType)),
      form: {
        dishId: dish._id,
        name: dish.name,
        price: String(dish.price),
        desc: dish.desc || '',
        emoji: dish.emoji || '✦',
        categoryId: dish.categoryId,
        supplyType: normalizeSupplyType(dish.supplyType),
        fitnessRecommended: !!dish.fitnessRecommended,
        image: dish.storedImage || dish.image || '',
        soldOut: !!dish.soldOut,
      },
    });
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  onCategoryChange(e) {
    const categoryIndex = Number(e.detail.value);
    this.setData({
      categoryIndex,
      'form.categoryId': this.data.categories[categoryIndex]._id,
    });
  },

  onSupplyTypeChange(e) {
    const supplyTypeIndex = Number(e.detail.value);
    this.setData({
      supplyTypeIndex,
      'form.supplyType': this.data.supplyTypes[supplyTypeIndex].key,
    });
  },

  onFitnessRecommendedChange(e) {
    this.setData({ 'form.fitnessRecommended': !!e.detail.value });
  },

  onSoldOutChange(e) {
    this.setData({ 'form.soldOut': !!e.detail.value });
  },

  async chooseDishImage() {
    if (this.data.uploadingImage) return;
    const choose = wx.chooseMedia
      ? (success, fail) => wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], success, fail })
      : (success, fail) => wx.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success, fail });
    choose(async (result) => {
      const filePath = result.tempFiles ? result.tempFiles[0].tempFilePath : result.tempFilePaths[0];
      if (!filePath) return;
      this.setData({ uploadingImage: true });
      try {
        const uploaded = await wx.cloud.uploadFile({
          cloudPath: `dishes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`,
          filePath,
        });
        this.setData({ 'form.image': uploaded.fileID, uploadingImage: false });
      } catch (e) {
        this.setData({ uploadingImage: false });
        wx.showModal({ title: '图片上传失败', content: e.errMsg || e.message || '请稍后重试', showCancel: false });
      }
    }, () => {});
  },

  clearDishImage() {
    this.setData({ 'form.image': '' });
  },

  closeEditor() {
    if (this.data.saving) return;
    this.setData({ editing: false });
  },

  async saveDish() {
    const { form } = this.data;
    if (!form.name.trim()) {
      wx.showToast({ title: '请填写菜名', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await call('manageMenu', { action: 'upsert', ...form });
      this.setData({ editing: false, saving: false });
      wx.showToast({ title: '已保存', icon: 'success' });
      this.loadMenu();
    } catch (e) {
      this.setData({ saving: false });
      wx.showModal({ title: '保存失败', content: e.message || '请稍后重试', showCancel: false });
    }
  },

  openAddCategory() {
    this.setData({
      editingCategory: true,
      categoryForm: { categoryId: '', name: '', sort: this.data.categories.length + 1, enabled: true },
    });
  },

  openEditCategory(e) {
    const category = this.data.categories.find((item) => item._id === e.currentTarget.dataset.id);
    if (!category) return;
    this.setData({
      editingCategory: true,
      categoryForm: {
        categoryId: category._id,
        name: category.name,
        sort: category.sort || 99,
        enabled: category.enabled !== false,
      },
    });
  },

  onCategoryInput(e) {
    this.setData({ [`categoryForm.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  closeCategoryEditor() {
    if (this.data.saving) return;
    this.setData({ editingCategory: false });
  },

  async saveCategory() {
    const { categoryForm } = this.data;
    if (!categoryForm.name.trim()) {
      wx.showToast({ title: '请填写分类名称', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await call('manageMenu', { action: 'upsertCategory', ...categoryForm });
      this.setData({ saving: false, editingCategory: false });
      wx.showToast({ title: '分类已保存', icon: 'success' });
      this.loadMenu();
    } catch (e) {
      this.setData({ saving: false });
      wx.showModal({ title: '保存分类失败', content: e.message || '请稍后重试', showCancel: false });
    }
  },

  async toggleCategory(e) {
    const category = this.data.categories.find((item) => item._id === e.currentTarget.dataset.id);
    if (!category) return;
    const enabled = !category.enabled;
    try {
      await call('manageMenu', { action: 'toggleCategory', categoryId: category._id, enabled });
      wx.showToast({ title: enabled ? '分类已上架' : '分类已下架', icon: 'success' });
      this.loadMenu();
    } catch (error) {
      wx.showModal({ title: '分类状态更新失败', content: error.message || '请稍后重试', showCancel: false });
    }
  },

  onCategoryTouchStart(e) {
    const id = e.currentTarget.dataset.id;
    const index = this.data.categories.findIndex((category) => category._id === id);
    const pageY = e.touches && e.touches[0] ? e.touches[0].pageY : 0;
    if (index < 0 || !pageY) return;
    this._categoryDrag = {
      id,
      startIndex: index,
      lastIndex: index,
      startY: pageY,
      moved: false,
    };
    this.setData({ draggingCategoryId: id });
  },

  onCategoryTouchMove(e) {
    const drag = this._categoryDrag;
    const touch = e.touches && e.touches[0];
    if (!drag || !touch) return;
    const windowWidth = wx.getSystemInfoSync().windowWidth || 375;
    const rowHeight = Math.max(76, windowWidth * 160 / 750);
    const offset = Math.round((touch.pageY - drag.startY) / rowHeight);
    const targetIndex = Math.max(0, Math.min(this.data.categories.length - 1, drag.startIndex + offset));
    const offsetRpx = Math.round((touch.pageY - drag.startY) * 750 / windowWidth);
    if (targetIndex === drag.lastIndex) {
      const categories = this.data.categories.map((category) => (
        category._id === drag.id ? { ...category, dragOffset: offsetRpx } : category
      ));
      this.setData({ categories, draggingCategoryId: drag.id });
      return;
    }
    const categories = this.data.categories.slice();
    const [moved] = categories.splice(drag.lastIndex, 1);
    categories.splice(targetIndex, 0, { ...moved, dragOffset: 0 });
    categories.forEach((category) => { category.dragOffset = 0; });
    drag.lastIndex = targetIndex;
    drag.moved = true;
    this.setData({ categories, draggingCategoryId: drag.id });
  },

  onCategoryTouchEnd() {
    const drag = this._categoryDrag;
    this._categoryDrag = null;
    const categories = this.data.categories.map((category) => ({ ...category, dragOffset: 0 }));
    this.setData({ categories, draggingCategoryId: '' });
    if (!drag || !drag.moved) return;
    const categoryIds = this.data.categories.map((category) => category._id);
    call('manageMenu', { action: 'reorderCategories', categoryIds })
      .then(() => wx.showToast({ title: '分类顺序已保存', icon: 'success' }))
      .catch((error) => {
        wx.showModal({ title: '排序保存失败', content: error.message || '请稍后重试', showCancel: false });
        this.loadMenu();
      });
  },

  onDishTouchStart(e) {
    if (!this.data.activeCategoryId || this.data.supplyFilter) return;
    const id = e.currentTarget.dataset.id;
    const index = this.data.visibleDishes.findIndex((dish) => dish._id === id);
    const pageY = e.touches && e.touches[0] ? e.touches[0].pageY : 0;
    if (index < 0 || !pageY) return;
    this._dishDrag = {
      id,
      startIndex: index,
      lastIndex: index,
      startY: pageY,
      moved: false,
    };
    this.setData({ draggingDishId: id });
  },

  onDishTouchMove(e) {
    const drag = this._dishDrag;
    const touch = e.touches && e.touches[0];
    if (!drag || !touch) return;
    const windowWidth = wx.getSystemInfoSync().windowWidth || 375;
    const rowHeight = Math.max(120, windowWidth * 190 / 750);
    const offset = Math.round((touch.pageY - drag.startY) / rowHeight);
    const targetIndex = Math.max(0, Math.min(this.data.visibleDishes.length - 1, drag.startIndex + offset));
    const offsetRpx = Math.round((touch.pageY - drag.startY) * 750 / windowWidth);
    if (targetIndex === drag.lastIndex) {
      const visibleDishes = this.data.visibleDishes.map((dish) => (
        dish._id === drag.id ? { ...dish, dragOffset: offsetRpx } : { ...dish, dragOffset: 0 }
      ));
      this.setData({ visibleDishes, draggingDishId: drag.id });
      return;
    }
    const visibleDishes = this.data.visibleDishes.slice();
    const [moved] = visibleDishes.splice(drag.lastIndex, 1);
    visibleDishes.splice(targetIndex, 0, { ...moved, dragOffset: 0 });
    visibleDishes.forEach((dish) => { dish.dragOffset = 0; });
    drag.lastIndex = targetIndex;
    drag.startY = touch.pageY;
    drag.moved = true;
    const movedById = {};
    visibleDishes.forEach((dish, index) => {
      movedById[dish._id] = { ...dish, sort: index + 1 };
    });
    const dishes = this.data.dishes.map((dish) => movedById[dish._id] || dish);
    this.setData({ visibleDishes, dishes, draggingDishId: drag.id });
  },

  onDishTouchEnd() {
    const drag = this._dishDrag;
    this._dishDrag = null;
    const visibleDishes = this.data.visibleDishes.map((dish) => ({ ...dish, dragOffset: 0 }));
    this.setData({ visibleDishes, draggingDishId: '' });
    if (!drag || !drag.moved) return;
    const dishIds = visibleDishes.map((dish) => dish._id);
    call('manageMenu', { action: 'reorderDishes', dishIds, categoryId: this.data.activeCategoryId })
      .then(() => wx.showToast({ title: '菜品顺序已保存', icon: 'success' }))
      .catch((error) => {
        wx.showModal({ title: '排序保存失败', content: error.message || '请稍后重试', showCancel: false });
        this.loadMenu();
      });
  },

  stopTouch() {},

  removeCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除这个分类？',
      content: '分类下没有菜品时才能删除。',
      confirmText: '删除',
      confirmColor: '#b8452a',
      success: async (result) => {
        if (!result.confirm) return;
        try {
          await call('manageMenu', { action: 'removeCategory', categoryId });
          if (this.data.activeCategoryId === categoryId) this.setData({ activeCategoryId: '' });
          wx.showToast({ title: '分类已删除', icon: 'success' });
          this.loadMenu();
        } catch (error) {
          wx.showModal({ title: '删除分类失败', content: error.message || '请先处理分类下的菜品', showCancel: false });
        }
      },
    });
  },

  async toggleSoldOut(e) {
    const dish = this.data.dishes.find((item) => item._id === e.currentTarget.dataset.id);
    if (!dish) return;
    try {
      await call('manageMenu', { action: 'toggleSoldOut', dishId: dish._id, soldOut: !dish.soldOut });
      this.loadMenu();
    } catch (error) {
      wx.showModal({ title: '操作失败', content: error.message || '请稍后重试', showCancel: false });
    }
  },

  batchSetAvailability(e) {
    const soldOut = e.currentTarget.dataset.action === 'unpublish';
    const dishes = this.data.visibleDishes;
    if (!dishes.length) {
      wx.showToast({ title: '当前批次没有菜品', icon: 'none' });
      return;
    }
    const supplyLabel = getMenuFilterLabel(this.data.supplyFilter);
    wx.showModal({
      title: `${soldOut ? '下架' : '上架'}当前 ${dishes.length} 道菜？`,
      content: `${this.data.activeCategoryId ? '当前分类' : '全部分类'} · ${supplyLabel}`,
      confirmText: soldOut ? '确认下架' : '确认上架',
      confirmColor: soldOut ? '#a35d52' : '#3f7c68',
      success: async (result) => {
        if (!result.confirm) return;
        try {
          const response = await call('manageMenu', {
            action: 'batchSoldOut',
            dishIds: dishes.map((dish) => dish._id),
            soldOut,
          });
          wx.showToast({ title: `${soldOut ? '下架' : '上架'} ${response.count || dishes.length} 道`, icon: 'success' });
          this.loadMenu();
        } catch (error) {
          wx.showModal({ title: '批量操作失败', content: error.message || '请稍后重试', showCancel: false });
        }
      },
    });
  },

  removeDish(e) {
    const dishId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除这道菜？',
      content: '删除后，历史订单仍会保留菜名。',
      confirmText: '删除',
      confirmColor: '#b8452a',
      success: async (result) => {
        if (!result.confirm) return;
        try {
          await call('manageMenu', { action: 'remove', dishId });
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadMenu();
        } catch (error) {
          wx.showModal({ title: '删除失败', content: error.message || '请稍后重试', showCancel: false });
        }
      },
    });
  },

  goBack() {
    wx.navigateBack();
  },

  noop() {},
});
