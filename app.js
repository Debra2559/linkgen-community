const { seedLocalData } = require('./utils/linkgen-data');

App({
  onLaunch() {
    seedLocalData();
  },
  globalData: {
    currentUser: { id: 'u-me', name: '林小满', initials: '满', role: '产品设计师', city: '上海', tags: ['AI 产品', '设计协作'], color: '#e77b61' },
  },
});
