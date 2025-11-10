# 数据管理扩展

一个 SillyTavern 扩展，用于在 wand menu 中添加"数据管理"按钮。

## 功能

- 在 SillyTavern 的 wand menu（扩展菜单）中添加"数据管理"按钮
- 点击按钮时显示提示（功能待实现）

## 安装

1. 将扩展文件夹复制到 SillyTavern 的扩展目录：
   - 所有用户：`public/scripts/extensions/third-party/`
   - 当前用户：`data/<user-handle>/extensions/`

2. 在 SillyTavern 中刷新页面或重启应用

3. 在 wand menu 中应该能看到"数据管理"按钮

## 文件结构

```
data_table/
├── manifest.json    # 扩展清单文件
├── index.js         # 主 JavaScript 文件
└── README.md        # 说明文档
```

## 开发

这是一个基础扩展，目前只实现了按钮的添加。后续可以在此基础上添加数据管理的具体功能。

## 许可证

待定

