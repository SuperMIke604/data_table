# 从原始脚本迁移到 SillyTavern 扩展指南

由于原始脚本非常庞大（5324行），本指南将帮助您将完整功能迁移到 SillyTavern 扩展格式。

## 迁移步骤

### 1. 核心函数迁移

从 `新建 文本文档.txt` 中提取以下核心函数，并将其添加到 `index.js`：

#### 必需的核心函数列表：

1. **数据管理函数**
   - `loadSettings_ACU()` - 加载设置
   - `saveSettings_ACU()` - 保存设置
   - `loadOrCreateJsonTableFromChatHistory_ACU()` - 加载或创建表格数据
   - `saveJsonTableToChatHistory_ACU()` - 保存表格数据

2. **表格操作函数**
   - `parseAndApplyTableEdits_ACU()` - 解析并应用表格编辑指令
   - `executeTableOperations_ACU()` - 执行表格操作（insertRow, updateRow, deleteRow）
   - `formatJsonToReadable_ACU()` - 格式化表格数据为可读格式

3. **AI 调用函数**
   - `callCustomOpenAI_ACU()` - 调用自定义 API
   - `prepareAIInput_ACU()` - 准备 AI 输入内容
   - `proceedWithCardUpdate_ACU()` - 执行数据库更新流程

4. **世界书同步函数**
   - `updateReadableLorebookEntry_ACU()` - 更新可读世界书条目
   - `updateImportantPersonsRelatedEntries_ACU()` - 更新重要人物条目
   - `updateSummaryTableEntries_ACU()` - 更新总结表条目
   - `updateOutlineTableEntry_ACU()` - 更新故事主线条目
   - `getInjectionTargetLorebook_ACU()` - 获取注入目标世界书

5. **UI 管理函数**
   - `openAutoCardPopup_ACU()` - 打开弹出窗口（完整实现）
   - `renderPromptSegments_ACU()` - 渲染提示词段落
   - `displayAllData_ACU()` - 显示所有数据
   - `showDataOverview_ACU()` - 显示数据概览

6. **自动更新函数**
   - `handleNewMessageDebounced_ACU()` - 处理新消息（防抖）
   - `triggerAutomaticUpdateIfNeeded_ACU()` - 触发自动更新
   - `resetScriptStateForNewChat_ACU()` - 重置脚本状态

### 2. 常量定义迁移

将以下常量从原始脚本复制到 `index.js`：

```javascript
// 默认提示词
const DEFAULT_CHAR_CARD_PROMPT_ACU = [/* ... */];

// 默认表格模板
const DEFAULT_TABLE_TEMPLATE_ACU = `{/* ... */}`;

// 默认配置
const DEFAULT_AUTO_UPDATE_FREQUENCY_ACU = 1;
const DEFAULT_AUTO_UPDATE_TOKEN_THRESHOLD_ACU = 500;
```

### 3. 设置对象迁移

复制 `settings_ACU` 对象的默认值和结构：

```javascript
let settings_ACU = {
    apiConfig: { url: '', apiKey: '', model: '', useMainApi: true, max_tokens: 120000, temperature: 0.9 },
    apiMode: 'custom',
    tavernProfile: '',
    charCardPrompt: DEFAULT_CHAR_CARD_PROMPT_ACU,
    autoUpdateFrequency: DEFAULT_AUTO_UPDATE_FREQUENCY_ACU,
    autoUpdateTokenThreshold: DEFAULT_AUTO_UPDATE_TOKEN_THRESHOLD_ACU,
    updateBatchSize: 1,
    autoUpdateEnabled: true,
    removeTags: '',
    worldbookConfig: {
        source: 'character',
        manualSelection: [],
        enabledEntries: {},
        injectionTarget: 'character',
    },
};
```

### 4. UI 元素引用迁移

将所有 jQuery UI 元素引用添加到 `openAutoCardPopup_ACU()` 函数中：

```javascript
// 在弹出窗口创建后，添加这些引用
$customApiUrlInput_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-api-url`);
$customApiKeyInput_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-api-key`);
// ... 等等
```

### 5. 事件监听器迁移

在 `openAutoCardPopup_ACU()` 中，添加所有按钮和输入框的事件监听器：

```javascript
// 示例
$saveApiConfigButton_ACU.on('click', saveApiConfig_ACU);
$manualUpdateCardButton_ACU.on('click', handleManualUpdateCard_ACU);
// ... 等等
```

### 6. 弹出窗口 HTML 迁移

将原始脚本中的 `openAutoCardPopup_ACU()` 函数中的 `popupHtml` 变量内容完整复制到扩展版本。

## 快速迁移方法

如果您想快速完成迁移，可以：

1. **完整替换 index.js**：将原始脚本的所有代码复制到 `index.js`，然后：
   - 移除 Tampermonkey 头部注释
   - 确保所有函数都在 `(function() { 'use strict'; ... })();` 包装中
   - 移除 `$(function() { ... })` 包装，直接调用初始化函数

2. **修改初始化逻辑**：
   - 将 `mainInitialize_ACU()` 改为扩展格式的初始化
   - 确保在 DOM 就绪时调用

3. **测试功能**：
   - 在 SillyTavern 中加载扩展
   - 测试基本功能是否正常
   - 逐步测试各个功能模块

## 注意事项

1. **路径引用**：确保所有 API 引用都通过 `SillyTavern_API_ACU` 和 `TavernHelper_API_ACU` 访问
2. **存储键名**：保持 localStorage 键名不变，以确保设置迁移
3. **事件系统**：确保使用 SillyTavern 的事件系统（`eventSource.on`）
4. **弹窗系统**：使用 SillyTavern 的 `callGenericPopup` 方法创建弹窗

## 测试清单

迁移完成后，请测试以下功能：

- [ ] 扩展能够正确加载
- [ ] 菜单项出现在扩展菜单中
- [ ] 弹出窗口能够正常打开
- [ ] API 配置能够保存和加载
- [ ] 表格数据能够加载和保存
- [ ] AI 调用功能正常
- [ ] 表格编辑指令能够正确解析和执行
- [ ] 世界书同步功能正常
- [ ] 自动更新功能正常触发
- [ ] 手动更新功能正常
- [ ] 数据导入导出功能正常

## 需要帮助？

如果在迁移过程中遇到问题，请检查：

1. 浏览器控制台中的错误信息
2. SillyTavern 的扩展日志
3. 原始脚本的功能是否完整迁移

