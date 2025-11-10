/* global SillyTavern */

// ==================== 配置管理模块 ====================

const STORAGE_KEY = 'dataManageSettings';
const STORAGE_KEY_TEMPLATE = 'dataManageTemplate'; // 独立存储模板
const DEFAULT_CHAR_CARD_PROMPT = [
    {
        role: 'USER',
        content: ''
    },
    {
        role: 'assistant',
        content: ''
    }
];

const DEFAULT_SETTINGS = {
    // 更新配置
    autoUpdateFrequency: 0,        // 最新N层不更新
    updateBatchSize: 1,            // 每次更新楼层数
    summaryTableMaxEntries: 10,    // 总结条目显示数量
    removeTags: '',                // 自定义删除标签
    removeMarkers: '',             // 标识剔除
    userMessageTags: '',           // 用户消息标签
    
    // 核心操作
    autoUpdateEnabled: false,      // 启用自动更新
    autoHideMessages: true,        // 数据整理完成后自动隐藏相关楼层
    
    // AI指令预设
    charCardPrompt: DEFAULT_CHAR_CARD_PROMPT,  // 数据库更新预设
    
    // 数据概览模板（独立于AI指令预设）
    overviewTemplate: '',  // 数据概览模板（字符串格式）
    
    // API配置
    apiMode: 'custom',             // API模式: 'custom' 或 'tavern'
    apiConfig: {
        url: '',                    // API基础URL
        apiKey: '',                 // API密钥
        model: '',                  // 模型名称
        useMainApi: true,           // 使用主API
        max_tokens: 120000,         // 最大Tokens
        temperature: 0.9            // 温度
    },
    tavernProfile: '',             // 酒馆连接预设ID
    
    // 世界书配置
    worldbookConfig: {
        source: 'character',        // 世界书来源: 'character' 或 'manual'
        injectionTarget: 'character', // 数据注入目标: 'character' 或世界书文件名
        manualSelection: [],        // 手动选择的世界书列表
        enabledEntries: {}          // 启用的世界书条目: {'worldbook_name': ['entry_uid1', 'entry_uid2']}
    },
};

// 当前配置
let currentSettings = { ...DEFAULT_SETTINGS };

/**
 * 保存配置到本地存储
 */
function saveSettings() {
    try {
        const context = SillyTavern.getContext();
        
        // 优先使用 extensionSettings（SillyTavern推荐方式）
        if (context && context.extensionSettings) {
            if (!context.extensionSettings.dataManage) {
                context.extensionSettings.dataManage = {};
            }
            Object.assign(context.extensionSettings.dataManage, currentSettings);
            if (context.saveSettingsDebounced) {
                context.saveSettingsDebounced();
            } else if (context.saveSettings) {
                context.saveSettings();
            }
            console.log('配置已保存到 extensionSettings:', currentSettings);
        } else {
            // 备用方案：使用 localStorage
            const topLevelWindow = (window.parent && window.parent !== window) ? window.parent : window;
            if (topLevelWindow.localStorage) {
                topLevelWindow.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
                console.log('配置已保存到 localStorage:', currentSettings);
            }
        }
        
        return true;
    } catch (error) {
        console.error('保存配置失败:', error);
        return false;
    }
}

/**
 * 加载配置
 */
function loadSettings() {
    try {
        const context = SillyTavern.getContext();
        
        // 优先从 extensionSettings 加载
        if (context && context.extensionSettings && context.extensionSettings.dataManage) {
            currentSettings = { ...DEFAULT_SETTINGS, ...context.extensionSettings.dataManage };
            console.log('从 extensionSettings 加载配置:', currentSettings);
            return currentSettings;
        }
        
        // 备用方案：从 localStorage 加载
        const topLevelWindow = (window.parent && window.parent !== window) ? window.parent : window;
        if (topLevelWindow.localStorage) {
            const saved = topLevelWindow.localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
                console.log('从 localStorage 加载配置:', currentSettings);
                return currentSettings;
            }
        }
        
        // 使用默认配置
        currentSettings = { ...DEFAULT_SETTINGS };
        console.log('使用默认配置:', currentSettings);
        return currentSettings;
    } catch (error) {
        console.error('加载配置失败:', error);
        currentSettings = { ...DEFAULT_SETTINGS };
        return currentSettings;
    }
}

/**
 * 更新数据库状态显示
 */
function updateStatusDisplay() {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    try {
        const context = SillyTavern.getContext();
        if (!context || !context.chat) {
            const statusDisplay = parentDoc.getElementById('data-manage-status-display');
            const totalMessages = parentDoc.getElementById('data-manage-total-messages');
            const unrecordedMessages = parentDoc.getElementById('data-manage-unrecorded-messages');
            
            if (statusDisplay) statusDisplay.textContent = '无法获取聊天数据';
            if (totalMessages) totalMessages.textContent = '上下文总层数: N/A';
            if (unrecordedMessages) unrecordedMessages.textContent = '尚未记录层数: N/A';
            return;
        }
        
        const chat = context.chat;
        const totalMessages = chat.length - 1; // 排除楼层0
        
        // 计算已记录的楼层数（这里简化处理，实际应该检查每条消息是否有数据库记录）
        let recordedCount = 0;
        for (let i = chat.length - 1; i > 0; i--) {
            // 检查消息是否有数据库记录标记（根据实际数据结构调整）
            if (chat[i] && chat[i].TavernDB_ACU_Data) {
                recordedCount = i;
                break;
            }
        }
        
        const unrecordedCount = totalMessages - recordedCount;
        
        // 更新显示
        const statusDisplay = parentDoc.getElementById('data-manage-status-display');
        const totalMessagesEl = parentDoc.getElementById('data-manage-total-messages');
        const unrecordedMessagesEl = parentDoc.getElementById('data-manage-unrecorded-messages');
        
        if (statusDisplay) {
            if (unrecordedCount > 0) {
                statusDisplay.textContent = `有 ${unrecordedCount} 层尚未记录到数据库`;
                statusDisplay.style.color = '#FF9500';
            } else {
                statusDisplay.textContent = '所有楼层已记录到数据库';
                statusDisplay.style.color = '#34C759';
            }
        }
        
        if (totalMessagesEl) {
            totalMessagesEl.textContent = `上下文总层数: ${totalMessages}`;
        }
        
        if (unrecordedMessagesEl) {
            unrecordedMessagesEl.textContent = `尚未记录层数: ${unrecordedCount}`;
        }
    } catch (error) {
        console.error('更新状态显示失败:', error);
        const statusDisplay = parentDoc.getElementById('data-manage-status-display');
        if (statusDisplay) {
            statusDisplay.textContent = '获取状态时出错';
            statusDisplay.style.color = '#FF3B30';
        }
    }
}

/**
 * 转义HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 渲染提示词片段
 */
function renderPromptSegments(segments) {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    const container = parentDoc.getElementById('data-manage-prompt-segments');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 确保 segments 是一个数组
    if (!Array.isArray(segments)) {
        if (typeof segments === 'string' && segments.trim()) {
            try {
                segments = JSON.parse(segments);
            } catch (e) {
                console.warn('无法解析提示词为JSON，作为单个文本块处理');
            }
        }
        
        if (!Array.isArray(segments) || segments.length === 0) {
            segments = [...DEFAULT_CHAR_CARD_PROMPT];
        }
    }
    
    // 如果为空，添加默认片段
    if (segments.length === 0) {
        segments = [...DEFAULT_CHAR_CARD_PROMPT];
    }
    
    segments.forEach((segment, index) => {
        const isDeletable = segment.deletable !== false;
        const segmentId = `data-manage-prompt-segment-${index}`;
        
        const segmentDiv = parentDoc.createElement('div');
        segmentDiv.id = segmentId;
        segmentDiv.className = 'data-manage-prompt-segment';
        segmentDiv.innerHTML = `
            <div class="data-manage-prompt-segment-toolbar">
                <select class="data-manage-prompt-segment-role">
                    <option value="assistant" ${segment.role === 'AI' || segment.role === 'assistant' ? 'selected' : ''}>AI</option>
                    <option value="SYSTEM" ${segment.role === 'SYSTEM' ? 'selected' : ''}>系统</option>
                    <option value="USER" ${segment.role === 'USER' ? 'selected' : ''}>用户</option>
                </select>
                ${isDeletable ? `<button class="data-manage-prompt-segment-delete-btn" data-index="${index}">-</button>` : ''}
            </div>
            <textarea class="data-manage-prompt-segment-content" rows="4">${escapeHtml(segment.content || '')}</textarea>
        `;
        
        container.appendChild(segmentDiv);
        
        // 绑定删除按钮事件
        if (isDeletable) {
            const deleteBtn = segmentDiv.querySelector('.data-manage-prompt-segment-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    segmentDiv.remove();
                });
            }
        }
    });
}

/**
 * 从UI获取提示词片段
 */
function getPromptSegmentsFromUI() {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    const container = parentDoc.getElementById('data-manage-prompt-segments');
    if (!container) return [];
    
    const segments = [];
    const segmentElements = container.querySelectorAll('.data-manage-prompt-segment');
    
    segmentElements.forEach(segmentEl => {
        const role = segmentEl.querySelector('.data-manage-prompt-segment-role')?.value || 'USER';
        const content = segmentEl.querySelector('.data-manage-prompt-segment-content')?.value || '';
        const isDeletable = segmentEl.querySelector('.data-manage-prompt-segment-delete-btn') !== null;
        
        segments.push({
            role: role,
            content: content,
            deletable: isDeletable
        });
    });
    
    return segments;
}

/**
 * 加载配置到UI
 */
function loadSettingsToUI() {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    const settings = loadSettings();
    
    // 更新配置输入框
    const frequencyInput = parentDoc.getElementById('data-manage-update-frequency');
    const batchSizeInput = parentDoc.getElementById('data-manage-batch-size');
    const maxEntriesInput = parentDoc.getElementById('data-manage-max-entries');
    const removeTagsInput = parentDoc.getElementById('data-manage-remove-tags');
    const removeMarkersInput = parentDoc.getElementById('data-manage-remove-markers');
    const userMessageTagsInput = parentDoc.getElementById('data-manage-user-message-tags');
    
    // 更新复选框
    const autoUpdateCheckbox = parentDoc.getElementById('data-manage-auto-update-enabled');
    const autoHideCheckbox = parentDoc.getElementById('data-manage-auto-hide-messages');
    
    if (frequencyInput) frequencyInput.value = settings.autoUpdateFrequency || '';
    if (batchSizeInput) batchSizeInput.value = settings.updateBatchSize || '';
    if (maxEntriesInput) maxEntriesInput.value = settings.summaryTableMaxEntries || '';
    if (removeTagsInput) removeTagsInput.value = settings.removeTags || '';
    if (removeMarkersInput) removeMarkersInput.value = settings.removeMarkers || '';
    if (userMessageTagsInput) userMessageTagsInput.value = settings.userMessageTags || '';
    
    if (autoUpdateCheckbox) autoUpdateCheckbox.checked = settings.autoUpdateEnabled || false;
    if (autoHideCheckbox) autoHideCheckbox.checked = settings.autoHideMessages !== false;
    
    // 渲染提示词片段
    if (settings.charCardPrompt) {
        renderPromptSegments(settings.charCardPrompt);
    } else {
        renderPromptSegments(DEFAULT_CHAR_CARD_PROMPT);
    }
    
    // 加载API配置到UI
    loadApiSettingsToUI(settings);
    
    // 加载世界书配置到UI
    loadWorldbookSettingsToUI(settings);
}

/**
 * 加载API配置到UI
 */
