# LinkGen CloudBase 测试环境申请与联调清单

> 目的：在不覆盖负责人当前微信开发者工具版本、不修改生产数据的前提下，建立一套可回滚的 LinkGen 测试环境。

## 请负责人先完成的事项

1. 在微信公众平台为 LinkGen 创建独立的 CloudBase 测试环境，建议命名为 `linkgen-test`（实际环境 ID 以后台为准）。
2. 确认测试环境与正式环境分离，禁止测试环境复用正式数据库集合。
3. 将我的微信加入小程序开发成员，并确认我拥有测试环境的云开发操作权限；不要授予发布、正式环境数据修改或安全规则管理权限，除非联调窗口另行确认。
4. 将以下信息发给我：
   - 测试环境 ID
   - 测试环境所在地域
   - 测试数据库集合清单
   - 可部署的云函数清单
   - 测试管理员 OpenID 配置方式
   - 当前 CloudBase SDK/基础库要求
5. 在测试环境配置测试管理员账号，不要直接把生产管理员名单复制过去。

## 建议环境边界

| 内容 | 测试环境 | 正式环境 |
|---|---|---|
| 小程序 AppID | 负责人指定的测试/开发 AppID | 正式 AppID |
| 数据库 | 与云函数相同的集合名，但位于独立测试环境 | 正式集合 |
| 云函数 | 测试部署版本 | 负责人审核后部署 |
| 定时采集 | 默认关闭，只允许手动触发 | 负责人确认后开启 |
| 通知 | 测试管理员/模拟通知 | 正式运营人员 |
| 数据 | 脱敏种子数据 | 真实用户数据 |

## 第一阶段集合（建议）

### `users`

| 字段 | 类型 | 说明 |
|---|---|---|
| `_openid` | string | 由微信云开发维护，不由前端传入 |
| `memberId` | string | 社区内部稳定身份 ID |
| `name` | string | 昵称 |
| `role` | string | 身份/职业 |
| `city` | string | 所在城市 |
| `avatar` | string | 头像地址或云文件 ID |
| `tags` | string[] | 社群标签 |
| `purpose` | string | 加入社群目的 |
| `status` | enum | `active` / `pending` / `disabled` |
| `createdAt` / `updatedAt` | date | 时间戳 |

### `posts`

| 字段 | 类型 | 说明 |
|---|---|---|
| `authorId` | string | 对应 `users.memberId` |
| `title` / `content` | string | 讨论内容 |
| `tags` | string[] | 统一标签 ID 或规范名称 |
| `status` | enum | `published` / `hidden` / `deleted` |
| `likeCount` / `commentCount` | number | 展示统计，服务端更新 |
| `createdAt` / `updatedAt` | date | 时间戳 |

### `post_comments`

| 字段 | 类型 | 说明 |
|---|---|---|
| `postId` | string | 所属帖子 |
| `authorId` | string | 回复者身份 |
| `content` | string | 回复内容 |
| `status` | enum | `published` / `deleted` |
| `createdAt` | date | 时间戳 |

