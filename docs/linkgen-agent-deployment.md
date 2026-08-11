# LinkGen Agent 部署清单

## 1. CloudBase

在微信开发者工具中开通或选择云开发环境，部署以下云函数：

```text
login
activityAgent
parseActivityLink
manageActivityAgent
listActivityCandidates
approveActivityCandidate
rejectActivityCandidate
updateActivityCandidate
listPublishedEvents
getPublishedEvent
registerForEvent
listLibraryResources
getLibraryResource
toggleLibrarySave
manageLibraryResource
libraryMaintenance
```

`activityAgent/config.json` 已配置每日定时触发器（7 段 Cron，UTC+8）。首次部署后，在云开发控制台确认触发器存在；微信官方提示定时触发可能重复推送，Agent 已通过运行互斥、内容 hash 和活动指纹降低重复执行与重复候选风险。

## 2. 数据库集合

创建以下集合：

| 集合 | 作用 |
| --- | --- |
| `admins` | `_id` 使用管理员 openid；保存 `role`、`status`、`agentNotify` |
| `users` | 用户 `_openid`、成员状态；用于 `member` 资料访问控制 |
| `agent_settings` | 固定文档 `_id=default`；保存 `enabled`、`notificationTemplateId` |
| `agent_sources` | 来源 URL 列表或搜索关键词、平台、授权状态、质量门槛、启停状态和最近巡查结果 |
| `source_items` | 采集后的标题、摘要、封面 URL、字段和内容 hash |
| `activity_candidates` | 待审核候选、审核状态和发布活动 ID |
| `agent_runs` | 每次巡查的统计、通知结果和错误 |
| `events` | 审批后发布的活动 |
| `event_registrations` | 社区活动报名记录；以用户和活动的唯一记录防止重复报名 |
| `audit_logs` | 来源修改、巡查启停、审批、驳回记录 |
| `library_resources` | 资料目录、摘要、外部链接、发布状态和访问范围 |
| `library_saves` | 用户收藏的资料 ID和时间；不保存资料全文 |

权限建议：普通用户不能读写 `admins`、`agent_sources`、`source_items`、`activity_candidates`、`agent_runs`、`audit_logs`、`library_resources`；资料列表和收藏通过云函数返回，运营操作全部经过云函数重新鉴权。`member` 资料依赖 `users.status=active`，成员后端未完成前只发布 `public` 资料。

## 3. 管理员初始化

1. 先部署 `login` 云函数，并在云函数环境变量配置 `LINKGEN_OWNER_OPENID`；不要让公开小程序的首个访客自动成为 owner。
2. 使用指定管理员微信登录一次，确认 `admins` 中生成 `role: owner`、`status: active` 的文档；如果未配置环境变量，登录只返回“待初始化”，不会获得运营权限。
3. 在数据库中为其他运营人员添加 `admins` 文档，至少填写 `_id`、`role`、`status: active`、`agentNotify: true/false`。
4. 管理员在运营页填写来源 URL，显式选择授权状态（已授权 / 自有来源 / 已确认可用），点击“保存来源配置”，再启用来源；“待确认授权”来源不会被 Agent 访问。
5. 学习库前端当前暂缓接入；`library_resources`、`library_saves` 和相关云函数仅保留后续方案，不纳入当前小程序上线验收。

先运行 `node scripts/prepare-linkgen-seed.js` 生成 JSONL，再把 `db-import/library-resources.jsonl` 导入 `library_resources`；导入后仍需由管理员核对链接和更新时间。

来源初始名单可参考 [agent-sources.json](../db-import/agent-sources.json)。生成 `agent-sources.jsonl` 后导入 `agent_sources`；文件只预置公众号和小红书观察池名称，不预置未经授权的抓取 URL，管理员必须填入已授权的 RSS、合作 Feed、公开文章入口或主动提交链接后再启用。

