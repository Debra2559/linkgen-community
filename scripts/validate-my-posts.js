const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'pages/my-posts/my-posts.js'), 'utf8');
const template = fs.readFileSync(path.join(__dirname, '..', 'pages/my-posts/my-posts.wxml'), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(source.includes('function getMyPosts'), 'missing own-post filtering');
assert(source.includes('function getMyReplies'), 'missing own-reply filtering');
assert(source.includes("activeTab: 'posts'"), 'missing default posts tab');
assert(source.includes("key: 'replies'"), 'missing replies tab');
assert(source.includes('onPullDownRefresh'), 'missing pull-to-refresh handling');
assert(source.includes('pages/post-detail/post-detail?id='), 'missing post/reply detail navigation');
assert(template.includes('activeTab === item.key'), 'tabs do not expose a persistent active state');
assert(template.includes('visiblePosts.length'), 'missing own-post empty/list state');
assert(template.includes('visibleReplies.length'), 'missing own-reply empty/list state');

console.log('My activity contract OK');
