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

### 第六阶段：表格数据管理（已完成）
- [x] `loadAllChatMessages_ACU` - 加载所有聊天消息
- [x] `loadOrCreateJsonTableFromChatHistory_ACU` - 从聊天历史加载或创建表格
- [x] `initializeJsonTableInChatHistory_ACU` - 初始化表格数据
- [x] `saveJsonTableToChatHistory_ACU` - 保存表格数据到聊天历史
- [x] `formatJsonToReadable_ACU` - 格式化表格为可读格式
- [x] 聊天变更事件处理集成
- [x] 消息删除/滑动事件处理集成
- [x] `importTableAsJson` API 函数实现

### 第七阶段：表格操作（已完成）
- [x] `parseAndApplyTableEdits_ACU` - 解析并应用表格编辑指令
  - [x] AI响应清理和解析
  - [x] `<tableEdit>` 标签提取
  - [x] 多行指令重组
  - [x] JSON解析和容错处理
  - [x] `insertRow` 操作实现
  - [x] `updateRow` 操作实现
  - [x] `deleteRow` 操作实现

### 第八阶段：AI 调用（已完成）
- [x] `prepareAIInput_ACU` - 准备 AI 输入内容
  - [x] 格式化表格数据为可读文本
  - [x] 格式化消息内容
  - [x] 获取世界书内容（简化版）
- [x] `callCustomOpenAI_ACU` - 调用自定义 API
  - [x] 支持酒馆连接预设模式
  - [x] 支持使用主API模式
  - [x] 支持独立配置的API模式
  - [x] 提示词插值替换
  - [x] 请求中止支持
- [x] `proceedWithCardUpdate_ACU` - 执行数据库更新流程
  - [x] 状态更新显示
  - [x] 终止按钮支持
  - [x] 重试机制（最多3次）
  - [x] 错误处理和恢复

### 第九阶段：世界书同步（已完成）
- [x] `getInjectionTargetLorebook_ACU` - 获取注入目标世界书
- [x] `deleteAllGeneratedEntries_ACU` - 删除所有生成的世界书条目
- [x] `updateOutlineTableEntry_ACU` - 更新故事主线条目
- [x] `updateSummaryTableEntries_ACU` - 更新总结表条目
- [x] `updateImportantPersonsRelatedEntries_ACU` - 更新重要人物条目
- [x] `updateReadableLorebookEntry_ACU` - 更新可读世界书条目（主函数）

### 第十阶段：自动更新（已完成）
- [x] `processUpdates_ACU` - 处理批量更新（主入口）
- [x] `handleNewMessageDebounced_ACU` - 处理新消息（防抖）
- [x] `triggerAutomaticUpdateIfNeeded_ACU` - 触发自动更新
- [x] `resetScriptStateForNewChat_ACU` - 重置脚本状态（新聊天）
- [x] `hideMessagesByFloorRange_ACU` - 根据楼层范围隐藏消息
- [x] `triggerSlash_ACU` - 触发斜杠命令
- [x] 事件监听器集成（CHAT_CHANGED, GENERATION_ENDED）

### 第十一阶段：UI 完整实现（已完成）
- [x] 完整的 `openAutoCardPopup_ACU` 实现
  - [x] 弹出窗口 HTML 结构
  - [x] UI 元素绑定
  - [x] 事件监听器设置
  - [x] 标签页切换逻辑
- [x] `updateCardUpdateStatusDisplay_ACU` - 更新状态显示
- [x] `renderPromptSegments_ACU` - 渲染提示词段落
- [x] `getCharCardPromptFromUI_ACU` - 从 UI 获取提示词
- [x] API 配置 UI 函数
  - [x] `saveApiConfig_ACU`
  - [x] `clearApiConfig_ACU`
  - [x] `fetchModelsAndConnect_ACU`
  - [x] `updateApiStatusDisplay_ACU`
  - [x] `updateApiModeView_ACU`
  - [x] `updateCustomApiInputsState_ACU`
  - [x] `loadTavernApiProfiles_ACU`
- [x] 提示词管理 UI 函数
  - [x] `saveCustomCharCardPrompt_ACU`
  - [x] `resetDefaultCharCardPrompt_ACU`
  - [x] `loadCharCardPromptFromJson_ACU`
- [x] 自动更新设置 UI 函数
  - [x] `saveAutoUpdateFrequency_ACU`
  - [x] `saveAutoUpdateTokenThreshold_ACU`
  - [x] `saveUpdateBatchSize_ACU`
  - [x] `saveRemoveTags_ACU`
- [x] 数据管理 UI 函数
  - [x] `displayAllData_ACU`
  - [x] `showDataOverview_ACU`
  - [x] `exportCurrentJsonData_ACU`
  - [x] `importTableTemplate_ACU`
  - [x] `exportTableTemplate_ACU`
  - [x] `resetTableTemplate_ACU`
  - [x] `exportCombinedSettings_ACU`
  - [x] `importCombinedSettings_ACU`
  - [x] `exportDisplayData_ACU`
  - [x] `bindDataDisplayEvents_ACU`
  - [x] `bindOverviewEvents_ACU`
  - [x] `bindDetailsEvents_ACU`
  - [x] `editTable_ACU`
  - [x] `deleteTable_ACU`
  - [x] `editRow_ACU`
  - [x] `deleteRow_ACU`
  - [x] `toggleMessageDetails_ACU`
  - [x] `loadMessageDetails_ACU`
  - [x] `deleteMessageData_ACU`
  - [x] `saveRowInDetails`
  - [x] `deleteRowInDetails`
  - [x] `deleteTableInDetails`
  - [x] `showEditModal_ACU`（临时实现）
  - [x] `optimizeForMobile`
  - [x] `addExpandDetailsStyles`
- [x] 世界书管理 UI 函数
  - [x] `populateWorldbookList_ACU`
  - [x] `populateWorldbookEntryList_ACU`
  - [x] `updateWorldbookSourceView_ACU`
  - [x] `populateInjectionTargetSelector_ACU`

### 第十二阶段：手动更新功能（已完成）
- [x] `handleManualUpdateCard_ACU` - 手动更新函数
- [x] 事件处理函数
  - [x] 聊天变更事件处理
  - [x] 消息生成结束事件处理
  - [x] 消息删除/滑动事件处理

## 📝 下一步计划

### 🎉 所有核心阶段已完成！

所有核心功能已成功迁移：
1. ✅ **表格数据管理** - 已实现表格数据的加载、保存、初始化
2. ✅ **表格操作** - 已实现表格编辑指令的解析和执行
3. ✅ **AI 调用** - 已实现 API 调用和更新流程
4. ✅ **世界书同步** - 已实现数据到世界书的同步
5. ✅ **自动更新** - 已实现自动触发更新逻辑
6. ✅ **完整 UI 实现** - 已实现所有 UI 功能和交互
7. ✅ **辅助功能** - 已实现所有辅助和管理功能

### 当前阶段：测试与优化
- 在 SillyTavern 环境中测试扩展
- 修复运行时的错误
- 优化性能和用户体验

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

