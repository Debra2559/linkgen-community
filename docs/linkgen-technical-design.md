# LinkGen 技术方案（讨论稿）

> 本文是实现建议，不是生产部署指令。当前原型仍使用本地 `wx` Storage。

## 推荐架构

首期推荐微信云开发 CloudBase：小程序登录提供 OpenID，云函数承载写操作，云数据库存储内容，云存储保存头像等资源。页面不直接依赖数据库 SDK，而是调用统一的数据服务层；当前服务层接本地 Storage，未来替换为 CloudBase adapter。

## 数据集合

| 集合 | 关键字段 | 说明 |
| --- | --- | --- |
| users | openid、nickname、role、sourceGroup、profileVisibility | OpenID 是内部身份，昵称只用于展示 |
| profiles | userId、role、city、bio、tags、wechatId、wechatVisible | 联系方式单独受权限控制 |
| posts | type、authorId、title、body、tags、eventId、moderationStatus | `type` 为 discussion/task |
| tasks | postId、kind、status、neededPeople、deadline、interestedIds、participantIds | 任务生命周期与参与关系 |
| events | title、startAt、location、source、reviewStatus | 外部活动先人工确认 |
| reports | reporterId、targetId、reason、status、handledBy | 管理员审核队列 |
| auditLogs | actorId、action、targetId、createdAt | 建议保留 180 天，待负责人确认 |

## 云函数边界

- `login`：建立或读取 OpenID 对应用户。
- `listContent` / `getContent`：按可见性返回讨论和任务。
- `createContent`：服务端校验字段和活动关联规则。
- `toggleTaskInterest` / `toggleTaskJoin`：服务端防重复、校验状态和人数。
- `transitionTask`：只允许创建者或管理员推进状态。
- `reportContent` / `moderateContent`：举报进入队列，管理员决定隐藏。

所有写操作都要在云函数中重新校验身份、角色、字段长度和状态，不能信任前端传来的 `role`、`authorId` 或 `isAdmin`。

## 权限与隐私

- 默认最小权限：游客只读公开内容，成员才能写内容和看已公开联系方式。
- 微信号默认隐藏；用户主动开启后才返回给成员接口。
- 删除资料后，联系方式立即失效；必要的举报/审计记录限期保留。
- 测试环境与生产环境分离；生产账号归项目负责人或社区长期账号，至少两名可信管理员可交接。
- 不抓取微信群聊天记录，不把 OpenID、微信号写进公开帖子或日志。

## 迁移路径

1. 保持页面调用 `utils/community-data.js`。
2. 实现 CloudBase adapter，先只读并与本地样例对照。
3. 建立测试环境集合，导入 10–20 名自愿成员和样例活动。
4. 验证权限、举报、删除和备份恢复。
5. 负责人确认后再切换正式环境。

## 任务安全迁移清单（必须完成）

当前本地原型已经补齐基础输入校验，但身份、人数和状态推进仍属于客户端模拟逻辑，不能直接作为生产实现。正式接入 CloudBase 时必须迁移到云函数：

| 能力 | 云函数职责 | 必须使用的可信数据 |
| --- | --- | --- |
| 身份 | 从 `cloud.getWXContext().OPENID` 识别当前用户，禁止信任前端 `memberId` | `OPENID`、`users`、`admins` |
| 人数 | 原子读取任务并检查 `participantIds.length < neededPeople`，防止并发超员 | `tasks` 当前版本、参与关系 |
| 状态推进 | 只允许任务创建者或管理员推进 `recruiting → in_progress → completed/cancelled` | `creatorId`、`admins`、状态机 |

### 推荐云函数接口

- `createTask`：校验标题、正文、任务类型、人数、截止日期和关联活动，并写入 `creatorId`。
- `toggleTaskJoin`：以 OPENID 作为参与者身份，使用事务或条件更新防止重复加入和超员。
- `transitionTask`：服务端重新读取任务和管理员权限后再推进状态。
- `toggleTaskInterest`：以 OPENID 去重，不接受前端传入的任意身份作为授权依据。

### 上线前验收项

- [ ] 云函数中不使用前端传入的 `authorId`、`memberId` 或 `isAdmin` 做权限判断。
- [ ] 非创建者/非管理员推进状态时返回拒绝。
- [ ] 两个并发加入请求不会超过 `neededPeople`。
- [ ] 用户昵称修改不影响其参与关系。
- [ ] 云函数错误和权限拒绝都有前端可理解的提示。
- [ ] 本地 Storage 适配器与 CloudBase 适配器的字段协议一致。

## 成本与风险

CloudBase 适合当前约 500 人以内的低运维阶段，但仍需负责人确认套餐、云函数调用量、数据库读写量、备份和管理员交接。首期不接订阅消息；通知规则先在数据模型中保留，第二阶段再申请模板和用户授权。
