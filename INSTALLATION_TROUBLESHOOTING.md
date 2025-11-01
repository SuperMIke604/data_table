# SillyTavern 扩展安装与故障排查

## 扩展已完成的迁移

✅ 所有 11 个阶段的功能已 100% 完成迁移：
- 基础框架和常量
- 工具函数
- 设置管理
- API 系统
- 主初始化
- 表格数据管理
- 表格操作
- AI 调用
- 世界书同步
- 自动更新
- UI 完整实现

**总代码量**: ~4800 行  
**总函数数**: 83+ 个  
**完成度**: 100%

## 安装位置

扩展应放置在：
```
SillyTavern/scripts/extensions/data_table/
```

包含以下文件：
- `manifest.json` - 扩展清单
- `index.js` - 主扩展脚本
- `style.css` - 样式文件
- `README.md` - 说明文档

## 故障排查

### 问题：SillyTavern 找不到扩展入口

**可能原因与解决方案**：

1. **检查文件路径**
   - 确认扩展文件夹在 `scripts/extensions/` 目录下
   - 确认 `manifest.json` 和 `index.js` 文件存在

2. **检查 manifest.json**
   - 确保 `"main": "index.js"` 字段正确
   - 确保 JSON 格式正确（无语法错误）

3. **检查 SillyTavern 版本**
   - 确保版本 >= 1.10.0

4. **查看浏览器控制台**
   - 打开浏览器开发者工具（F12）
   - 查看 Console 标签是否有错误信息
   - 查找 `[数据库自动更新器]` 相关的日志

5. **检查扩展加载**
   - 应该能看到这些日志：
     ```
     [数据库自动更新器] 扩展脚本已加载，等待初始化...
     [数据库自动更新器] 开始初始化...
     [数据库自动更新器] mainInitialize_ACU 被调用
     ```

6. **重新加载页面**
   - 保存所有文件
   - 完全刷新 SillyTavern 页面（Ctrl+F5）
   - 或重启 SillyTavern

7. **检查扩展菜单**
   - 打开 SillyTavern 的扩展菜单
   - 应该能看到"数据库更新"菜单项

### 日志调试

扩展使用以下日志前缀：
- `[数据库自动更新器]` - 基础日志
- 调试模式：`DEBUG_MODE_ACU = true`

### 常见错误

1. **API 未就绪**
   - 错误：`SillyTavern API 未就绪，延迟初始化...`
   - 原因：SillyTavern 加载未完成
   - 解决：扩展会自动重试，请等待

2. **jQuery 未找到**
   - 错误：`Cannot find parent document or jQuery for ACU menu`
   - 原因：jQuery 库未加载
   - 解决：检查 SillyTavern 是否正常加载

3. **扩展菜单未找到**
   - 错误：扩展菜单自动重试添加
   - 原因：DOM 元素还未准备好
   - 解决：扩展会自动处理

### 手动测试

在浏览器控制台运行以下命令检查扩展是否加载：

```javascript
// 检查全局 API
console.log(window.AutoCardUpdaterAPI);

// 检查扩展是否初始化
console.log('[数据库自动更新器]');
```

### 联系方式

如遇问题，请提供：
1. SillyTavern 版本
2. 浏览器类型和版本
3. 控制台完整错误信息
4. 扩展文件路径

## 下一步

扩展已完成，现在需要：
1. 在 SillyTavern 中测试功能
2. 根据实际情况调整配置
3. 报告任何运行时错误

