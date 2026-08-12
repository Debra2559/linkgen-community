# LinkGen 明暗主题页面验收清单

> 范围以 `app.json` 注册页面为准。默认主题为暗色，亮色由根节点的 `theme-light` 类切换。

## 统一检查标准

- 页面根节点包含 `themeMode`，路由进入后能继承当前主题。
- 页面、卡片、输入框、底栏和弹层使用主题变量，不出现无意的纯白背景。
- 主操作按钮使用 `--action-bg` / `--action-text`，不把文字变量 `--ink` 当背景色。
- 可选择控件具有默认、按下、选中和禁用状态；选中不能只依靠文字变化。
- 暗色模式正文、辅助文字、边框和占位文字保持可读；亮色模式不受暗色覆盖影响。

## 页面矩阵

| 页面 | 路径 | 重点组件 | 状态 |
|---|---|---|---|
| 发现 | `pages/feed/feed` | 搜索、标签、帖子卡片、快捷入口、浮动按钮 | 已检查 |
| 活动 | `pages/events/events` | 顶部标签、筛选器、时间轴、日/月历、活动卡片 | 已检查 |
| 通讯录 | `pages/contacts/contacts` | 搜索、标签、成员列表 | 已检查 |
| 我的 | `pages/profile/profile` | 主题开关、名片、菜单、统计 | 已检查 |
| 讨论详情 | `pages/post-detail/post-detail` | 内容卡、标签、任务操作、回复栏 | 已检查 |
| 活动详情 | `pages/event-detail/event-detail` | 信息卡、报名按钮、来源、底部弹层 | 已检查 |
| 成员名片 | `pages/member-detail/member-detail` | 简介卡、标签、联系按钮 | 已检查 |
| 数字名片预览 | `pages/profile-preview/profile-preview` | 名片、说明卡、编辑按钮 | 已检查 |
| 我的动态 | `pages/my-posts/my-posts` | 统计、页签、内容卡、空状态 | 已检查 |
| 发起讨论 | `pages/create-post/create-post` | 编辑器、附件、标签、提交按钮 | 已检查 |
| 创建活动 | `pages/create-event/create-event` | 表单、类型、地点、人数、提交按钮 | 已检查 |
| 编辑名片 | `pages/edit-profile/edit-profile` | 头像、输入、标签、预览/保存按钮 | 已检查 |
| 运营管理 | `pages/admin-review/admin-review` | 状态卡、来源配置、筛选、审核按钮 | 已检查 |

## 交互反馈规则

- `button`、标签、头像选项和分类选项按下时缩放至 `0.98` 并降低透明度。
- 标签选中时使用主题色背景/边框，并显示勾选或外圈阴影。
- 禁用按钮降低透明度，仍保留与页面一致的暗色表面，不显示刺眼白块。
- 主操作使用紫色强调背景；次操作使用暗色抬升表面。

## 后续新增页面要求

1. 将页面注册到 `app.json`。
2. 根节点加入 `{{themeMode === 'light' ? 'theme-light' : ''}}`。
3. 表面优先使用 `--bg`、`--card`、`--surface-raised`、`--surface-input`。
4. 文字优先使用 `--ink`、`--ink-soft`、`--muted`。
5. 主操作使用 `--action-bg`、`--action-text`。
6. 在暗色和亮色下分别检查默认、按下、选中、禁用和弹层状态。