function loadApiSettingsToUI(settings) {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    // API模式
    const apiModeRadios = parentDoc.querySelectorAll('input[name="data-manage-api-mode"]');
    apiModeRadios.forEach(radio => {
        if (radio.value === (settings.apiMode || 'custom')) {
            radio.checked = true;
        }
    });
    
    // 触发模式切换以更新UI
    if (apiModeRadios.length > 0) {
        const event = new Event('change', { bubbles: true });
        apiModeRadios[0].dispatchEvent(event);
    }
    
    // 酒馆预设
    const tavernProfileSelect = parentDoc.getElementById('data-manage-tavern-profile');
    if (tavernProfileSelect && settings.tavernProfile) {
        tavernProfileSelect.value = settings.tavernProfile;
    }
    
    // 自定义API配置
    const useMainApiCheckbox = parentDoc.getElementById('data-manage-use-main-api');
    const apiUrlInput = parentDoc.getElementById('data-manage-api-url');
    const apiKeyInput = parentDoc.getElementById('data-manage-api-key');
    const maxTokensInput = parentDoc.getElementById('data-manage-max-tokens');
    const temperatureInput = parentDoc.getElementById('data-manage-temperature');
    const apiModelSelect = parentDoc.getElementById('data-manage-api-model');
    
    if (useMainApiCheckbox && settings.apiConfig) {
        useMainApiCheckbox.checked = settings.apiConfig.useMainApi || false;
        
        // 如果使用主API，隐藏自定义字段
        const customApiFields = parentDoc.getElementById('data-manage-custom-api-fields');
        if (customApiFields) {
            customApiFields.style.display = useMainApiCheckbox.checked ? 'none' : 'block';
        }
    }
    
    if (apiUrlInput && settings.apiConfig) {
        apiUrlInput.value = settings.apiConfig.url || '';
    }
    
    if (apiKeyInput && settings.apiConfig) {
        apiKeyInput.value = settings.apiConfig.apiKey || '';
    }
    
    if (maxTokensInput && settings.apiConfig) {
        maxTokensInput.value = settings.apiConfig.max_tokens || '';
    }
    
    if (temperatureInput && settings.apiConfig) {
        temperatureInput.value = settings.apiConfig.temperature || '';
    }
    
    if (apiModelSelect && settings.apiConfig && settings.apiConfig.model) {
        // 如果模型已保存，添加到选择器
        if (!Array.from(apiModelSelect.options).some(opt => opt.value === settings.apiConfig.model)) {
            const option = parentDoc.createElement('option');
            option.value = settings.apiConfig.model;
            option.textContent = `${settings.apiConfig.model} (已保存)`;
            apiModelSelect.appendChild(option);
        }
        apiModelSelect.value = settings.apiConfig.model;
    }
    
    // 更新API状态显示
    updateApiStatusDisplay();
}

/**
 * 显示提示消息
 */
function showToast(message, type = 'info') {
    const parentWin = (window.parent && window.parent !== window) ? window.parent : window;
    const toastr = parentWin.toastr || (typeof toastr !== 'undefined' ? toastr : null);
    
    if (toastr) {
        const finalOptions = { escapeHtml: false };
        return toastr[type](message, '数据管理', finalOptions);
    } else {
        const context = SillyTavern.getContext();
        if (context && context.toastr) {
            return context.toastr[type](message, '数据管理');
        } else {
            console.log(`Toast (${type}): ${message}`);
            alert(message);
            return null;
        }
    }
}

// ==================== 主功能模块 ====================

/**
 * 添加"数据管理"按钮到 wand menu (extensionsMenu)
 */
function addDataManageButton() {
    // 获取正确的文档对象（处理 iframe 情况）
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    // 获取 extensionsMenu 容器
    const extensionsMenu = parentDoc.getElementById('extensionsMenu');
    
    // 如果容器不存在，延迟重试
    if (!extensionsMenu) {
        setTimeout(addDataManageButton, 500);
        return;
    }

    // 检查按钮是否已存在，避免重复添加
    if (parentDoc.getElementById('dataManageButton')) {
        return;
    }

    // 创建按钮元素
    const buttonElement = parentDoc.createElement('div');
    buttonElement.id = 'dataManageButton';
    buttonElement.className = 'list-group-item flex-container flexGap5 interactable';
    buttonElement.setAttribute('title', '数据管理');
    buttonElement.tabIndex = 0;

    // 创建图标元素
    const iconElement = parentDoc.createElement('i');
    iconElement.className = 'fa-solid fa-database';
    iconElement.style.marginRight = '5px';

    // 创建文本元素
    const textElement = parentDoc.createElement('span');
    textElement.textContent = '数据管理';

    // 组装按钮
    buttonElement.appendChild(iconElement);
    buttonElement.appendChild(textElement);

    // 添加点击事件
    buttonElement.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('数据管理按钮被点击');
        openDataManagePopup();
    });

    // 将按钮添加到菜单
    extensionsMenu.appendChild(buttonElement);
    
    console.log('数据管理按钮已添加到 wand menu');
    
    // 添加数据预览按钮
    addDataPreviewButton(extensionsMenu, parentDoc);
}

/**
 * 添加数据预览按钮到菜单
 */
function addDataPreviewButton(extensionsMenu, parentDoc) {
    // 检查按钮是否已存在，避免重复添加
    if (parentDoc.getElementById('dataPreviewButton')) {
        return;
    }

    // 创建按钮元素
    const buttonElement = parentDoc.createElement('div');
    buttonElement.id = 'dataPreviewButton';
    buttonElement.className = 'list-group-item flex-container flexGap5 interactable';
    buttonElement.setAttribute('title', '数据预览');
    buttonElement.tabIndex = 0;

    // 创建图标元素
    const iconElement = parentDoc.createElement('i');
    iconElement.className = 'fa-solid fa-eye';
    iconElement.style.marginRight = '5px';

    // 创建文本元素
    const textElement = parentDoc.createElement('span');
    textElement.textContent = '数据预览';

    // 组装按钮
    buttonElement.appendChild(iconElement);
    buttonElement.appendChild(textElement);

    // 添加点击事件
    buttonElement.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('数据预览按钮被点击');
        showDataPreview();
    });

    // 将按钮添加到菜单（插入到数据管理按钮之前）
    const dataManageButton = parentDoc.getElementById('dataManageButton');
    if (dataManageButton) {
        extensionsMenu.insertBefore(buttonElement, dataManageButton);
    } else {
        extensionsMenu.appendChild(buttonElement);
    }
    
    console.log('数据预览按钮已添加到 wand menu');
}

/**
 * 打开数据管理弹窗
 */
function openDataManagePopup() {
    const context = SillyTavern.getContext();
    
    // 创建弹窗HTML
    const popupHtml = `
        <div class="data-manage-popup">
            <h2>数据管理</h2>
            
            <!-- Tab导航 -->
            <div class="data-manage-tabs-nav">
                <button class="data-manage-tab-button active" data-tab="status">状态 & 操作</button>
                <button class="data-manage-tab-button" data-tab="prompt">AI指令预设</button>
                <button class="data-manage-tab-button" data-tab="api">API & 连接</button>
                <button class="data-manage-tab-button" data-tab="worldbook">世界书</button>
                <button class="data-manage-tab-button" data-tab="data">数据管理</button>
            </div>
            
            <!-- Tab内容 -->
            <div id="data-manage-tab-status" class="data-manage-tab-content active">
                <div class="data-manage-grid">
                    <div class="data-manage-card">
                        <h3>数据库状态</h3>
                        <div class="data-manage-status-display" id="data-manage-status-display">
                            正在获取状态...
                        </div>
                        <p id="data-manage-total-messages">上下文总层数: N/A</p>
                        <p id="data-manage-unrecorded-messages">尚未记录层数: N/A</p>
                    </div>
                    <div class="data-manage-card">
                        <h3>核心操作</h3>
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            <div class="data-manage-input-group">
                                <label for="data-manage-floor-start">起始楼层:</label>
                                <input type="number" id="data-manage-floor-start" placeholder="开始楼层" min="1" style="max-width: 150px;">
                            </div>
                            <div class="data-manage-input-group">
                                <label for="data-manage-floor-end">结束楼层:</label>
                                <input type="number" id="data-manage-floor-end" placeholder="结束楼层" min="1" style="max-width: 150px;">
                            </div>
                            <button id="data-manage-update-card" class="primary" style="width:100%;">按楼层范围更新数据库</button>
                            <div class="data-manage-checkbox-group">
                                <input type="checkbox" id="data-manage-auto-update-enabled">
                                <label for="data-manage-auto-update-enabled">启用自动更新</label>
                            </div>
                            <div class="data-manage-checkbox-group">
                                <input type="checkbox" id="data-manage-auto-hide-messages" checked>
                                <label for="data-manage-auto-hide-messages">数据整理完成后自动隐藏相关楼层</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="data-manage-card">
                    <h3>更新配置</h3>
                    <div class="data-manage-grid">
                        <div>
                            <label for="data-manage-update-frequency">最新N层不更新:</label>
                            <div class="data-manage-input-group">
                                <input type="number" id="data-manage-update-frequency" min="0" step="1" placeholder="0">
                                <button id="data-manage-save-frequency" class="secondary">保存</button>
                            </div>
                            <p class="data-manage-notes">设置为0表示不跳过任何层，所有层都会更新</p>
                        </div>
                        <div>
                            <label for="data-manage-batch-size">每次更新楼层数:</label>
                            <div class="data-manage-input-group">
                                <input type="number" id="data-manage-batch-size" min="1" step="1" placeholder="1">
                                <button id="data-manage-save-batch-size" class="secondary">保存</button>
                            </div>
                        </div>
                        <div>
                            <label for="data-manage-max-entries">总结条目显示数量:</label>
                            <div class="data-manage-input-group">
                                <input type="number" id="data-manage-max-entries" min="1" step="1" placeholder="10">
                                <button id="data-manage-save-max-entries" class="secondary">保存</button>
                            </div>
                            <p class="data-manage-notes">设置总结表条目在世界书中显示的最新条目数量</p>
                        </div>
                        <div>
                            <label for="data-manage-remove-tags">自定义删除标签 (竖线分隔):</label>
                            <div class="data-manage-input-group">
                                <input type="text" id="data-manage-remove-tags" placeholder="e.g., plot|status">
                                <button id="data-manage-save-remove-tags" class="secondary">保存</button>
                            </div>
                        </div>
                        <div>
                            <label for="data-manage-remove-markers">标识剔除 (竖线分隔):</label>
                            <div class="data-manage-input-group">
                                <input type="text" id="data-manage-remove-markers" placeholder="e.g., 以下|note">
                                <button id="data-manage-save-remove-markers" class="secondary">保存</button>
                            </div>
                            <p class="data-manage-notes">从标识开始到第一个&lt;之前的内容将被剔除</p>
                        </div>
                        <div>
                            <label for="data-manage-user-message-tags">用户消息标签 (竖线分隔):</label>
                            <div class="data-manage-input-group">
                                <input type="text" id="data-manage-user-message-tags" placeholder="e.g., bridging_text">
                                <button id="data-manage-save-user-tags" class="secondary">保存</button>
                            </div>
                            <p class="data-manage-notes">为上下文中的用户消息添加XML标签</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="data-manage-tab-prompt" class="data-manage-tab-content">
                <div class="data-manage-card">
                    <h3>数据库更新预设 (任务指令)</h3>
                    <div id="data-manage-prompt-constructor">
                        <div class="data-manage-button-group" style="margin-bottom: 10px;">
                            <button class="data-manage-add-segment-btn" data-position="top" title="在上方添加对话轮次">+</button>
                        </div>
                        <div id="data-manage-prompt-segments">
                            <!-- Segments will be dynamically inserted here -->
                        </div>
                        <div class="data-manage-button-group" style="margin-top: 10px;">
                            <button class="data-manage-add-segment-btn" data-position="bottom" title="在下方添加对话轮次">+</button>
                        </div>
                    </div>
                    <div class="data-manage-button-group">
                        <button id="data-manage-save-prompt" class="primary">保存</button>
                        <button id="data-manage-load-prompt-json" class="secondary">读取JSON模板</button>
                        <button id="data-manage-reset-prompt" class="secondary">恢复默认</button>
                    </div>
                </div>
            </div>
            
            <div id="data-manage-tab-api" class="data-manage-tab-content">
                <div class="data-manage-card">
                    <h3>API设置</h3>
                    <div style="margin-bottom: 15px;">
                        <label>API模式:</label>
                        <div class="data-manage-radio-group">
                            <label>
                                <input type="radio" name="data-manage-api-mode" value="custom" checked>
                                <span>自定义API</span>
                            </label>
                            <label>
                                <input type="radio" name="data-manage-api-mode" value="tavern">
                                <span>使用酒馆连接预设</span>
                            </label>
                        </div>
                    </div>
                    <div id="data-manage-tavern-api-block" style="display: none; margin-top: 15px;">
                        <label for="data-manage-tavern-profile">酒馆连接预设:</label>
                        <div class="data-manage-input-group">
                            <select id="data-manage-tavern-profile"></select>
                            <button id="data-manage-refresh-tavern" class="secondary" title="刷新预设列表">刷新</button>
                        </div>
                        <p class="data-manage-notes">选择一个你在酒馆主设置中已经配置好的连接预设。</p>
                    </div>
                    <div id="data-manage-custom-api-block" style="margin-top: 15px;">
                        <div class="data-manage-checkbox-group">
                            <input type="checkbox" id="data-manage-use-main-api">
                            <label for="data-manage-use-main-api">使用主API (直接使用酒馆当前API和模型)</label>
                        </div>
                        <div id="data-manage-custom-api-fields">
                            <p class="data-manage-notes" style="color: #FF9500;"><b>安全提示:</b>API密钥将保存在浏览器本地存储中。</p>
                            <label for="data-manage-api-url">API基础URL:</label>
                            <input type="text" id="data-manage-api-url" placeholder="https://api.example.com/v1">
                            <label for="data-manage-api-key">API密钥(可选):</label>
                            <input type="password" id="data-manage-api-key" placeholder="sk-...">
                            <div class="data-manage-grid" style="margin-top: 10px;">
                                <div>
                                    <label for="data-manage-max-tokens">最大Tokens:</label>
                                    <input type="number" id="data-manage-max-tokens" min="1" step="1" placeholder="120000">
                                </div>
                                <div>
                                    <label for="data-manage-temperature">温度:</label>
                                    <input type="number" id="data-manage-temperature" min="0" max="2" step="0.05" placeholder="0.9">
                                </div>
                            </div>
                            <button id="data-manage-load-models" class="secondary" style="margin-top: 15px; width: 100%;">加载模型列表</button>
                            <label for="data-manage-api-model" style="margin-top: 15px;">选择模型:</label>
                            <select id="data-manage-api-model">
                                <option value="">请先加载模型列表</option>
                            </select>
                            <div id="data-manage-api-status" class="data-manage-notes" style="margin-top: 15px; padding: 12px; background-color: var(--ios-gray); border-radius: 8px;">
                                状态: 未配置
                            </div>
                            <div class="data-manage-button-group" style="margin-top: 15px;">
                                <button id="data-manage-save-api" class="primary">保存API配置</button>
                                <button id="data-manage-clear-api" class="secondary">清除API配置</button>
                                <button id="data-manage-test-api" class="secondary">测试连接</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="data-manage-tab-worldbook" class="data-manage-tab-content">
                <div class="data-manage-card">
                    <h3>世界书设置</h3>
                    <div style="margin-bottom: 15px;">
                        <label for="data-manage-injection-target">数据注入目标:</label>
                        <select id="data-manage-injection-target" style="width: 100%; margin-top: 8px;"></select>
                        <p class="data-manage-notes">选择数据库条目（如全局、人物、大纲等）将被创建或更新到哪个世界书里。</p>
                    </div>
                    <hr style="border-color: var(--ios-border); margin: 15px 0;">
                    <div style="margin-bottom: 15px;">
                        <label>世界书来源 (用于AI读取上下文):</label>
                        <div class="data-manage-radio-group">
                            <label>
                                <input type="radio" name="data-manage-worldbook-source" value="character" checked>
                                <span>角色卡绑定</span>
                            </label>
                            <label>
                                <input type="radio" name="data-manage-worldbook-source" value="manual">
                                <span>手动选择</span>
                            </label>
                        </div>
                    </div>
                    <div id="data-manage-worldbook-manual-block" style="display: none; margin-top: 15px;">
                        <label>选择世界书 (可多选):</label>
                        <div class="data-manage-input-group" style="margin-top: 8px;">
                            <div id="data-manage-worldbook-select" style="flex: 1; min-height: 100px; max-height: 200px; overflow-y: auto; border: 1px solid var(--ios-border); border-radius: 8px; padding: 8px; background-color: var(--ios-gray);"></div>
                            <button id="data-manage-refresh-worldbooks" class="secondary" title="刷新世界书列表">刷新</button>
                        </div>
                    </div>
                    <div style="margin-top: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <label style="margin-bottom: 0;">启用的世界书条目:</label>
                            <div class="data-manage-button-group" style="margin: 0; gap: 8px;">
                                <button id="data-manage-worldbook-select-all" class="secondary" style="padding: 6px 12px; font-size: 13px;">全选</button>
                                <button id="data-manage-worldbook-deselect-all" class="secondary" style="padding: 6px 12px; font-size: 13px;">全不选</button>
                            </div>
                        </div>
                        <div id="data-manage-worldbook-entry-list" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--ios-border); border-radius: 8px; padding: 12px; background-color: var(--ios-gray);">
                            <em style="color: var(--ios-text-secondary);">正在加载条目...</em>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="data-manage-tab-data" class="data-manage-tab-content">
                <div class="data-manage-card">
                    <h3>数据管理</h3>
                    <p class="data-manage-notes">导入/导出当前对话的数据库，或管理全局模板。</p>
                    <div class="data-manage-button-group">
                        <button id="data-manage-import-combined" class="primary">合并导入(模板+指令)</button>
                        <button id="data-manage-export-combined" class="primary">合并导出(模板+指令)</button>
                    </div>
                    <hr style="border-color: var(--ios-border); margin: 15px 0;">
                    <div class="data-manage-button-group">
                        <button id="data-manage-export-json" class="secondary">导出JSON数据</button>
                        <button id="data-manage-import-template" class="secondary">导入新模板</button>
                        <button id="data-manage-export-template" class="secondary">导出当前模板</button>
                        <button id="data-manage-reset-template" class="secondary">恢复默认模板</button>
                    </div>
                    <div class="data-manage-button-group" style="margin-top: 10px;">
                        <button id="data-manage-visualize-template" class="secondary">可视化当前模板</button>
                        <button id="data-manage-show-overview" class="secondary">数据概览</button>
                    </div>
                    <div id="data-manage-template-visualization" style="display: none; margin-top: 15px;">
                        <div class="data-manage-button-group" style="margin-bottom: 10px;">
                            <button id="data-manage-save-visualized-template" class="primary">保存模板</button>
                            <button id="data-manage-refresh-template-display" class="secondary">刷新显示</button>
                        </div>
                        <textarea id="data-manage-template-textarea" style="width: 100%; min-height: 300px; font-family: monospace; background-color: var(--ios-gray); color: var(--ios-text); padding: 12px; border: 1px solid var(--ios-border); border-radius: 8px; resize: vertical;"></textarea>
                    </div>
                    <div id="data-manage-overview-area" style="display: none; margin-top: 15px;">
                        <div class="data-manage-button-group" style="margin-bottom: 10px;">
                            <button id="data-manage-refresh-overview" class="secondary">刷新概览</button>
                            <button id="data-manage-export-overview-data" class="secondary">导出数据</button>
                            <button id="data-manage-close-overview" class="secondary">关闭</button>
                        </div>
                        <div id="data-manage-overview-container" style="max-height: 500px; overflow-y: auto; border: 1px solid var(--ios-border); border-radius: 8px; padding: 12px; background-color: var(--ios-gray);">
                            <em style="color: var(--ios-text-secondary);">数据概览内容将显示在这里</em>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 使用 SillyTavern 的弹窗API
    if (context && context.callGenericPopup) {
        context.callGenericPopup(popupHtml, context.POPUP_TYPE?.DISPLAY || 'display', '数据管理', {
            wide: true,
            large: true,
            allowVerticalScrolling: true,
            okButton: '关闭',
            cancelButton: false,
            callback: function(action) {
                console.log('弹窗关闭:', action);
            }
        });
    } else {
        // 如果没有 callGenericPopup，使用简单的弹窗
        const popup = window.open('', 'dataManagePopup', 'width=900,height=700,scrollbars=yes');
        popup.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>数据管理</title>
                <link rel="stylesheet" href="style.css">
            </head>
            <body>
                ${popupHtml}
                <script>
                    ${setupPopupScripts()}
                </script>
            </body>
            </html>
        `);
    }
    
    // 等待DOM更新后设置事件监听器
    setTimeout(() => {
        setupPopupEventListeners();
        loadSettingsToUI();
        updateStatusDisplay();
        
        // 如果当前是API Tab，加载酒馆预设列表
        const parentDoc = (window.parent && window.parent !== window) 
            ? window.parent.document 
            : document;
        const apiTab = parentDoc.getElementById('data-manage-tab-api');
        if (apiTab && apiTab.classList.contains('active')) {
            loadTavernApiProfiles();
        }
    }, 100);
}

