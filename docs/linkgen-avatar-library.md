# LinkGen 头像库

## 来源

- 头像生成库：DiceBear
- 风格：Micah
- 本地资源：`assets/avatars/`
- 生成接口：`https://api.dicebear.com/9.x/notionists-neutral/png`

## 运行方式

- 默认头像随小程序包发布，不依赖线上图片域名。
- 用户可从头像库选择，或通过相册/相机上传头像。
- 上传头像使用 `wx.saveFile` 保存本地路径；后续接入云开发时，应迁移到云存储并保存 `fileID`。

## 许可注意

DiceBear 与具体头像风格的许可可能不同。正式公开运营前，保留来源说明并核对当前 DiceBear 及 Micah 的许可文本。
