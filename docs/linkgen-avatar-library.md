# LinkGen 头像库

## 来源

- 头像生成库：DiceBear
- 风格：Notionists（与现有头像资源一致）
- 本地资源：`assets/avatars/`
- 生成接口：`https://api.dicebear.com/9.x/notionists/png`

## 当前资源

- 共 20 张本地头像，包含默认头像、短发、长发和中性外观。
- 新增头像：Aria、可可、露露、Ryan、Vivi、乔乔、Iris、Yuki、沫沫、Kai、Tom、Jo。
- 头像通过固定 seed 生成并固化到小程序包内；用户选择后不依赖远程图片域名。

## 运行方式

- 默认头像已经固化到小程序包内，运行时不依赖线上图片域名；生成接口只用于补充头像资源。
- 用户可从头像库选择，或通过相册/相机上传头像。
- 上传头像使用 `wx.saveFile` 保存本地路径；后续接入云开发时，应迁移到云存储并保存 `fileID`。

## 许可注意

DiceBear 与具体头像风格的许可可能不同。正式公开运营前，保留来源说明并核对当前 DiceBear 及 Notionists 的许可文本。