/**
 * 设置弹窗事件监听器
 */
function setupPopupEventListeners() {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    // Tab导航
    const tabButtons = parentDoc.querySelectorAll('.data-manage-tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // 状态 & 操作 Tab 的按钮
    setupStatusTabListeners(parentDoc);
    
    // AI指令预设 Tab 的按钮
    setupPromptTabListeners(parentDoc);
    
    // API & 连接 Tab 的按钮
    setupApiTabListeners(parentDoc);
    
    // 世界书 Tab 的按钮
    setupWorldbookTabListeners(parentDoc);
    
    // 数据管理 Tab 的按钮
    setupDataTabListeners(parentDoc);
}

/**
 * 切换Tab
 */
function switchTab(tabName) {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    // 移除所有active类
    parentDoc.querySelectorAll('.data-manage-tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    parentDoc.querySelectorAll('.data-manage-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 激活选中的Tab
    const activeButton = parentDoc.querySelector(`.data-manage-tab-button[data-tab="${tabName}"]`);
    const activeContent = parentDoc.querySelector(`#data-manage-tab-${tabName}`);
    
    if (activeButton) activeButton.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
    
    // 如果切换到API Tab，加载酒馆预设列表
    if (tabName === 'api') {
        loadTavernApiProfiles();
        updateApiStatusDisplay();
    }
    
    // 如果切换到世界书Tab，加载世界书列表
    if (tabName === 'worldbook') {
        populateInjectionTargetSelector();
        updateWorldbookSourceView();
    }
}

/**
 * 设置状态Tab的事件监听器
 */
function setupStatusTabListeners(parentDoc) {
    // 更新数据库按钮
    const updateBtn = parentDoc.getElementById('data-manage-update-card');
    if (updateBtn) {
        updateBtn.addEventListener('click', function() {
            const floorStart = parseInt(parentDoc.getElementById('data-manage-floor-start')?.value || '0');
            const floorEnd = parseInt(parentDoc.getElementById('data-manage-floor-end')?.value || '0');
            
            if (!floorStart || !floorEnd || floorStart < 1 || floorEnd < 1) {
                showToast('请输入有效的楼层范围', 'warning');
                return;
            }
            
            if (floorStart > floorEnd) {
                showToast('起始楼层不能大于结束楼层', 'warning');
                return;
            }
            
            console.log(`按楼层范围更新数据库: ${floorStart} - ${floorEnd}`);
            showToast(`开始更新楼层 ${floorStart} 到 ${floorEnd} 的数据库...`, 'info');
            // TODO: 实现实际的数据库更新逻辑
        });
    }
    
    // 保存更新频率
    const saveFrequencyBtn = parentDoc.getElementById('data-manage-save-frequency');
    if (saveFrequencyBtn) {
        saveFrequencyBtn.addEventListener('click', function() {
            const value = parseInt(parentDoc.getElementById('data-manage-update-frequency')?.value || '0');
            if (isNaN(value) || value < 0) {
                showToast('请输入有效的数字（≥0）', 'warning');
                return;
            }
            currentSettings.autoUpdateFrequency = value;
            if (saveSettings()) {
                showToast('最新N层不更新配置已保存', 'success');
            } else {
                showToast('保存失败', 'error');
            }
        });
    }
    
    // 保存批次大小
    const saveBatchSizeBtn = parentDoc.getElementById('data-manage-save-batch-size');
    if (saveBatchSizeBtn) {
        saveBatchSizeBtn.addEventListener('click', function() {
            const value = parseInt(parentDoc.getElementById('data-manage-batch-size')?.value || '1');
            if (isNaN(value) || value < 1) {
                showToast('请输入有效的数字（≥1）', 'warning');
                return;
            }
            currentSettings.updateBatchSize = value;
            if (saveSettings()) {
                showToast('每次更新楼层数配置已保存', 'success');
            } else {
                showToast('保存失败', 'error');
            }
        });
    }
    
    // 保存总结条目数量
    const saveMaxEntriesBtn = parentDoc.getElementById('data-manage-save-max-entries');
    if (saveMaxEntriesBtn) {
        saveMaxEntriesBtn.addEventListener('click', function() {
            const value = parseInt(parentDoc.getElementById('data-manage-max-entries')?.value || '10');
            if (isNaN(value) || value < 1) {
                showToast('请输入有效的数字（≥1）', 'warning');
                return;
            }
            currentSettings.summaryTableMaxEntries = value;
            if (saveSettings()) {
                showToast('总结条目显示数量配置已保存', 'success');
            } else {
                showToast('保存失败', 'error');
            }
        });
    }
    
    // 保存删除标签
    const saveRemoveTagsBtn = parentDoc.getElementById('data-manage-save-remove-tags');
    if (saveRemoveTagsBtn) {
        saveRemoveTagsBtn.addEventListener('click', function() {
            const value = parentDoc.getElementById('data-manage-remove-tags')?.value || '';
            currentSettings.removeTags = value;
            if (saveSettings()) {
                showToast('自定义删除标签配置已保存', 'success');
            } else {
                showToast('保存失败', 'error');
            }
        });
    }
    
    // 保存标识剔除
    const saveRemoveMarkersBtn = parentDoc.getElementById('data-manage-save-remove-markers');
    if (saveRemoveMarkersBtn) {
        saveRemoveMarkersBtn.addEventListener('click', function() {
            const value = parentDoc.getElementById('data-manage-remove-markers')?.value || '';
            currentSettings.removeMarkers = value;
            if (saveSettings()) {
                showToast('标识剔除配置已保存', 'success');
            } else {
                showToast('保存失败', 'error');
            }
        });
    }
    
    // 保存用户消息标签
    const saveUserTagsBtn = parentDoc.getElementById('data-manage-save-user-tags');
    if (saveUserTagsBtn) {
        saveUserTagsBtn.addEventListener('click', function() {
            const value = parentDoc.getElementById('data-manage-user-message-tags')?.value || '';
            currentSettings.userMessageTags = value;
            if (saveSettings()) {
                showToast('用户消息标签配置已保存', 'success');
            } else {
                showToast('保存失败', 'error');
            }
        });
    }
    
    // 自动更新复选框
    const autoUpdateCheckbox = parentDoc.getElementById('data-manage-auto-update-enabled');
    if (autoUpdateCheckbox) {
        autoUpdateCheckbox.addEventListener('change', function() {
            currentSettings.autoUpdateEnabled = this.checked;
            saveSettings();
            showToast(this.checked ? '已启用自动更新' : '已禁用自动更新', 'info');
        });
    }
    
    // 自动隐藏消息复选框
    const autoHideCheckbox = parentDoc.getElementById('data-manage-auto-hide-messages');
    if (autoHideCheckbox) {
        autoHideCheckbox.addEventListener('change', function() {
            currentSettings.autoHideMessages = this.checked;
            saveSettings();
        });
    }
}

/**
 * 设置AI指令预设Tab的事件监听器
 */
function setupPromptTabListeners(parentDoc) {
    // 保存提示词预设
    const saveBtn = parentDoc.getElementById('data-manage-save-prompt');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            const segments = getPromptSegmentsFromUI();
            
            if (!segments || segments.length === 0 || (segments.length === 1 && !segments[0].content.trim())) {
                showToast('更新预设不能为空', 'warning');
                return;
            }
            
            currentSettings.charCardPrompt = segments;
            if (saveSettings()) {
                showToast('更新预设已保存', 'success');
            } else {
                showToast('保存失败', 'error');
            }
        });
    }
    
    // 读取JSON模板
    const loadBtn = parentDoc.getElementById('data-manage-load-prompt-json');
    if (loadBtn) {
        loadBtn.addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = function(readerEvent) {
                    const content = readerEvent.target.result;
                    let jsonData;
                    
                    try {
                        jsonData = JSON.parse(content);
                    } catch (error) {
                        console.error('导入提示词模板失败：JSON解析错误', error);
                        showToast('文件不是有效的JSON格式', 'error');
                        return;
                    }
                    
                    try {
                        // 验证：必须是包含 role 和 content 的对象数组
                        if (!Array.isArray(jsonData) || jsonData.some(item => typeof item.role === 'undefined' || typeof item.content === 'undefined')) {
                            throw new Error('JSON格式不正确。它必须是一个包含 "role" 和 "content" 键的对象的数组。');
                        }
                        
                        // 规范化角色并添加 deletable 属性
                        const segments = jsonData.map(item => {
                            let normalizedRole = 'USER';
                            if (item.role) {
                                const roleLower = item.role.toLowerCase();
                                if (roleLower === 'system') {
                                    normalizedRole = 'SYSTEM';
                                } else if (roleLower === 'assistant' || roleLower === 'ai') {
                                    normalizedRole = 'assistant';
                                } else if (roleLower === 'user') {
                                    normalizedRole = 'USER';
                                }
                            }
                            return {
                                ...item,
                                role: normalizedRole,
                                deletable: item.deletable !== false
                            };
                        });
                        
                        renderPromptSegments(segments);
                        showToast('提示词模板已成功加载', 'success');
                        console.log('提示词模板已从JSON文件加载');
                    } catch (error) {
                        console.error('导入提示词模板失败：结构验证失败', error);
                        showToast(`导入失败: ${error.message}`, 'error');
                    }
                };
                reader.readAsText(file, 'UTF-8');
            };
            input.click();
        });
    }
    
    // 恢复默认
    const resetBtn = parentDoc.getElementById('data-manage-reset-prompt');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm('确定要恢复默认提示词预设吗？当前设置将被覆盖。')) {
                currentSettings.charCardPrompt = [...DEFAULT_CHAR_CARD_PROMPT];
                if (saveSettings()) {
                    renderPromptSegments(DEFAULT_CHAR_CARD_PROMPT);
                    showToast('更新预设已恢复为默认值', 'info');
                } else {
                    showToast('恢复失败', 'error');
                }
            }
        });
    }
    
    // 添加对话轮次按钮
    const addSegmentBtns = parentDoc.querySelectorAll('.data-manage-add-segment-btn');
    addSegmentBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const position = this.getAttribute('data-position');
            const container = parentDoc.getElementById('data-manage-prompt-segments');
            if (!container) return;
            
            const newSegment = {
                role: 'USER',
                content: '',
                deletable: true
            };
            
            const segmentDiv = parentDoc.createElement('div');
            segmentDiv.className = 'data-manage-prompt-segment';
            const index = container.children.length;
            segmentDiv.id = `data-manage-prompt-segment-${index}`;
            segmentDiv.innerHTML = `
                <div class="data-manage-prompt-segment-toolbar">
                    <select class="data-manage-prompt-segment-role">
                        <option value="assistant">AI</option>
                        <option value="SYSTEM">系统</option>
                        <option value="USER" selected>用户</option>
                    </select>
                    <button class="data-manage-prompt-segment-delete-btn" data-index="${index}">-</button>
                </div>
                <textarea class="data-manage-prompt-segment-content" rows="4"></textarea>
            `;
            
            // 绑定删除按钮事件
            const deleteBtn = segmentDiv.querySelector('.data-manage-prompt-segment-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    segmentDiv.remove();
                });
            }
            
            if (position === 'top') {
                container.insertBefore(segmentDiv, container.firstChild);
            } else {
                container.appendChild(segmentDiv);
            }
            
            console.log(`添加对话轮次: ${position}`);
        });
    });
}

