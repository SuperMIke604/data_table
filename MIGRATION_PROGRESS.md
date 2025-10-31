# 迁移进度记录

## ✅ 已完成的工作

### 第一阶段：基础框架和常量（已完成）
- [x] 扩展初始化逻辑
- [x] API 加载和验证函数
- [x] 核心常量定义（所有前缀、存储键等）
- [x] 默认常量和模板
  - [x] `DEFAULT_CHAR_CARD_PROMPT_ACU`
  - [x] `DEFAULT_TABLE_TEMPLATE_ACU`（简化版，完整版需要从原始脚本复制）
  - [x] `DEFAULT_AUTO_UPDATE_FREQUENCY_ACU`
  - [x] `DEFAULT_AUTO_UPDATE_TOKEN_THRESHOLD_ACU`
- [x] 数据状态变量
- [x] UI jQuery 对象占位符（所有 UI 元素引用）
- [x] 全局设置对象 `settings_ACU`
- [x] 回调函数管理器（`tableUpdateCallbacks_ACU`, `tableFillStartCallbacks_ACU`）

### 第二阶段：工具函数（已完成）
- [x] 日志函数（`logDebug_ACU`, `logError_ACU`, `logWarn_ACU`）
- [x] `showToastr_ACU` 函数
- [x] `escapeHtml_ACU` 函数
- [x] `cleanChatName_ACU` 函数
- [x] `deepMerge_ACU` 函数（用于设置合并）
- [x] `removeTaggedContent_ACU` 函数

### 第三阶段：设置管理（已完成）
- [x] `saveSettings_ACU` 函数
- [x] `loadTemplateFromStorage_ACU` 函数
- [x] `loadSettings_ACU` 函数
- [x] 设置加载已集成到初始化流程

### 第四阶段：API 系统（已完成）
- [x] `attemptToLoadCoreApis_ACU` 函数
- [x] `AutoCardUpdaterAPI` 全局对象
  - [x] `exportTableAsJson`
  - [x] `importTableAsJson`（占位符）
  - [x] `triggerUpdate`（占位符）
  - [x] `registerTableUpdateCallback`
  - [x] `unregisterTableUpdateCallback`
  - [x] `registerTableFillStartCallback`
  - [x] `_notifyTableUpdate`（内部）
  - [x] `_notifyTableFillStart`（内部）

### 第五阶段：UI 基础（已完成）
- [x] 菜单项添加函数 `addAutoCardMenuItem_ACU`
- [x] 弹出窗口占位符 `openAutoCardPopup_ACU`（待实现完整逻辑）

## 🔄 进行中的工作

### 第六阶段：表格数据管理（待实现）
- [ ] `loadAllChatMessages_ACU` - 加载所有聊天消息
- [ ] `loadOrCreateJsonTableFromChatHistory_ACU` - 从聊天历史加载或创建表格
- [ ] `initializeJsonTableInChatHistory_ACU` - 初始化表格数据
- [ ] `saveJsonTableToChatHistory_ACU` - 保存表格数据到聊天历史
- [ ] `formatJsonToReadable_ACU` - 格式化表格为可读格式

### 第七阶段：表格操作（待实现）
- [ ] `parseAndApplyTableEdits_ACU` - 解析并应用表格编辑指令
- [ ] `executeTableOperations_ACU` - 执行表格操作（insertRow, updateRow, deleteRow）
- [ ] `parseTableEditInstructions_ACU` - 解析 `<tableEdit>` 标签中的指令

### 第八阶段：AI 调用（待实现）
- [ ] `callCustomOpenAI_ACU` - 调用自定义 API
- [ ] `prepareAIInput_ACU` - 准备 AI 输入内容
- [ ] `proceedWithCardUpdate_ACU` - 执行数据库更新流程

### 第九阶段：世界书同步（待实现）
- [ ] `updateReadableLorebookEntry_ACU` - 更新可读世界书条目
- [ ] `updateImportantPersonsRelatedEntries_ACU` - 更新重要人物条目
- [ ] `updateSummaryTableEntries_ACU` - 更新总结表条目
- [ ] `updateOutlineTableEntry_ACU` - 更新故事主线条目
- [ ] `getInjectionTargetLorebook_ACU` - 获取注入目标世界书
- [ ] `deleteAllGeneratedEntries_ACU` - 删除所有生成的条目

### 第十阶段：自动更新（待实现）
- [ ] `handleNewMessageDebounced_ACU` - 处理新消息（防抖）
- [ ] `triggerAutomaticUpdateIfNeeded_ACU` - 触发自动更新
- [ ] `resetScriptStateForNewChat_ACU` - 重置脚本状态（新聊天）
- [ ] `processUpdates_ACU` - 处理批量更新

