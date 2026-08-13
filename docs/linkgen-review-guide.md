# LinkGen 负责人审阅指南

> **[DO NOT MERGE — DISCUSSION ONLY]** 本分支用于异步讨论和方案评审。

## 先看什么

1. `OWNER-HANDOFF-20260813.md`：本次交接入口、完成项和负责人待办。
2. `PRODUCT-TASKS-20260813.md`：10 项需求的逐项状态和未完成边界。
3. `CLOUDBASE-TEST-ENV-REQUEST.md`：测试环境、数据表、权限和验收顺序。
4. `git diff main...codex/dark-theme`：本分支相对主线的完整差异。

## 建议评审问题

- “活动任务”是否应该与普通讨论共存于发现页？
- 任务类型、人数、截止日期和关联活动字段是否足够？
- 联系方式默认隐藏和成员主动公开是否合适？
- 谁是首期管理员，谁拥有生产 CloudBase 环境？
- 哪些字段或流程需要在真实成员试用后调整？

## 本地验证

```powershell
node scripts/validate-linkgen-release.js
node tests/community-data.test.js
```

然后用微信开发者工具导入项目，先验收：编辑名片标签 → 发起讨论标签 → 通讯录筛选 → 提交活动 → 我的动态 → 运营管理。

## Git 边界

- 工作分支：`codex/dark-theme`
- 目标远程：`Debra2559/linkgen-community`
- 不推送或合并 `main`。
- 当前分支已经推送，负责人可直接打开 Draft PR 审阅。

## 新增活动看板讨论

- 参考联谱的标准活动卡片、热门标签、城市筛选和日期分组方式。
- 第一版建议采用“成员投稿 → 待审核 → 已发布 → 已结束”的流程。
- 活动保留来源、投稿人和最后确认时间；外部活动只保存报名链接并跳转。
- 活动详情可关联协作任务，活动列表显示任务数量。
- 这部分先作为本分支提案，是否进入正式版本由负责人决定。