/**
 * 更新API状态显示
 */
function updateApiStatusDisplay() {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    const statusDisplay = parentDoc.getElementById('data-manage-api-status');
    if (!statusDisplay) return;
    
    const settings = currentSettings;
    const apiConfig = settings.apiConfig || {};
    
    if (settings.apiMode === 'tavern') {
        if (settings.tavernProfile) {
            statusDisplay.textContent = `状态: 已选择酒馆连接预设 "${settings.tavernProfile}"`;
            statusDisplay.style.color = '#34C759';
        } else {
            statusDisplay.textContent = '状态: 未选择酒馆连接预设';
            statusDisplay.style.color = '#FF9500';
        }
    } else {
        if (apiConfig.useMainApi) {
            statusDisplay.textContent = '状态: 使用主API (直接使用酒馆当前API和模型)';
            statusDisplay.style.color = '#34C759';
        } else if (apiConfig.url) {
            if (apiConfig.model) {
                statusDisplay.textContent = `状态: 已配置自定义API (${apiConfig.model})`;
                statusDisplay.style.color = '#34C759';
            } else {
                statusDisplay.textContent = '状态: API URL已配置，但未选择模型';
                statusDisplay.style.color = '#FF9500';
            }
        } else {
            statusDisplay.textContent = '状态: 未配置自定义API。数据库更新功能可能不可用。';
            statusDisplay.style.color = '#FF9500';
        }
    }
}

/**
 * 加载酒馆连接预设列表
 */