来源 URL 必须是已经获得使用许可的公开页面或官方/合作连接器入口。不能填写需要登录、验证码或绕过平台限制的 URL。用户在活动创建页粘贴公众号/小红书链接时，由 `parseActivityLink` 服务端解析公开元数据；解析失败时应提示人工填写，不把本地演示草稿当成真实结果。

关键词搜索来源使用云函数环境变量 `BING_SEARCH_KEY`，可选配置 `BING_SEARCH_ENDPOINT`；搜索来源必须设置为已授权状态，并建议填写 `allowedDomains` 限制结果域名。未配置密钥时只记录 `search_not_configured`，不会产生候选。

## 4. 微信通知

1. 在小程序后台申请活动审核提醒订阅消息模板。
2. 把模板 ID 配置为云函数环境变量 `AGENT_NOTIFY_TEMPLATE_ID`。
3. 同时把模板 ID 写入 `agent_settings/default.notificationTemplateId`，运营页的“订阅提醒”按钮会读取该值。
4. 管理员在小程序内主动订阅该模板；订阅成功后，运营页会自动写入当前管理员的 `admins.agentNotify: true`。不建议手工把未授权管理员设为 `true`。
5. 手动巡查验证 `agent_runs.notification.status`；没有模板或授权时，候选仍入库，但只显示“通知未配置”。

默认模板字段映射为 `thing1=首条活动标题`、`number2=候选数量`、`thing3=巡查任务编号`。如果微信后台模板字段名称不同，在 `agent_settings/default.notificationFields` 中写入 `title`、`count`、`task` 对应的字段 key。

订阅消息不是无限制群发能力。需要更强的内部通知时，可把 `notifyAdmins` 替换为企业微信机器人或独立运营后台通知。

## 5. 首次验收

部署前可运行：

```bash
node scripts/validate-linkgen-release.js
```

该脚本只检查仓库结构和静态配置，不代表 CloudBase 已部署或外部来源已授权。

```text
未登录管理员 --(打开运营页)--> 无权查看候选
管理员 --(打开运营页)--> CloudBase 实时数据
来源 URL 未配置 --(保存)--> 待配置 / 不参与巡查
已授权来源 --(每日触发或立即巡查)--> source_items + activity_candidates
候选 --(管理员通过)--> events + audit_logs
候选 --(管理员驳回)--> rejected + audit_logs
已发布活动 --(用户报名)--> event_registrations + events.attendees + 1
已报名用户 --(取消报名)--> event_registrations.status=cancelled + events.attendees - 1
高质量候选 --(管理员已订阅且配置模板)--> 微信订阅消息
```

验收重点：重复运行不能重复插入同一 `contentHash`；普通用户不能触发采集、查看候选或审批；网络临时失败最多重试 2 次；来源失败只记录到 `agent_runs.errors`，不能中断其他来源。

## 6. 当前明确限制

- HTML/JSON-LD/Meta 解析只适合公开且结构稳定的页面。
- 公众号“账号持续监控”和小红书“重点观察池”必须接官方开放能力、授权连接器、合作方 feed 或管理员主动提交的链接；不能靠小程序前端定时访问平台。
- `coverImageUrl` 当前用于候选预览；正式发布前应将有权使用的图片转存 Cloud Storage，并记录来源和删除入口。
- 主体、域名、业务域名、隐私政策和内容审核规则完成后，再将这条链路用于公开运营。
- 活动页通过 `listPublishedEvents` / `getPublishedEvent` 读取云端已发布数据；CloudBase 未部署时才回退到本地演示数据。
- 社区活动报名通过 `registerForEvent` 服务端事务处理；社区外精选只保留“加入日程”和外部报名链接，不计入社区名额。
- `libraryMaintenance` 每周将 90 天未更新的公开资料标记为 `needs_recheck`，复核后管理员可重新发布。
- 审核卡片可直接补充 Cloud Storage 活动封面；发布后保留来源链接、图片来源和删除入口。
