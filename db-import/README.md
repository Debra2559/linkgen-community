# LinkGen CloudBase 种子数据

## 生成导入文件

在项目根目录运行：

```bash
node scripts/prepare-linkgen-seed.js
```

脚本生成：

| 文件 | 集合 | 说明 |
| --- | --- | --- |
| `agent-sources.jsonl` | `agent_sources` | 公众号、小红书观察池和搜索入口；默认关闭、待确认授权 |
| `library-resources.jsonl` | `library_resources` | 学习库公开资料种子；发布前需管理员复核链接 |

不要把管理员 openid、微信模板 ID、来源授权凭证、Bing key 或真实成员数据写入这些文件。管理员来源 URL 应在运营页填写，并显式选择授权状态后再启用。