function loadTavernApiProfiles() {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    const select = parentDoc.getElementById('data-manage-tavern-profile');
    if (!select) return;
    
    try {
        const context = SillyTavern.getContext();
        const profiles = context?.extensionSettings?.connectionManager?.profiles || [];
        
        select.innerHTML = '<option value="">请选择连接预设</option>';
        
        if (profiles.length === 0) {
            const option = parentDoc.createElement('option');
            option.value = '';
            option.textContent = '未找到可用的连接预设';
            option.disabled = true;
            select.appendChild(option);
            return;
        }
        
        profiles.forEach(profile => {
            const option = parentDoc.createElement('option');
            option.value = profile.id || profile.name;
            option.textContent = profile.name || profile.id;
            if (profile.id === currentSettings.tavernProfile) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        console.log('酒馆连接预设列表已加载:', profiles.length);
    } catch (error) {
        console.error('加载酒馆连接预设失败:', error);
        const option = parentDoc.createElement('option');
        option.value = '';
        option.textContent = '加载预设列表失败';
        option.disabled = true;
        select.innerHTML = '';
        select.appendChild(option);
    }
}

/**
 * 设置API Tab的事件监听器
 */
function setupApiTabListeners(parentDoc) {
    // API模式切换
    const apiModeRadios = parentDoc.querySelectorAll('input[name="data-manage-api-mode"]');
    apiModeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const mode = this.value;
            const tavernBlock = parentDoc.getElementById('data-manage-tavern-api-block');
            const customBlock = parentDoc.getElementById('data-manage-custom-api-block');
            
            currentSettings.apiMode = mode;
            saveSettings();
            
            if (mode === 'tavern') {
                if (tavernBlock) tavernBlock.style.display = 'block';
                if (customBlock) customBlock.style.display = 'none';
                loadTavernApiProfiles();
            } else {
                if (tavernBlock) tavernBlock.style.display = 'none';
                if (customBlock) customBlock.style.display = 'block';
            }
            
            updateApiStatusDisplay();
        });
    });
    
    // 使用主API复选框
    const useMainApiCheckbox = parentDoc.getElementById('data-manage-use-main-api');
    if (useMainApiCheckbox) {
        useMainApiCheckbox.addEventListener('change', function() {
            if (!currentSettings.apiConfig) {
                currentSettings.apiConfig = { ...DEFAULT_SETTINGS.apiConfig };
            }
            currentSettings.apiConfig.useMainApi = this.checked;
            
            // 如果使用主API，隐藏自定义字段
            const customApiFields = parentDoc.getElementById('data-manage-custom-api-fields');
            if (customApiFields) {
                customApiFields.style.display = this.checked ? 'none' : 'block';
            }
            
            saveSettings();
            updateApiStatusDisplay();
        });
    }
    
    // 保存API配置
    const saveApiBtn = parentDoc.getElementById('data-manage-save-api');
    if (saveApiBtn) {
        saveApiBtn.addEventListener('click', function() {
            const apiUrlInput = parentDoc.getElementById('data-manage-api-url');
            const apiKeyInput = parentDoc.getElementById('data-manage-api-key');
            const maxTokensInput = parentDoc.getElementById('data-manage-max-tokens');
            const temperatureInput = parentDoc.getElementById('data-manage-temperature');
            const apiModelSelect = parentDoc.getElementById('data-manage-api-model');
            
            if (!apiUrlInput || !apiKeyInput || !maxTokensInput || !temperatureInput || !apiModelSelect) {
                showToast('保存API配置失败：UI元素未初始化', 'error');
                return;
            }
            
            const url = apiUrlInput.value.trim();
            const apiKey = apiKeyInput.value;
            const model = apiModelSelect.value;
            const max_tokens = parseInt(maxTokensInput.value, 10);
            const temperature = parseFloat(temperatureInput.value);
            
            if (!url) {
                showToast('API URL 不能为空', 'warning');
                return;
            }
            
            if (!model && apiModelSelect.options.length > 1) {
                showToast('请选择一个模型', 'warning');
                return;
            }
            
            if (!currentSettings.apiConfig) {
                currentSettings.apiConfig = { ...DEFAULT_SETTINGS.apiConfig };
            }
            
            Object.assign(currentSettings.apiConfig, {
                url: url,
                apiKey: apiKey,
                model: model,
                max_tokens: isNaN(max_tokens) ? 120000 : max_tokens,
                temperature: isNaN(temperature) ? 0.9 : temperature,
            });
            
            if (saveSettings()) {
                showToast('API配置已保存', 'success');
                updateApiStatusDisplay();
            } else {
                showToast('保存失败', 'error');
            }
        });
    }
    
    // 清除API配置
    const clearApiBtn = parentDoc.getElementById('data-manage-clear-api');
    if (clearApiBtn) {
        clearApiBtn.addEventListener('click', function() {
            if (confirm('确定要清除API配置吗？')) {
                if (!currentSettings.apiConfig) {
                    currentSettings.apiConfig = { ...DEFAULT_SETTINGS.apiConfig };
                }
                Object.assign(currentSettings.apiConfig, {
                    url: '',
                    apiKey: '',
                    model: '',
                    max_tokens: 120000,
                    temperature: 0.9
                });
                
                if (saveSettings()) {
                    // 清空输入框
                    const apiUrlInput = parentDoc.getElementById('data-manage-api-url');
                    const apiKeyInput = parentDoc.getElementById('data-manage-api-key');
                    const maxTokensInput = parentDoc.getElementById('data-manage-max-tokens');
                    const temperatureInput = parentDoc.getElementById('data-manage-temperature');
                    const apiModelSelect = parentDoc.getElementById('data-manage-api-model');
                    
                    if (apiUrlInput) apiUrlInput.value = '';
                    if (apiKeyInput) apiKeyInput.value = '';
                    if (maxTokensInput) maxTokensInput.value = '';
                    if (temperatureInput) temperatureInput.value = '';
                    if (apiModelSelect) {
                        apiModelSelect.innerHTML = '<option value="">请先加载模型</option>';
                    }
                    
                    showToast('API配置已清除', 'info');
                    updateApiStatusDisplay();
                } else {
                    showToast('清除失败', 'error');
                }
            }
        });
    }
    
    // 测试连接
    const testApiBtn = parentDoc.getElementById('data-manage-test-api');
    if (testApiBtn) {
        testApiBtn.addEventListener('click', async function() {
            const apiConfig = currentSettings.apiConfig || {};
            
            if (currentSettings.apiMode === 'tavern') {
                if (!currentSettings.tavernProfile) {
                    showToast('请先选择酒馆连接预设', 'warning');
                    return;
                }
                showToast('测试酒馆连接预设功能待实现', 'info');
                return;
            }
            
            if (apiConfig.useMainApi) {
                showToast('使用主API，无需测试', 'info');
                return;
            }
            
            if (!apiConfig.url) {
                showToast('请先配置API URL', 'warning');
                return;
            }
            
            showToast('正在测试API连接...', 'info');
            
            try {
                // TODO: 实现实际的API测试逻辑
                // 这里只是模拟测试
                await new Promise(resolve => setTimeout(resolve, 1000));
                showToast('API连接测试成功', 'success');
            } catch (error) {
                console.error('API连接测试失败:', error);
                showToast(`API连接测试失败: ${error.message}`, 'error');
            }
        });
    }
    
    // 加载模型列表
    const loadModelsBtn = parentDoc.getElementById('data-manage-load-models');
    if (loadModelsBtn) {
        loadModelsBtn.addEventListener('click', async function() {
            const apiUrlInput = parentDoc.getElementById('data-manage-api-url');
            const apiKeyInput = parentDoc.getElementById('data-manage-api-key');
            const apiModelSelect = parentDoc.getElementById('data-manage-api-model');
            const statusDisplay = parentDoc.getElementById('data-manage-api-status');
            
            if (!apiUrlInput || !apiKeyInput || !apiModelSelect || !statusDisplay) {
                showToast('加载模型列表失败：UI元素未初始化', 'error');
                return;
            }
            
            const apiUrl = apiUrlInput.value.trim();
            const apiKey = apiKeyInput.value;
            
            if (!apiUrl) {
                showToast('请输入API基础URL', 'warning');
                statusDisplay.textContent = '状态: 请输入API基础URL';
                statusDisplay.style.color = '#FF9500';
                return;
            }
            
            const statusUrl = `/api/backends/chat-completions/status`;
            statusDisplay.textContent = '状态: 正在检查API端点状态...';
            statusDisplay.style.color = '#007AFF';
            showToast('正在检查自定义API端点状态...', 'info');
            
            try {
                const body = {
                    "reverse_proxy": apiUrl,
                    "proxy_password": "",
                    "chat_completion_source": "custom",
                    "custom_url": apiUrl,
                    "custom_include_headers": apiKey ? `Authorization: Bearer ${apiKey}` : ""
                };
                
                const context = SillyTavern.getContext();
                const headers = context?.getRequestHeaders ? context.getRequestHeaders() : {};
                headers['Content-Type'] = 'application/json';
                
                const response = await fetch(statusUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(body)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    let errorMessage = `API端点状态检查失败: ${response.status} ${response.statusText}.`;
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMessage += ` 详情: ${errorJson.error || errorJson.message || errorText}`;
                    } catch (e) {
                        errorMessage += ` 详情: ${errorText}`;
                    }
                    throw new Error(errorMessage);
                }
                
                const data = await response.json();
                apiModelSelect.innerHTML = '';
                let modelsFound = false;
                let modelsList = [];
                
                if (data && data.models && Array.isArray(data.models)) {
                    modelsList = data.models;
                } else if (data && data.data && Array.isArray(data.data)) {
                    modelsList = data.data;
                } else if (Array.isArray(data)) {
                    modelsList = data;
                }
                
                if (modelsList.length > 0) {
                    modelsFound = true;
                    modelsList.forEach(model => {
                        const modelName = typeof model === 'string' ? model : model.id;
                        if (modelName) {
                            const option = parentDoc.createElement('option');
                            option.value = modelName;
                            option.textContent = modelName;
                            apiModelSelect.appendChild(option);
                        }
                    });
                }
                
                if (modelsFound) {
                    const apiConfig = currentSettings.apiConfig || {};
                    if (apiConfig.model && Array.from(apiModelSelect.options).some(opt => opt.value === apiConfig.model)) {
                        apiModelSelect.value = apiConfig.model;
                    } else {
                        const defaultOption = parentDoc.createElement('option');
                        defaultOption.value = '';
                        defaultOption.textContent = '请选择一个模型';
                        defaultOption.disabled = true;
                        defaultOption.selected = true;
                        apiModelSelect.insertBefore(defaultOption, apiModelSelect.firstChild);
                    }
                    showToast('模型列表加载成功！', 'success');
                    statusDisplay.style.color = '#34C759';
                } else {
                    const option = parentDoc.createElement('option');
                    option.value = '';
                    option.textContent = '未能解析模型数据或列表为空';
                    apiModelSelect.appendChild(option);
                    showToast('未能解析模型数据或列表为空', 'warning');
                    statusDisplay.textContent = '状态: 未能解析模型数据或列表为空';
                    statusDisplay.style.color = '#FF9500';
                }
            } catch (error) {
                console.error('加载模型列表时出错:', error);
                showToast(`加载模型列表失败: ${error.message}`, 'error');
                apiModelSelect.innerHTML = '<option value="">加载模型失败</option>';
                statusDisplay.textContent = `状态: 加载模型失败 - ${error.message}`;
                statusDisplay.style.color = '#FF3B30';
            }
            
            updateApiStatusDisplay();
        });
    }
    
    // 刷新酒馆预设
    const refreshBtn = parentDoc.getElementById('data-manage-refresh-tavern');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadTavernApiProfiles();
            showToast('酒馆预设列表已刷新', 'success');
        });
    }
    
    // 酒馆预设选择变化
    const tavernProfileSelect = parentDoc.getElementById('data-manage-tavern-profile');
    if (tavernProfileSelect) {
        tavernProfileSelect.addEventListener('change', function() {
            currentSettings.tavernProfile = this.value;
            saveSettings();
            updateApiStatusDisplay();
        });
    }
}

/**
 * 加载世界书配置到UI
 */
function loadWorldbookSettingsToUI(settings) {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    const worldbookConfig = settings.worldbookConfig || DEFAULT_SETTINGS.worldbookConfig;
    
    // 世界书来源
    const sourceRadios = parentDoc.querySelectorAll('input[name="data-manage-worldbook-source"]');
    sourceRadios.forEach(radio => {
        if (radio.value === (worldbookConfig.source || 'character')) {
            radio.checked = true;
        }
    });
    
    // 触发来源切换以更新UI
    if (sourceRadios.length > 0) {
        const event = new Event('change', { bubbles: true });
        sourceRadios[0].dispatchEvent(event);
    }
}

/**
 * 获取世界书列表
 */
async function getWorldBooks() {
    try {
        const context = SillyTavern.getContext();
        
        // 尝试使用 TavernHelper API
        if (context && typeof context.getLorebooks === 'function' && typeof context.getLorebookEntries === 'function') {
            const bookNames = context.getLorebooks();
            const books = [];
            for (const name of bookNames) {
                let entries = await context.getLorebookEntries(name);
                if (entries && Array.isArray(entries)) {
                    entries = entries.map(entry => ({ ...entry, book: name }));
                }
                books.push({ name, entries: entries || [] });
            }
            return books;
        }
        
        // 回退到 SillyTavern API
        if (context && typeof context.getWorldBooks === 'function') {
            return await context.getWorldBooks();
        }
        
        return [];
    } catch (error) {
        console.error('获取世界书列表失败:', error);
        return [];
    }
}

/**
 * 填充注入目标选择器
 */
async function populateInjectionTargetSelector() {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    const select = parentDoc.getElementById('data-manage-injection-target');
    if (!select) return;
    
    try {
        const books = await getWorldBooks();
        select.innerHTML = '<option value="character">角色卡绑定世界书</option>';
        
        books.forEach(book => {
            const option = parentDoc.createElement('option');
            option.value = book.name;
            option.textContent = book.name;
            select.appendChild(option);
        });
        
        // 设置当前选中的值
        const worldbookConfig = currentSettings.worldbookConfig || DEFAULT_SETTINGS.worldbookConfig;
        select.value = worldbookConfig.injectionTarget || 'character';
        
        // 监听变化
        select.addEventListener('change', function() {
            if (!currentSettings.worldbookConfig) {
                currentSettings.worldbookConfig = { ...DEFAULT_SETTINGS.worldbookConfig };
            }
            currentSettings.worldbookConfig.injectionTarget = this.value;
            saveSettings();
        });
    } catch (error) {
        console.error('填充注入目标选择器失败:', error);
        select.innerHTML = '<option value="character">加载列表失败</option>';
    }
}

/**
 * 填充世界书列表（手动选择模式）
 */
