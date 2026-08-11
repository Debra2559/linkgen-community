# LinkGen 负责人审阅指南

> **[DO NOT MERGE — DISCUSSION ONLY]** 本分支用于异步讨论和方案评审。

## 先看什么

1. `linkgen-product-proposal.md`：产品目标、用户权限和范围。
2. `linkgen-technical-design.md`：CloudBase 推荐、数据表、权限和迁移。
3. `linkgen-change-notes.md`：每个与原项目不同的地方。
4. 本分支运行结果：体验任务筛选、发布、加入和状态推进。

## 建议评审问题

- “活动任务”是否应该与普通讨论共存于发现页？
- 任务类型、人数、截止日期和关联活动字段是否足够？
- 联系方式默认隐藏和成员主动公开是否合适？
- 谁是首期管理员，谁拥有生产 CloudBase 环境？
- 哪些字段或流程需要在真实成员试用后调整？

## 本地验证

```powershell
node tests/community-data.test.js
node --check utils/community-data.js
node --check pages/feed/feed.js
node --check pages/create-post/create-post.js
node --check pages/post-detail/post-detail.js
```

然后用微信开发者工具导入项目，编译后按以下路径体验：发现 → 活动任务 → 任务详情 → 我想加入 → 发布入口 → 发布活动任务。

## Git 边界

- 工作分支：`proposal/community-platform-plan`
- 目标远程：个人 Fork `Xues-idiot/linkgen-community`
- 不推送上游 `Debra2559/linkgen-community` 主线。
- 推送和 Draft PR 都要在本地检查完成后单独确认。

## 新增活动看板讨论

- 参考联谱的标准活动卡片、热门标签、城市筛选和日期分组方式。
- 第一版建议采用“成员投稿 → 待审核 → 已发布 → 已结束”的流程。
- 活动保留来源、投稿人和最后确认时间；外部活动只保存报名链接并跳转。
- 活动详情可关联协作任务，活动列表显示任务数量。
- 这部分先作为本分支提案，是否进入正式版本由负责人决定。