### `events`

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` / `summary` | string | 活动标题与简介 |
| `startAt` / `endAt` | date | 活动时间 |
| `location` / `locationMode` | string | 地点及 `online` / `offline` |
| `organizerId` | string | 发布者或官方身份 |
| `sourceUrl` / `sourcePlatform` | string | 来源链接与平台 |
| `reviewStatus` | enum | `candidate` / `needs_info` / `pending` / `approved` / `rejected` / `expired` |
| `attendeeCount` / `maxAttendees` | number | 报名人数与上限 |
| `qualityScore` | number | 自动质量评分，可为空 |
| `riskFlags` | string[] | 缺失字段、来源风险等 |
| `createdAt` / `updatedAt` | date | 时间戳 |

### `event_registrations`

| 字段 | 类型 | 说明 |
|---|---|---|
| `eventId` | string | 活动 ID |
| `_openid` | string | 报名用户，由云函数获取 |
| `status` | enum | `active` / `cancelled` |
| `createdAt` / `updatedAt` | date | 时间戳 |

### `activity_candidates`

用于每日采集的候选池，不得直接写入已发布活动。

| 字段 | 类型 | 说明 |
|---|---|---|
| `sourceUrl` / `canonicalUrl` | string | 原始及规范化链接 |
| `sourcePlatform` / `sourceAccount` | string | 来源平台/账号 |
| `title` / `description` | string | 解析结果 |
| `fieldEvidence` | object | 各字段是否有证据 |
| `riskFlags` | string[] | 风险与缺失项 |
| `reviewStatus` | enum | `candidate` / `needs_info` / `pending` / `approved` / `rejected` |
| `contentHash` | string | 去重指纹 |
| `fetchedAt` / `reviewedAt` | date | 抓取及审核时间 |

### 运营与 Agent 集合

以下集合名必须与云函数代码一致；通过 CloudBase 环境隔离测试数据，不要给集合名增加环境前缀：

| 集合 | 用途 |
|---|---|
| `admins` | 测试管理员 OpenID、角色、通知偏好 |
| `audit_logs` | 审核、发布、来源和通知操作记录 |
| `agent_sources` | 公开来源、授权状态、关键词和启停配置 |
| `agent_settings` | Agent 总开关、频率和质量阈值；文档 ID 为 `default` |
| `agent_runs` | 每次采集任务运行记录、互斥锁和错误 |
| `source_items` | 来源文章/活动的去重原始摘要 |
| `post_likes` | 帖子点赞关系，唯一键建议为 `postId + memberId` 的哈希 |

资料库相关功能还会使用 `library_resources` 和 `library_saves`；如果本轮不联调资料库，可以暂不创建，但不要误删已有集合。

## 首批云函数联调清单

- `login`：返回测试环境 OpenID 和管理员状态。
- `parseActivityLink`：公开链接解析；解析失败必须返回明确错误，不生成伪造字段。
- `listPublishedEvents` / `getPublishedEvent`：只返回 `approved` 且未过期的活动。
- `registerForEvent`：服务端获取 OpenID，校验重复报名、人数上限和取消报名。
- `approveActivityCandidate` / `rejectActivityCandidate`：仅测试管理员可用。
- `manageActivityAgent`：读取候选、来源和任务状态；测试环境默认不启用定时器。
- `activityAgent`：只写入 `activity_candidates`，不得直接发布。
- `manageCommunityContent`：测试用户资料、我的动态、发帖、回复和点赞接口；服务端从 WXContext 获取 OpenID。

## 权限底线

- 客户端不得自行传入或覆盖 `_openid`、管理员身份、报名人数和审核状态。
- `users`、`posts`、`post_comments`、`event_registrations` 的写入尽量通过云函数完成。
- 普通用户不能读取管理员集合、采集配置和未发布候选。
- 测试环境数据必须可清空，禁止导入真实用户隐私数据。
- 所有审核和发布动作记录操作者、时间和前后状态。
- `posts` 建议索引：`status + createdAt`、`authorId + createdAt`。
- `post_comments` 建议索引：`postId + createdAt`、`authorId + createdAt`。
- `events` 建议索引：`reviewStatus + startAt`、`visibility + startAt`。
- `activity_candidates` 建议索引：`reviewStatus + createdAt`、`contentHash`、`sourcePlatform + fetchedAt`。
- `event_registrations` 建议索引：`eventId + status`、`_openid + status`。
- `audit_logs` 建议索引：`createdAt`、`actor + createdAt`。

## 联调验收顺序

1. 登录：测试账号能获得稳定 `memberId`，退出后不串号。
2. 名片：修改资料后，通讯录和成员名片能读取同一份数据。
3. 动态：发布帖子、回复、点赞后，“我的动态”只显示当前用户内容。
4. 活动：提交活动进入 `pending`，审核通过后才出现在日历。
5. 报名：重复报名、满员报名、取消报名均由云函数校验。
6. 解析：用一条公开公众号链接和一条公开小红书链接测试成功、缺字段、失败三种结果。
7. 运营：候选、待补充、待审核、已发布、已驳回状态可流转且有记录。
8. 采集：手动触发一次测试任务，确认只进入候选池；确认定时器仍关闭。
9. 回归：亮色/暗色主题、页面切换、按钮反馈和空状态无回归。

## 发布闸门

以下条件全部满足后，才讨论正式环境：

- 测试环境验收清单全部通过。
- 负责人审核 PR 并合并到 `main`。
- 负责人确认正式数据库字段、索引和安全规则。
- 负责人确认云函数部署顺序和回滚方式。
- 负责人确认上传体验版时间窗口。
- 自动采集来源已获得必要授权，且通知对象已确认。

在此之前，本分支只做本地开发和测试环境工作，不上传正式 AppID 的开发版本。