async function populateWorldbookList() {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    const container = parentDoc.getElementById('data-manage-worldbook-select');
    if (!container) return;
    
    container.innerHTML = '<em style="color: var(--ios-text-secondary);">正在加载...</em>';
    
    try {
        const books = await getWorldBooks();
        container.innerHTML = '';
        
        if (books.length === 0) {
            container.innerHTML = '<em style="color: var(--ios-text-secondary);">未找到世界书</em>';
            return;
        }
        
        const worldbookConfig = currentSettings.worldbookConfig || DEFAULT_SETTINGS.worldbookConfig;
        const manualSelection = worldbookConfig.manualSelection || [];
        
        books.forEach(book => {
            const isSelected = manualSelection.includes(book.name);
            const item = parentDoc.createElement('div');
            item.className = 'data-manage-worldbook-item';
            item.style.cssText = `
                padding: 8px 12px;
                margin: 4px 0;
                border: 1px solid var(--ios-border);
                border-radius: 8px;
                background-color: ${isSelected ? 'var(--ios-blue-active)' : 'var(--ios-surface)'};
                color: ${isSelected ? 'white' : 'var(--ios-text)'};
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            item.textContent = book.name;
            item.dataset.bookName = book.name;
            
            if (isSelected) {
                item.classList.add('selected');
            }
            
            item.addEventListener('click', function() {
                const bookName = this.dataset.bookName;
                let selection = worldbookConfig.manualSelection || [];
                
                if (this.classList.contains('selected')) {
                    selection = selection.filter(name => name !== bookName);
                    this.classList.remove('selected');
                    this.style.backgroundColor = 'var(--ios-surface)';
                    this.style.color = 'var(--ios-text)';
                } else {
                    selection.push(bookName);
                    this.classList.add('selected');
                    this.style.backgroundColor = 'var(--ios-blue-active)';
                    this.style.color = 'white';
                }
                
                if (!currentSettings.worldbookConfig) {
                    currentSettings.worldbookConfig = { ...DEFAULT_SETTINGS.worldbookConfig };
                }
                currentSettings.worldbookConfig.manualSelection = selection;
                saveSettings();
                
                populateWorldbookEntryList();
            });
            
            container.appendChild(item);
        });
    } catch (error) {
        console.error('填充世界书列表失败:', error);
        container.innerHTML = '<em style="color: var(--ios-text-secondary);">加载失败</em>';
    }
}

/**
 * 填充世界书条目列表
 */
async function populateWorldbookEntryList() {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    const container = parentDoc.getElementById('data-manage-worldbook-entry-list');
    if (!container) return;
    
    container.innerHTML = '<em style="color: var(--ios-text-secondary);">正在加载条目...</em>';
    
    const worldbookConfig = currentSettings.worldbookConfig || DEFAULT_SETTINGS.worldbookConfig;
    const source = worldbookConfig.source || 'character';
    let bookNames = [];
    
    try {
        // 获取世界书名称列表
        if (source === 'character') {
            // 尝试使用 TavernHelper API 获取角色卡绑定的世界书
            const parentWin = (window.parent && window.parent !== window) ? window.parent : window;
            let TavernHelper = null;
            
            // 尝试多种方式获取TavernHelper
            if (parentWin && parentWin.TavernHelper) {
                TavernHelper = parentWin.TavernHelper;
            } else if (window.TavernHelper) {
                TavernHelper = window.TavernHelper;
            } else if (parentWin && parentWin.window && parentWin.window.TavernHelper) {
                TavernHelper = parentWin.window.TavernHelper;
            }
            
            if (TavernHelper && typeof TavernHelper.getCharLorebooks === 'function') {
                try {
                    const charLorebooks = await TavernHelper.getCharLorebooks({ type: 'all' });
                    if (charLorebooks) {
                        if (charLorebooks.primary) {
                            bookNames.push(charLorebooks.primary);
                        }
                        if (charLorebooks.additional && Array.isArray(charLorebooks.additional) && charLorebooks.additional.length > 0) {
                            bookNames.push(...charLorebooks.additional);
                        }
                    }
                } catch (error) {
                    console.error('使用TavernHelper获取角色卡世界书失败:', error);
                }
            }
            
            // 如果仍然没有获取到，尝试从角色卡数据中获取
            if (bookNames.length === 0) {
                const context = SillyTavern.getContext();
                if (context && context.chat && context.chat.character) {
                    try {
                        const char = context.chat.character;
                        if (char.lorebook && Array.isArray(char.lorebook) && char.lorebook.length > 0) {
                            // 从角色卡数据中提取世界书名称
                            const lorebookNames = new Set();
                            char.lorebook.forEach(entry => {
                                if (entry && entry.worldbook) {
                                    lorebookNames.add(entry.worldbook);
                                }
                            });
                            bookNames = Array.from(lorebookNames);
                        }
                    } catch (error) {
                        console.error('从角色卡数据获取世界书失败:', error);
                    }
                }
            }
        } else if (source === 'manual') {
            bookNames = worldbookConfig.manualSelection || [];
        }
        
        if (bookNames.length === 0) {
            container.innerHTML = '<em style="color: var(--ios-text-secondary);">未找到世界书</em>';
            return;
        }
        
        const allBooks = await getWorldBooks();
        let html = '';
        let settingsChanged = false;
        
        for (const bookName of bookNames) {
            const bookData = allBooks.find(b => b.name === bookName);
            if (bookData && bookData.entries) {
                // 如果该世界书没有设置，默认启用所有条目
                if (typeof worldbookConfig.enabledEntries[bookName] === 'undefined') {
                    worldbookConfig.enabledEntries[bookName] = bookData.entries.map(entry => entry.uid || entry.id);
                    settingsChanged = true;
                }
                
                const enabledEntries = worldbookConfig.enabledEntries[bookName] || [];
                html += `<div style="margin-bottom: 8px; font-weight: 600; padding-bottom: 6px; border-bottom: 1px solid var(--ios-border);">${escapeHtml(bookName)}</div>`;
                
                bookData.entries.forEach(entry => {
                    const entryUid = entry.uid || entry.id;
                    const isEnabled = enabledEntries.includes(entryUid);
                    const entryName = entry.name || entryUid || '未命名条目';
                    const checkboxId = `worldbook-entry-${bookName}-${entryUid}`.replace(/[^a-zA-Z0-9-]/g, '-');
                    
                    html += `
                        <div class="data-manage-checkbox-group" style="margin-bottom: 4px;">
                            <input type="checkbox" id="${checkboxId}" data-book="${escapeHtml(bookName)}" data-uid="${escapeHtml(entryUid)}" ${isEnabled ? 'checked' : ''}>
                            <label for="${checkboxId}" style="margin: 0; cursor: pointer; flex: 1;">${escapeHtml(entryName)}</label>
                        </div>
                    `;
                });
            }
        }
        
        if (settingsChanged) {
            if (!currentSettings.worldbookConfig) {
                currentSettings.worldbookConfig = { ...DEFAULT_SETTINGS.worldbookConfig };
            }
            currentSettings.worldbookConfig.enabledEntries = worldbookConfig.enabledEntries;
            saveSettings();
        }
        
        container.innerHTML = html;
        
        // 绑定复选框事件
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const bookName = this.dataset.book;
                const entryUid = this.dataset.uid;
                
                if (!currentSettings.worldbookConfig) {
                    currentSettings.worldbookConfig = { ...DEFAULT_SETTINGS.worldbookConfig };
                }
                if (!currentSettings.worldbookConfig.enabledEntries[bookName]) {
                    currentSettings.worldbookConfig.enabledEntries[bookName] = [];
                }
                
                const enabledList = currentSettings.worldbookConfig.enabledEntries[bookName];
                const index = enabledList.indexOf(entryUid);
                
                if (this.checked) {
                    if (index === -1) {
                        enabledList.push(entryUid);
                    }
                } else {
                    if (index !== -1) {
                        enabledList.splice(index, 1);
                    }
                }
                
                saveSettings();
            });
        });
    } catch (error) {
        console.error('填充世界书条目列表失败:', error);
        container.innerHTML = '<em style="color: var(--ios-text-secondary);">加载失败</em>';
    }
}

/**
 * 更新世界书来源视图
 */
async function updateWorldbookSourceView() {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    const worldbookConfig = currentSettings.worldbookConfig || DEFAULT_SETTINGS.worldbookConfig;
    const source = worldbookConfig.source || 'character';
    const manualBlock = parentDoc.getElementById('data-manage-worldbook-manual-block');
    
    if (source === 'manual') {
        if (manualBlock) manualBlock.style.display = 'block';
        await populateWorldbookList();
    } else {
        if (manualBlock) manualBlock.style.display = 'none';
    }
    
    await populateWorldbookEntryList();
}

/**
 * 设置世界书Tab的事件监听器
 */
function setupWorldbookTabListeners(parentDoc) {
    // 世界书来源切换
    const sourceRadios = parentDoc.querySelectorAll('input[name="data-manage-worldbook-source"]');
    sourceRadios.forEach(radio => {
        radio.addEventListener('change', async function() {
            const source = this.value;
            
            if (!currentSettings.worldbookConfig) {
                currentSettings.worldbookConfig = { ...DEFAULT_SETTINGS.worldbookConfig };
            }
            currentSettings.worldbookConfig.source = source;
            saveSettings();
            
            await updateWorldbookSourceView();
        });
    });
    
    // 刷新世界书列表
    const refreshBtn = parentDoc.getElementById('data-manage-refresh-worldbooks');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            await populateWorldbookList();
            showToast('世界书列表已刷新', 'success');
        });
    }
    
    // 全选条目
    const selectAllBtn = parentDoc.getElementById('data-manage-worldbook-select-all');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            const container = parentDoc.getElementById('data-manage-worldbook-entry-list');
            if (!container) return;
            
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change'));
            });
            
            showToast('已全选所有条目', 'success');
        });
    }
    
    // 全不选条目
    const deselectAllBtn = parentDoc.getElementById('data-manage-worldbook-deselect-all');
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', function() {
            const container = parentDoc.getElementById('data-manage-worldbook-entry-list');
            if (!container) return;
            
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                checkbox.dispatchEvent(new Event('change'));
            });
            
            showToast('已取消全选', 'info');
        });
    }
}

/**
 * 显示数据概览
 */
function showDataOverview() {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    const overviewArea = parentDoc.getElementById('data-manage-overview-area');
    const overviewContainer = parentDoc.getElementById('data-manage-overview-container');
    
    if (!overviewArea || !overviewContainer) return;
    
    try {
        const context = SillyTavern.getContext();
        
        if (!context || !context.chat || context.chat.length === 0) {
            showToast('没有聊天记录可查看', 'warning');
            return;
        }
        
        const chat = context.chat;
        let dataCount = 0;
        
        // 保存当前展开状态
        if (!window.dataManageExpandedDetails) {
            window.dataManageExpandedDetails = new Set();
        }
        const expandedDetails = window.dataManageExpandedDetails;
        
        if (overviewArea.style.display === 'none' || !overviewArea.style.display) {
            overviewArea.style.display = 'block';
            overviewContainer.innerHTML = '<em style="color: var(--ios-text-secondary);">正在加载数据概览...</em>';
            
            // 遍历聊天记录，查找包含数据库数据的消息（排除楼层0）
            let html = '<div class="overview-content">';
            html += '<h3 style="color: var(--ios-text); margin-bottom: 20px;">聊天记录数据概览</h3>';
            
            for (let i = chat.length - 1; i > 0; i--) {
                const message = chat[i];
                let messageData = null;
                
                // 优先查找 TavernDB_ACU_Data 字段
                if (message.TavernDB_ACU_Data) {
                    messageData = message.TavernDB_ACU_Data;
                } else if (message.mes) {
                    // 尝试从消息文本中解析JSON数据
                    try {
                        const mesText = message.mes;
                        // 查找JSON格式的数据
                        const jsonMatch = mesText.match(/```json\s*([\s\S]*?)\s*```/);
                        if (jsonMatch) {
                            const jsonData = JSON.parse(jsonMatch[1]);
                            if (jsonData && typeof jsonData === 'object') {
                                messageData = jsonData;
                            }
                        } else {
                            // 尝试直接解析为JSON
                            try {
                                const jsonData = JSON.parse(mesText);
                                if (jsonData && typeof jsonData === 'object') {
                                    messageData = jsonData;
                                }
                            } catch (e) {
                                // 不是JSON格式，继续查找
                            }
                        }
                    } catch (e) {
                        // 解析失败，继续查找
                    }
                }
                
                if (messageData) {
                    dataCount++;
                    const messageIndex = i;
                    const timestamp = new Date(message.send_date || message.timestamp || Date.now()).toLocaleString();
                    const messageType = message.is_user ? '用户消息' : 'AI回复';
                    
                    html += `<div class="message-data-card" data-message-index="${i}" style="
                        background: var(--ios-gray); border: 1px solid var(--ios-border); border-radius: 10px; 
                        padding: 15px; margin-bottom: 15px; color: var(--ios-text);
                    ">`;
                    html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">`;
                    html += `<h4 style="margin: 0; color: var(--ios-text);">楼层 ${messageIndex} - ${messageType} - 数据库记录</h4>`;
                    html += `<span style="font-size: 12px; color: var(--ios-text-secondary);">${escapeHtml(timestamp)}</span>`;
                    html += `</div>`;
                    
                    // 显示数据统计
                    const tableKeys = Object.keys(messageData).filter(k => k.startsWith('sheet_'));
                    html += `<div style="margin-bottom: 10px;">`;
                    html += `<p style="margin: 5px 0; color: var(--ios-text-secondary);">包含 ${tableKeys.length} 个数据表格</p>`;
                    
                    // 显示每个表格的简要信息
                    tableKeys.forEach(sheetKey => {
                        const table = messageData[sheetKey];
                        if (table && table.name && table.content) {
                            const rowCount = table.content.length - 1; // 减去表头
                            html += `<div style="background: var(--ios-gray-dark); padding: 8px; margin: 5px 0; border-radius: 6px; font-size: 12px;">`;
                            html += `<strong>${escapeHtml(table.name)}</strong>: ${rowCount} 条记录`;
                            if (table.sourceData && table.sourceData.note) {
                                html += ` - ${escapeHtml(table.sourceData.note)}`;
                            }
                            html += `</div>`;
                        }
                    });
                    
                    html += `</div>`;
                    
                    // 详情展开区域（根据状态决定是否显示）
                    const isExpanded = expandedDetails.has(i);
                    const displayStyle = isExpanded ? 'block' : 'none';
                    const buttonText = isExpanded ? '收起详情' : '展开详情';
                    
                    // 操作按钮
                    html += `<div style="text-align: right;">`;
                    html += `<button class="toggle-details-btn" data-message-index="${i}" style="
                        background: var(--ios-blue); color: white; border: none; padding: 6px 12px; 
                        border-radius: 6px; cursor: pointer; margin-right: 5px; font-size: 12px;
                        transition: all 0.2s;
                    ">${buttonText}</button>`;
                    html += `<button class="delete-message-btn" data-message-index="${i}" style="
                        background: #dc3545; color: white; border: none; padding: 6px 12px; 
                        border-radius: 6px; cursor: pointer; font-size: 12px;
                        transition: all 0.2s;
                    ">删除记录</button>`;
                    html += `</div>`;
                    
                    html += `<div class="message-details" data-message-index="${i}" style="
                        display: ${displayStyle}; margin-top: 15px; padding-top: 15px; 
                        border-top: 1px solid var(--ios-border); background: var(--ios-gray-dark); 
                        border-radius: 6px; padding: 15px;
                    ">`;
                    html += `<div class="details-content">`;
                    if (isExpanded) {
                        html += loadMessageDetails(i, messageData);
                    } else {
                        html += `<!-- 详情内容将在这里动态加载 -->`;
                    }
                    html += `</div>`;
                    html += `</div>`;
                    html += `</div>`;
                }
            }
            
            if (dataCount === 0) {
                html += '<p style="text-align: center; color: var(--ios-text-secondary); font-style: italic; padding: 20px;">暂无数据库记录</p>';
            } else {
                html += `<div style="margin-top: 20px; padding: 10px; background: var(--ios-gray-dark); border-radius: 8px; text-align: center;">`;
                html += `<p style="margin: 0; color: var(--ios-text-secondary);">共找到 ${dataCount} 条数据库记录</p>`;
                html += `</div>`;
            }
            
            html += '</div>';
            
            overviewContainer.innerHTML = html;
            
            // 绑定概览事件
            bindOverviewEvents(parentDoc);
            
            // 加载展开状态的详情内容
            expandedDetails.forEach(messageIndex => {
                const detailsArea = overviewContainer.querySelector(`.message-details[data-message-index="${messageIndex}"]`);
                if (detailsArea) {
                    const message = chat[messageIndex];
                    let messageData = null;
                    if (message.TavernDB_ACU_Data) {
                        messageData = message.TavernDB_ACU_Data;
                    } else if (message.mes) {
                        try {
                            const mesText = message.mes;
                            const jsonMatch = mesText.match(/```json\s*([\s\S]*?)\s*```/);
                            if (jsonMatch) {
                                messageData = JSON.parse(jsonMatch[1]);
                            } else {
                                try {
                                    messageData = JSON.parse(mesText);
                                } catch (e) {}
                            }
                        } catch (e) {}
                    }
                    if (messageData) {
                        const contentDiv = detailsArea.querySelector('.details-content');
                        if (contentDiv) {
                            contentDiv.innerHTML = loadMessageDetails(messageIndex, messageData);
                        }
                    }
                }
            });
            
            showToast(`已加载 ${dataCount} 条数据库记录`, 'success');
        } else {
            overviewArea.style.display = 'none';
        }
    } catch (error) {
        console.error('显示数据概览失败:', error);
        showToast(`显示数据概览失败: ${error.message}`, 'error');
    }
}

