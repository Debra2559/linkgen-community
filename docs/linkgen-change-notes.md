# LinkGen 变更记录

> 本表记录本分支相对当前仓库的每项有意差异。旧代码未删除，主线不受影响。

| 原行为 | 本分支行为 | 原因 | 涉及文件 | 风险/回退 |
| --- | --- | --- | --- | --- |
| 发现页只有普通帖子 | 发现页增加讨论/任务筛选和任务卡片 | 让活动协作可被检索 | `pages/feed/*` | 删除任务字段即可回退，旧帖子仍可读 |
| 帖子没有类型 | 旧帖子归为 `discussion`，新内容可为 `task` | 保持兼容，不强转历史内容 | `utils/linkgen-data.js` | 字段缺省时自动归 discussion |
| 发布入口只发讨论 | 可选择讨论或活动任务 | 走通核心产品闭环 | `pages/create-post/*` | 仍可只使用讨论模式 |
| 没有任务参与关系 | 增加感兴趣、加入、人数和状态 | 明确协作进度 | `utils/community-data.js`、`pages/post-detail/*` | 本地 Storage 可清空恢复样例 |
| 页面直接读写 Storage | 通过统一 community data service | 未来可换 CloudBase | `utils/community-data.js` | adapter 替换，不改页面协议 |
| 仓库存在菜单/订单旧页面 | 本次保留且标注为非当前功能 | 避免删除负责人历史代码 | 文档 | 不影响当前 `app.json` 注册页面 |

## 当前不做

真实 CloudBase、微信订阅消息、群消息抓取、外部活动自动发现、支付/订单/积分、复杂审批和生产环境资源创建。
