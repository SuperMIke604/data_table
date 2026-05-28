# data_table 项目记忆

## 项目概况
- SillyTavern 第三方扩展插件 `dataManage`，8061 行单文件架构 (`index.js`)
- 核心功能：AI 对话中结构化 JSON 数据的管理和可视化
- 数据格式：`{ mate: { type: "chatSheets" }, sheet_1: { name, content: [[headers...], [row...]] } }`
- 持久化：`TavernDB_ACU_Data` 字段挂在聊天消息对象上

## 关键架构决策
- **2026-05-28**: 数据提取/解析从 `<tableEdit>` 函数调用语法 + `` ```json `` 代码块正则，统一改为 `<dataUpdate>` XML 标签 + 纯 JSON
  - 新增 `extractDataFromMessage(msg, options)` 统一提取函数，替换 8 处重复代码
  - 新增 `parseDataUpdate(aiResponse)` 替换 `parseAndApplyTableEdits()`
  - 新增 `applyOperations(operations)` 处理增量操作
  - 增量格式：`{ operations: [{ action: "insert"|"update"|"delete", sheet, row, data }] }`
  - 完整替换格式：`{ mate, sheet_1, ... }` 直接覆盖
  - 不保留向后兼容，`<tableEdit>` 和 `` ```json `` 全部移除

## 代码结构速查
| 行号(2026-05-28后) | 模块 |
|---|---|
| 1-172 | 扩展配置 |
| 173-872 | 配置管理+Prompt预设 |
| 873-998 | 主功能 wand menu |
| 999-4648 | 独立窗口+弹窗UI |
| 4549-4867 | 数据核心(extractDataFromMessage/parseDataUpdate/applyOperations) |
| 4868+ | findPreviousDbMessage/数据预览/模板加载/AI调用/初始化/世界书注入 |