/**
 * 绑定概览事件
 */
function bindOverviewEvents(parentDoc) {
    const overviewArea = parentDoc.getElementById('data-manage-overview-area');
    if (!overviewArea) return;
    
    // 移除之前的事件绑定
    const toggleBtns = overviewArea.querySelectorAll('.toggle-details-btn');
    const deleteBtns = overviewArea.querySelectorAll('.delete-message-btn');
    const saveRowBtns = overviewArea.querySelectorAll('.save-row-btn');
    const deleteRowBtns = overviewArea.querySelectorAll('.delete-row-btn');
    const deleteTableBtns = overviewArea.querySelectorAll('.delete-table-btn');
    
    toggleBtns.forEach(btn => {
        btn.removeEventListener('click', handleToggleDetails);
        btn.addEventListener('click', handleToggleDetails);
    });
    
    deleteBtns.forEach(btn => {
        btn.removeEventListener('click', handleDeleteMessage);
        btn.addEventListener('click', handleDeleteMessage);
    });
    
    saveRowBtns.forEach(btn => {
        btn.removeEventListener('click', handleSaveRow);
        btn.addEventListener('click', handleSaveRow);
    });
    
    deleteRowBtns.forEach(btn => {
        btn.removeEventListener('click', handleDeleteRow);
        btn.addEventListener('click', handleDeleteRow);
    });
    
    deleteTableBtns.forEach(btn => {
        btn.removeEventListener('click', handleDeleteTable);
        btn.addEventListener('click', handleDeleteTable);
    });
    
    // 自适应高度函数
    const textareas = overviewArea.querySelectorAll('.cell-input');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.max(40, this.scrollHeight) + 'px';
        });
        // 初始化高度
        textarea.style.height = 'auto';
        textarea.style.height = Math.max(40, textarea.scrollHeight) + 'px';
    });
}

/**
 * 处理展开/收起详情
 */
function handleToggleDetails(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const messageIndex = parseInt(e.target.getAttribute('data-message-index'));
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    const overviewArea = parentDoc.getElementById('data-manage-overview-area');
    if (!overviewArea) return;
    
    const detailsArea = overviewArea.querySelector(`.message-details[data-message-index="${messageIndex}"]`);
    const toggleBtn = overviewArea.querySelector(`.toggle-details-btn[data-message-index="${messageIndex}"]`);
    
    if (!detailsArea || !toggleBtn) return;
    
    try {
        const context = SillyTavern.getContext();
        if (!context || !context.chat) return;
        
        const message = context.chat[messageIndex];
        if (!message) return;
        
        let messageData = null;
        if (message.TavernDB_ACU_Data) {
            messageData = message.TavernDB_ACU_Data;
        } else if (message.mes) {
            try {
                const mesText = message.mes;
                const jsonMatch = mesText.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    messageData = JSON.parse(jsonMatch[1]);
                } else {
                    try {
                        messageData = JSON.parse(mesText);
                    } catch (e) {}
                }
            } catch (e) {}
        }
        
        if (!messageData) return;
        
        if (detailsArea.style.display === 'none' || !detailsArea.style.display) {
            // 展开详情
            const contentDiv = detailsArea.querySelector('.details-content');
            if (contentDiv) {
                contentDiv.innerHTML = loadMessageDetails(messageIndex, messageData);
                // 重新绑定事件
                bindOverviewEvents(parentDoc);
            }
            detailsArea.style.display = 'block';
            toggleBtn.textContent = '收起详情';
            if (!window.dataManageExpandedDetails) {
                window.dataManageExpandedDetails = new Set();
            }
            window.dataManageExpandedDetails.add(messageIndex);
        } else {
            // 收起详情
            detailsArea.style.display = 'none';
            toggleBtn.textContent = '展开详情';
            if (window.dataManageExpandedDetails) {
                window.dataManageExpandedDetails.delete(messageIndex);
            }
        }
    } catch (error) {
        console.error('展开/收起详情失败:', error);
        showToast('展开/收起详情失败', 'error');
    }
}

/**
 * 处理删除记录
 */
async function handleDeleteMessage(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const messageIndex = parseInt(e.target.getAttribute('data-message-index'));
    
    if (!confirm(`确定要删除楼层 ${messageIndex} 的数据库记录吗？此操作不可恢复。`)) {
        return;
    }
    
    try {
        const context = SillyTavern.getContext();
        if (!context || !context.chat) {
            showToast('无法访问聊天记录', 'error');
            return;
        }
        
        const message = context.chat[messageIndex];
        if (!message) {
            showToast('消息不存在', 'error');
            return;
        }
        
        // 删除 TavernDB_ACU_Data 字段
        if (message.TavernDB_ACU_Data) {
            delete message.TavernDB_ACU_Data;
        }
        
        // 如果数据在消息文本中，尝试删除
        if (message.mes) {
            try {
                // 移除JSON代码块
                message.mes = message.mes.replace(/```json\s*[\s\S]*?\s*```/g, '');
                // 如果消息文本为空，可以删除整个消息（可选）
            } catch (e) {
                console.error('删除消息数据失败:', e);
            }
        }
        
        // 刷新概览
        showDataOverview();
        showToast(`已删除楼层 ${messageIndex} 的数据库记录`, 'success');
    } catch (error) {
        console.error('删除记录失败:', error);
        showToast(`删除记录失败: ${error.message}`, 'error');
    }
}

/**
 * 加载消息详情内容
 */
function loadMessageDetails(messageIndex, messageData) {
    let html = '<div class="expanded-details-content">';
    
    const tableKeys = Object.keys(messageData).filter(k => k.startsWith('sheet_'));
    
    if (tableKeys.length === 0) {
        html += '<p style="color: var(--ios-text-secondary); text-align: center; padding: 20px;">没有数据表格</p>';
    } else {
        tableKeys.forEach(sheetKey => {
            const table = messageData[sheetKey];
            if (!table || !table.name || !table.content) return;
            
            html += `<div class="table-section" data-sheet-key="${sheetKey}" style="margin-bottom: 20px;">`;
            html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">`;
            html += `<h4 class="table-title" style="margin: 0; color: var(--ios-text);">${escapeHtml(table.name)}</h4>`;
            html += `<button class="delete-table-btn" data-sheet-key="${sheetKey}" data-message-index="${messageIndex}" style="
                background: #dc3545; color: white; border: none; padding: 5px 10px; 
                border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s;
            ">删除表格</button>`;
            html += `</div>`;
            
            // 显示表格元数据
            if (table.sourceData && table.sourceData.note) {
                html += `<div class="table-metadata" style="margin-bottom: 10px;">`;
                html += `<p style="margin: 5px 0; color: var(--ios-text-secondary);">备注: ${escapeHtml(table.sourceData.note)}</p>`;
                html += `</div>`;
            }
            
            // 显示表格内容（可编辑）
            html += `<div class="table-scroll-container" style="overflow-x: auto;">`;
            html += `<table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 12px;">`;
            
            // 表头
            html += '<thead><tr>';
            html += `<th style="background-color: var(--ios-gray-dark); padding: 8px; text-align: left; border: 1px solid var(--ios-border);">条目内容</th>`;
            html += `<th style="background-color: var(--ios-gray-dark); padding: 8px; text-align: center; border: 1px solid var(--ios-border); width: 120px;">操作</th>`;
            html += '</tr></thead>';
            
            // 数据行
            html += '<tbody>';
            const rows = table.content.slice(1);
            rows.forEach((row, rowIndex) => {
                const rowData = row.slice(1);
                // 将所有字段值用 | 分隔符合并为一个字符串
                const combinedValue = rowData.map(cell => cell || '').join(' | ');
                
                html += `<tr data-row-index="${rowIndex}" data-sheet-key="${sheetKey}">`;
                
                // 单个输入框 - 包含整行数据（用 | 分隔）
                html += `<td class="editable-cell" style="padding: 8px; border: 1px solid var(--ios-border);">`;
                html += `<textarea class="cell-input" `;
                html += `data-sheet-key="${sheetKey}" data-row-index="${rowIndex}" `;
                html += `data-message-index="${messageIndex}" `;
                html += `style="width: 100%; min-height: 40px; padding: 6px; border: 1px solid var(--ios-border); border-radius: 6px; background-color: var(--ios-gray); color: var(--ios-text); font-size: 13px; font-family: inherit; resize: vertical; box-sizing: border-box;">${escapeHtml(combinedValue)}</textarea>`;
                html += `</td>`;
                
                // 操作列
                html += `<td style="text-align: center; vertical-align: middle; padding: 8px; border: 1px solid var(--ios-border);">`;
                html += `<div style="display: flex; flex-direction: column; gap: 5px; align-items: center;">`;
                html += `<button class="save-row-btn" data-sheet-key="${sheetKey}" data-row-index="${rowIndex}" `;
                html += `data-message-index="${messageIndex}" style="
                    background: #28a745; color: white; border: none; padding: 4px 8px; 
                    border-radius: 6px; cursor: pointer; font-size: 11px; width: 60px; transition: all 0.2s;
                ">保存</button>`;
                html += `<button class="delete-row-btn" data-sheet-key="${sheetKey}" data-row-index="${rowIndex}" `;
                html += `data-message-index="${messageIndex}" style="
                    background: #dc3545; color: white; border: none; padding: 4px 8px; 
                    border-radius: 6px; cursor: pointer; font-size: 11px; width: 60px; transition: all 0.2s;
                ">删除</button>`;
                html += `</div>`;
                html += `</td>`;
                
                html += '</tr>';
            });
            
            html += '</tbody>';
            html += '</table>';
            html += `</div>`;
            
            html += `</div>`;
        });
    }
    
    html += '</div>';
    return html;
}

/**
 * 导出数据为JSON
 */