### 第十一阶段：UI 完整实现（待实现）
- [ ] 完整的 `openAutoCardPopup_ACU` 实现
  - [ ] 弹出窗口 HTML 结构
  - [ ] UI 元素绑定
  - [ ] 事件监听器设置
  - [ ] 标签页切换逻辑
- [ ] `renderPromptSegments_ACU` - 渲染提示词段落
- [ ] `getCharCardPromptFromUI_ACU` - 从 UI 获取提示词
- [ ] API 配置 UI 函数
  - [ ] `saveApiConfig_ACU`
  - [ ] `fetchModelsAndConnect_ACU`
  - [ ] `updateApiStatusDisplay_ACU`
- [ ] 提示词管理 UI 函数
  - [ ] `saveCustomCharCardPrompt_ACU`
  - [ ] `resetDefaultCharCardPrompt_ACU`
  - [ ] `loadCharCardPromptFromJson_ACU`
- [ ] 自动更新设置 UI 函数
  - [ ] `saveAutoUpdateFrequency_ACU`
  - [ ] `saveAutoUpdateTokenThreshold_ACU`
  - [ ] `saveUpdateBatchSize_ACU`
  - [ ] `saveRemoveTags_ACU`
- [ ] 数据管理 UI 函数
  - [ ] `displayAllData_ACU`
  - [ ] `showDataOverview_ACU`
  - [ ] `exportCurrentJsonData_ACU`
  - [ ] `importTableTemplate_ACU`
  - [ ] `exportTableTemplate_ACU`
  - [ ] `resetTableTemplate_ACU`
- [ ] 世界书管理 UI 函数
  - [ ] `populateWorldbookList_ACU`
  - [ ] `populateWorldbookEntryList_ACU`
  - [ ] `updateWorldbookSourceView_ACU`
  - [ ] `populateInjectionTargetSelector_ACU`

### 第十二阶段：辅助功能（待实现）
- [ ] `loadTavernApiProfiles_ACU` - 加载 Tavern API 预设
- [ ] `updateApiModeView_ACU` - 更新 API 模式视图
- [ ] `updateCustomApiInputsState_ACU` - 更新自定义 API 输入状态
- [ ] 手动更新函数
  - [ ] `handleManualUpdateCard_ACU`
  - [ ] `hideMessagesByFloorRange_ACU`
- [ ] 事件处理函数
  - [ ] 聊天变更事件处理
  - [ ] 消息生成结束事件处理
  - [ ] 消息删除/滑动事件处理

## 📝 下一步计划

### 立即优先级（核心功能）
1. **表格数据管理** - 实现表格数据的加载、保存、初始化
2. **表格操作** - 实现表格编辑指令的解析和执行
3. **AI 调用** - 实现 API 调用和更新流程

### 中等优先级（完整功能）
4. **世界书同步** - 实现数据到世界书的同步
5. **自动更新** - 实现自动触发更新逻辑

### 后续优先级（UI 完善）
6. **完整 UI 实现** - 实现所有 UI 功能和交互
7. **辅助功能** - 实现所有辅助和管理功能

## 📋 迁移检查清单

在完成每个阶段后，请测试以下内容：

### 基础功能测试
- [ ] 扩展能够加载并初始化
- [ ] 菜单项出现在扩展菜单中
- [ ] 设置能够正确保存和加载
- [ ] API 对象能够正确访问

### 核心功能测试（完成后）
- [ ] 表格数据能够加载和保存
- [ ] 表格编辑指令能够正确解析
- [ ] AI 调用功能正常
- [ ] 数据能够同步到世界书

### 完整功能测试（完成后）
- [ ] 自动更新能够正确触发
- [ ] 所有 UI 功能正常
- [ ] 手动更新功能正常
- [ ] 数据导入导出功能正常

## 💡 注意事项

1. **原始脚本位置**：所有待迁移的函数都在 `新建 文本文档.txt` 中
2. **函数命名**：保持原始函数名称不变（所有函数名都以 `_ACU` 结尾）
3. **变量作用域**：确保所有变量在正确的函数作用域内
4. **依赖关系**：注意函数之间的依赖关系，按顺序迁移
5. **错误处理**：保持原始脚本的错误处理逻辑

## 🔍 查找函数位置

使用以下命令在原始脚本中查找函数：

```bash
grep -n "function 函数名" "新建 文本文档.txt"
```

例如：
```bash
grep -n "function loadOrCreateJsonTableFromChatHistory_ACU" "新建 文本文档.txt"
```

