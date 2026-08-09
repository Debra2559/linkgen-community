# LinkGen 活动采集架构

## 当前原型

- 活动创建页支持识别微信公众号、小红书链接，并生成可编辑草稿。
- 运营管理页支持手动运行 Agent 演示任务。
- 链接导入和 Agent 候选统一进入 `待审核`，不会直接发布。
- 当前数据写入本地 Storage；演示候选使用 `discoveryMode: agent`，链接导入使用 `discoveryMode: link`。

## 生产数据流

```text
小程序 --POST /api/v1/activity-imports/parse--> 解析服务
解析服务 --返回结构化草稿--> 小程序
小程序 --用户确认--> POST /api/v1/activity-candidates
定时任务 --搜索白名单来源--> 去重/风险检测/结构化--> activity-candidates
运营后台 --审核--> POST /api/v1/activity-candidates/:id/approve
```

## 接口建议

### 解析活动链接

`POST /api/v1/activity-imports/parse`

```json
{
  "url": "https://mp.weixin.qq.com/s/example"
}
```

```json
{
  "data": {
    "source_platform": "wechat",
    "source_url": "https://mp.weixin.qq.com/s/example",
    "title": "AI 产品交流会",
    "description": "活动简介",
    "time": "9月21日 20:00",
    "location": "腾讯会议",
    "type": "online",
    "expected_count": 100,
    "confidence": 0.92,
    "missing_fields": []
  }
}
```

解析服务必须返回 `missing_fields` 和 `confidence`，前端仍允许人工修改，不应直接发布。

### 创建候选活动

`POST /api/v1/activity-candidates`

保存 `source_url`、`source_platform`、`discovery_mode`、`content_hash`，使用 `content_hash` 做幂等去重。

### Agent 运行任务

`POST /api/v1/agent-runs`

```json
{
  "sources": ["wechat", "xiaohongshu"],
  "keywords": ["AI", "产品", "创作者"],
  "cities": ["上海", "深圳", "杭州"],
  "schedule": "0 9 * * *"
}
```

任务需要具备超时、重试、来源白名单、频率限制、重复活动检测和失败日志。公众号/小红书正文抓取放在服务端，并遵守平台规则、robots 和授权边界；小程序端不保存第三方密钥。