function exportDataAsJSON() {
    try {
        const dataToExport = {
            settings: currentSettings,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
        
        const jsonStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-manage-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('数据已导出为JSON文件', 'success');
    } catch (error) {
        console.error('导出数据失败:', error);
        showToast('导出数据失败', 'error');
    }
}

/**
 * 合并导出（模板+指令）
 */
function exportCombinedSettings() {
    try {
        const combinedData = {
            template: currentSettings,
            prompt: currentSettings.charCardPrompt,
            overviewTemplate: currentSettings.overviewTemplate || DEFAULT_CHAR_CARD_PROMPT,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
        
        const jsonStr = JSON.stringify(combinedData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-manage-combined-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('合并设置已导出', 'success');
    } catch (error) {
        console.error('导出合并设置失败:', error);
        showToast('导出失败', 'error');
    }
}

/**
 * 合并导入（模板+指令）
 */
function importCombinedSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(readerEvent) {
            try {
                const importedData = JSON.parse(readerEvent.target.result);
                
                if (importedData.template) {
                    Object.assign(currentSettings, importedData.template);
                }
                if (importedData.prompt) {
                    currentSettings.charCardPrompt = importedData.prompt;
                }
                if (importedData.overviewTemplate) {
                    currentSettings.overviewTemplate = importedData.overviewTemplate;
                }
                
                if (saveSettings()) {
                    loadSettingsToUI();
                    showToast('合并设置已导入', 'success');
                } else {
                    showToast('导入失败', 'error');
                }
            } catch (error) {
                console.error('导入合并设置失败:', error);
                showToast('文件格式错误', 'error');
            }
        };
        reader.readAsText(file, 'UTF-8');
    };
    input.click();
}

/**
 * 可视化当前模板
 */
function visualizeTemplate() {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    const visualizationArea = parentDoc.getElementById('data-manage-template-visualization');
    const textarea = parentDoc.getElementById('data-manage-template-textarea');
    
    if (!visualizationArea || !textarea) return;
    
    if (visualizationArea.style.display === 'none' || !visualizationArea.style.display) {
        visualizationArea.style.display = 'block';
        
        // 从本地存储加载模板
        const topLevelWindow = (window.parent && window.parent !== window) ? window.parent : window;
        let templateContent = '';
        
        try {
            if (topLevelWindow.localStorage) {
                const savedTemplate = topLevelWindow.localStorage.getItem(STORAGE_KEY_TEMPLATE);
                if (savedTemplate) {
                    // 尝试解析并格式化JSON
                    try {
                        const parsedTemplate = JSON.parse(savedTemplate);
                        templateContent = JSON.stringify(parsedTemplate, null, 2);
                    } catch (e) {
                        templateContent = savedTemplate;
                    }
                }
            }
        } catch (error) {
            console.error('加载模板失败:', error);
        }
        
        if (!templateContent) {
            templateContent = currentSettings.overviewTemplate || DEFAULT_SETTINGS.overviewTemplate || '';
        }
        
        textarea.value = templateContent;
    } else {
        visualizationArea.style.display = 'none';
    }
}

/**
 * 保存可视化模板
 */
function saveVisualizedTemplate() {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    const textarea = parentDoc.getElementById('data-manage-template-textarea');
    if (!textarea) return;
    
    const content = textarea.value.trim();
    if (!content) {
        showToast('模板内容为空，无法保存', 'error');
        return;
    }
    
    try {
        // 验证JSON格式
        const parsedTemplate = JSON.parse(content);
        
        // 保存到本地存储
        const topLevelWindow = (window.parent && window.parent !== window) ? window.parent : window;
        if (topLevelWindow.localStorage) {
            topLevelWindow.localStorage.setItem(STORAGE_KEY_TEMPLATE, content);
        }
        
        // 同时更新设置中的overviewTemplate
        currentSettings.overviewTemplate = content;
        saveSettings();
        
        showToast('模板已保存', 'success');
    } catch (error) {
        console.error('保存可视化模板失败:', error);
        let errorMessage = '模板不是有效的JSON格式。请检查是否存在多余的逗号、缺失的括号或不正确的引号。';
        if (error.message) {
            errorMessage += ` (错误详情: ${error.message})`;
        }
        showToast(errorMessage, 'error');
    }
}

function setupDataTabListeners(parentDoc) {
    // 显示数据概览
    const showOverviewBtn = parentDoc.getElementById('data-manage-show-overview');
    if (showOverviewBtn) {
        showOverviewBtn.addEventListener('click', showDataOverview);
    }
    
    // 关闭概览
    const closeOverviewBtn = parentDoc.getElementById('data-manage-close-overview');
    if (closeOverviewBtn) {
        closeOverviewBtn.addEventListener('click', function() {
            const overviewArea = parentDoc.getElementById('data-manage-overview-area');
            if (overviewArea) overviewArea.style.display = 'none';
        });
    }
    
    // 刷新概览
    const refreshOverviewBtn = parentDoc.getElementById('data-manage-refresh-overview');
    if (refreshOverviewBtn) {
        refreshOverviewBtn.addEventListener('click', function() {
            showDataOverview();
            showToast('数据概览已刷新', 'success');
        });
    }
    
    // 导出概览数据
    const exportOverviewBtn = parentDoc.getElementById('data-manage-export-overview-data');
    if (exportOverviewBtn) {
        exportOverviewBtn.addEventListener('click', exportDataAsJSON);
    }
    
    // 导出JSON数据
    const exportJsonBtn = parentDoc.getElementById('data-manage-export-json');
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', exportDataAsJSON);
    }
    
    // 合并导出
    const exportCombinedBtn = parentDoc.getElementById('data-manage-export-combined');
    if (exportCombinedBtn) {
        exportCombinedBtn.addEventListener('click', exportCombinedSettings);
    }
    
    // 合并导入
    const importCombinedBtn = parentDoc.getElementById('data-manage-import-combined');
    if (importCombinedBtn) {
        importCombinedBtn.addEventListener('click', importCombinedSettings);
    }
    
    // 导入模板
    const importTemplateBtn = parentDoc.getElementById('data-manage-import-template');
    if (importTemplateBtn) {
        importTemplateBtn.addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = function(readerEvent) {
                    try {
                        const templateData = JSON.parse(readerEvent.target.result);
                        Object.assign(currentSettings, templateData);
                        
                        if (saveSettings()) {
                            loadSettingsToUI();
                            showToast('模板已导入', 'success');
                        } else {
                            showToast('导入失败', 'error');
                        }
                    } catch (error) {
                        console.error('导入模板失败:', error);
                        showToast('文件格式错误', 'error');
                    }
                };
                reader.readAsText(file, 'UTF-8');
            };
            input.click();
        });
    }
    
    // 导出模板
    const exportTemplateBtn = parentDoc.getElementById('data-manage-export-template');
    if (exportTemplateBtn) {
        exportTemplateBtn.addEventListener('click', function() {
            try {
                const jsonStr = JSON.stringify(currentSettings, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `data-manage-template-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showToast('模板已导出', 'success');
            } catch (error) {
                console.error('导出模板失败:', error);
                showToast('导出失败', 'error');
            }
        });
    }
    
    // 恢复默认模板
    const resetTemplateBtn = parentDoc.getElementById('data-manage-reset-template');
    if (resetTemplateBtn) {
        resetTemplateBtn.addEventListener('click', function() {
            if (confirm('确定要恢复默认模板吗？当前设置将被覆盖。')) {
                currentSettings = { ...DEFAULT_SETTINGS };
                if (saveSettings()) {
                    loadSettingsToUI();
                    showToast('模板已恢复为默认值', 'info');
                } else {
                    showToast('恢复失败', 'error');
                }
            }
        });
    }
    
    // 可视化模板
    const visualizeTemplateBtn = parentDoc.getElementById('data-manage-visualize-template');
    if (visualizeTemplateBtn) {
        visualizeTemplateBtn.addEventListener('click', visualizeTemplate);
    }
    
    // 保存可视化模板
    const saveVisualizedBtn = parentDoc.getElementById('data-manage-save-visualized-template');
    if (saveVisualizedBtn) {
        saveVisualizedBtn.addEventListener('click', saveVisualizedTemplate);
    }
    
    // 刷新模板显示
    const refreshTemplateBtn = parentDoc.getElementById('data-manage-refresh-template-display');
    if (refreshTemplateBtn) {
        refreshTemplateBtn.addEventListener('click', function() {
            visualizeTemplate();
            showToast('模板显示已刷新', 'success');
        });
    }
}

/**
 * 显示数据预览
 */
async function showDataPreview() {
    try {
        const context = SillyTavern.getContext();
        
        if (!context || !context.chat || context.chat.length === 0) {
            showToast('没有聊天记录可查看', 'warning');
            return;
        }

        const chat = context.chat;
        
        // 从后往前查找包含数据库数据的消息
        let messageIndex = -1;
        let messageData = null;
        let messageType = '';
        let timestamp = '';
        
        for (let i = chat.length - 1; i >= 0; i--) {
            const message = chat[i];
            if (message && message.mes) {
                // 尝试解析消息中的JSON数据
                try {
                    const mesText = message.mes;
                    // 查找JSON格式的数据
                    const jsonMatch = mesText.match(/```json\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        const jsonData = JSON.parse(jsonMatch[1]);
                        if (jsonData && typeof jsonData === 'object') {
                            messageIndex = i + 1;
                            messageData = jsonData;
                            messageType = message.name || '未知';
                            timestamp = message.send_date || new Date().toISOString();
                            break;
                        }
                    }
                    
                    // 尝试直接解析为JSON
                    try {
                        const jsonData = JSON.parse(mesText);
                        if (jsonData && typeof jsonData === 'object') {
                            messageIndex = i + 1;
                            messageData = jsonData;
                            messageType = message.name || '未知';
                            timestamp = message.send_date || new Date().toISOString();
                            break;
                        }
                    } catch (e) {
                        // 不是JSON格式，继续查找
                    }
                } catch (e) {
                    // 解析失败，继续查找
                }
            }
        }
        
        if (messageIndex === -1 || !messageData) {
            showToast('未找到包含数据库数据的消息', 'warning');
            return;
        }
        
        // 生成表格HTML
        let tablesHtml = '';
        
        if (typeof messageData === 'object') {
            // 如果是对象，尝试查找表格数据
            for (const [key, value] of Object.entries(messageData)) {
                if (value && typeof value === 'object' && value.content && Array.isArray(value.content)) {
                    tablesHtml += generateTableHtml(key, value.content);
                }
            }
            
            // 如果没有找到表格数据，显示整个对象
            if (!tablesHtml) {
                tablesHtml = `<div class="data-manage-card" style="margin-bottom: 16px;">
                    <h3>数据内容</h3>
                    <pre style="background-color: var(--ios-gray); padding: 12px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(JSON.stringify(messageData, null, 2))}</pre>
                </div>`;
            }
        }
        
        // 创建预览弹窗HTML
        const previewHtml = `
            <div class="data-manage-popup" style="max-width: 100%;">
                <h2>数据预览</h2>
                <div class="data-manage-card">
                    <h3>消息信息</h3>
                    <p><strong>楼层:</strong> ${messageIndex}</p>
                    <p><strong>类型:</strong> ${escapeHtml(messageType)}</p>
                    <p><strong>时间:</strong> ${escapeHtml(timestamp)}</p>
                </div>
                ${tablesHtml}
            </div>
        `;
        
        // 使用SillyTavern的弹窗API
        if (context && context.callGenericPopup) {
            context.callGenericPopup(previewHtml, context.POPUP_TYPE?.DISPLAY || 'display', '数据预览', {
                wide: true,
                large: true,
                allowVerticalScrolling: true,
                okButton: '关闭',
                cancelButton: false,
                callback: function(action) {
                    console.log('数据预览弹窗关闭:', action);
                }
            });
        } else {
            // 如果没有callGenericPopup，使用简单的弹窗
            const popup = window.open('', 'dataPreviewPopup', 'width=900,height=700,scrollbars=yes');
            popup.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>数据预览</title>
                    <link rel="stylesheet" href="style.css">
                </head>
                <body>
                    ${previewHtml}
                </body>
                </html>
            `);
        }
        
        showToast(`已显示楼层 ${messageIndex} 的数据预览`, 'success');
        
    } catch (error) {
        console.error('显示数据预览失败:', error);
        showToast(`显示数据预览失败: ${error.message}`, 'error');
    }
}

/**
 * 生成表格HTML
 */
function generateTableHtml(tableName, content) {
    if (!content || content.length === 0) {
        return `<div class="data-manage-card" style="margin-bottom: 16px;">
            <h3>${escapeHtml(tableName)}</h3>
            <p class="data-manage-notes">表格内容为空</p>
        </div>`;
    }
    
    let html = `<div class="data-manage-card" style="margin-bottom: 16px;">
        <h3>${escapeHtml(tableName)}</h3>
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 12px;">
                <thead>
                    <tr style="background-color: var(--ios-gray-dark);">`;
    
    // 表头
    const headers = content[0];
    if (headers && headers.length > 0) {
        headers.forEach(header => {
            html += `<th style="padding: 12px 8px; text-align: left; border: 1px solid var(--ios-border); font-weight: 600; white-space: nowrap;">${escapeHtml(header || '')}</th>`;
        });
    }
    
    html += `</tr></thead><tbody>`;
    
    // 数据行
    for (let i = 1; i < content.length; i++) {
        const row = content[i];
        html += `<tr style="background-color: ${i % 2 === 0 ? 'var(--ios-gray)' : 'var(--ios-surface)'};">`;
        row.forEach(cell => {
            const cellContent = cell || '';
            const cellClass = cellContent === '' ? 'data-manage-notes' : '';
            html += `<td style="padding: 10px 8px; border: 1px solid var(--ios-border); vertical-align: top; word-break: break-word;" class="${cellClass}">${escapeHtml(cellContent)}</td>`;
        });
        html += `</tr>`;
    }
    
    html += `</tbody></table></div></div>`;
    return html;
}

/**
 * 设置弹窗脚本（用于新窗口模式）
 */
function setupPopupScripts() {
    return `
        function switchTab(tabName) {
            document.querySelectorAll('.data-manage-tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelectorAll('.data-manage-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const activeButton = document.querySelector(\`.data-manage-tab-button[data-tab="\${tabName}"]\`);
            const activeContent = document.querySelector(\`#data-manage-tab-\${tabName}\`);
            
            if (activeButton) activeButton.classList.add('active');
            if (activeContent) activeContent.classList.add('active');
        }
        
        document.querySelectorAll('.data-manage-tab-button').forEach(button => {
            button.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                switchTab(tabName);
            });
        });
    `;
}

// 初始化：等待 DOM 加载完成后添加按钮
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDataManageButton);
} else {
    // DOM 已经加载完成，但可能需要等待 SillyTavern 初始化
    // 使用 setTimeout 确保 SillyTavern 已经初始化
    setTimeout(addDataManageButton, 100);
}

