# PR-09：每日活动采集 Agent 验收契约

## 核对结论

负责人最新 `main` 已经包含每日活动采集 Agent 的云函数和定时触发配置。本 PR 不重复改采集逻辑，而是补充可重复执行的契约检查和部署前验收清单。

## 当前覆盖能力

- CloudBase timer 每天 09:00（北京时间）触发 `activityAgent`。
- 从 `agent_sources` 读取已启用来源，支持授权 URL、RSS/Atom/Feed 和关键词搜索。
- 仅访问公开 HTTP/HTTPS 来源，并阻止本机或内网地址。
- 提取活动标题、摘要、封面、时间、地点、报名入口和字段证据。
- 通过质量分、未来时间和内容分类筛选候选。
- 用内容 hash / 活动 fingerprint 去重，写入 `source_items` 和 `activity_candidates`，并记录 `agent_runs`。
- 候选先进入人工审核，不会自动写入已发布活动。
- 可选向已订阅的管理员发送通知。

## 验收清单

1. 定时触发器配置为每天 09:00，且云函数能启动巡查。
2. 未授权来源被跳过，并留下明确的授权状态或错误记录。
3. 合法公开来源可以生成候选，缺少关键字段的内容不会直接发布。
4. 重复运行不会重复创建同一活动候选。
5. 单个来源失败不会中断整批巡查，`agent_runs` 能记录错误和最终状态。
6. 候选进入运营审核页，只有管理员通过后才进入正式活动数据。
7. 配置通知模板和管理员订阅后，通知结果可在巡查记录中看到；未配置时不误报已发送。

## 部署前置条件（负责人处理）

- 创建 `agent_sources`、`source_items`、`activity_candidates`、`agent_runs`、`admins` 等集合并配置权限。
- 配置至少一个获得授权的公开来源 URL；不要把需要绕过登录或验证码的来源加入生产任务。
- 如启用关键词搜索，配置 `BING_SEARCH_KEY`。
- 如启用微信通知，配置 `AGENT_NOTIFY_TEMPLATE_ID`、字段映射和管理员订阅授权。
- 在测试 CloudBase 环境先跑一次手动巡查，再开启定时触发器。

## 本地验证

```text
node scripts/validate-activity-agent.js
node scripts/validate-linkgen-release.js
node --check cloudfunctions/activityAgent/index.js
git diff --check
```

## 范围边界

本 PR 只固化 Agent 现有实现的验收标准，不代表生产环境已经部署，也不代表小红书或公众号可以绕过平台登录、授权或反爬限制。
