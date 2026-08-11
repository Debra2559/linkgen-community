# activityAgent 云函数

该函数是 LinkGen 活动采集 Agent 的服务端入口，默认由 CloudBase timer trigger 每天 `09:00`（北京时间）运行。用户主动粘贴链接的解析由同目录外的 `parseActivityLink` 云函数负责。

## 作用

- 从 `agent_sources` 读取已启用来源；每个来源可配置多个已授权 URL，按 URL 逐个巡查。
- `kind=feed` 来源支持已授权 RSS / Atom / 合作 Feed，先读取条目链接，再逐条巡查。
- `kind=search` 的来源可通过 Bing Web Search API 按关键词发现页面，再回到原始页面解析；可用 `allowedDomains` 限制域名。
- 仅访问公开 HTTP/HTTPS 白名单来源，阻止本机和内网地址。
- 优先提取 JSON-LD Event，其次读取 `og:title`、`og:description`、`og:image` 和页面标题。
- 将内容分类为 `activity` 或 `share`。
- 计算质量分，写入 `source_items` 和 `activity_candidates`。
- 返回并保存标题、摘要、封面、原文链接、报名入口、时间、地点、字段证据、风险标记和活动归属。
- 已配置 `AGENT_NOTIFY_TEMPLATE_ID` 时，向 `admins.agentNotify === true` 的管理员发送订阅消息。
- 管理员在运营页完成订阅后，`manageActivityAgent` 会把通知偏好写入 `admins.agentNotify`。
- 所有异常写入 `agent_runs`，不因单个来源失败而中断整批任务。

## 数据集合

| 集合 | 作用 |
| --- | --- |
| `agent_sources` | 来源 URL、平台、授权状态、质量门槛、启用状态 |
| `source_items` | 最近一次解析结果和内容 hash |
| `activity_candidates` | 待审核活动候选 |
| `agent_runs` | 每次巡查的统计、错误和通知结果 |
| `admins` | 管理员 openid；需额外维护 `agentNotify` 和通知授权状态 |

## 来源授权

`authorizationStatus` 只能是 `owned`、`authorized`、`public_link` 时才会访问。公众号和小红书没有授权时，函数会记录 `authorization_required` 并跳过，不绕过登录、验证码或平台限制。

## 部署前配置

1. 创建并配置上述数据库集合和管理员权限。
2. 在小程序内让管理员主动订阅通知模板。
3. 设置云函数环境变量 `AGENT_NOTIFY_TEMPLATE_ID`。
4. 如果模板字段不是 `thing1`、`number2`、`thing3`，同步修改 `notifyAdmins` 的字段映射。
5. 先只启用一个已授权来源，使用运营页“立即巡查”验证解析结果和候选质量，再启用全部来源与定时触发器。

关键词搜索还需要设置云函数环境变量 `BING_SEARCH_KEY`；没有密钥时搜索来源会跳过，页面和运行日志会明确显示未配置。

该函数不会自动把候选写入已发布 `events`；审批由 `approveActivityCandidate` 云函数完成，并重新校验管理员身份。
