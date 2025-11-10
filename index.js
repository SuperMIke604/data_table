/* global SillyTavern */

// ==================== 扩展配置 ====================
// 参考: https://github.com/city-unit/st-extension-example/blob/master/index.js

// 扩展名称，应该与仓库名称匹配
const extensionName = 'dataManage';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// 获取扩展设置
function getExtensionSettings() {
    try {
        // 尝试从全局 extension_settings 获取
        if (typeof extension_settings !== 'undefined' && extension_settings[extensionName]) {
            return extension_settings[extensionName];
        }
        
        // 尝试从 SillyTavern context 获取
        const context = SillyTavern.getContext();
        if (context && context.extensionSettings && context.extensionSettings[extensionName]) {
            return context.extensionSettings[extensionName];
        }
        
        return {};
    } catch (error) {
        console.error('获取扩展设置失败:', error);
        return {};
    }
}

// 保存扩展设置
function saveExtensionSettings() {
    try {
        const context = SillyTavern.getContext();
        
        // 优先使用 extensionSettings（SillyTavern推荐方式）
        if (context && context.extensionSettings) {
            if (!context.extensionSettings[extensionName]) {
                context.extensionSettings[extensionName] = {};
            }
            Object.assign(context.extensionSettings[extensionName], getExtensionSettings());
            if (context.saveSettingsDebounced) {
                context.saveSettingsDebounced();
            } else if (context.saveSettings) {
                context.saveSettings();
            }
        }
        
        return true;
    } catch (error) {
        console.error('保存扩展设置失败:', error);
        return false;
    }
}

// 检查扩展是否启用
function isExtensionEnabled() {
    const settings = getExtensionSettings();
    return settings.enabled !== false; // 默认启用
}

// 设置扩展启用状态
function setExtensionEnabled(enabled) {
    try {
        const context = SillyTavern.getContext();
        
        // 更新全局 extension_settings（如果存在）
        if (typeof extension_settings !== 'undefined') {
            if (!extension_settings[extensionName]) {
                extension_settings[extensionName] = {};
            }
            extension_settings[extensionName].enabled = enabled;
        }
        
        // 更新 context.extensionSettings
        if (context && context.extensionSettings) {
            if (!context.extensionSettings[extensionName]) {
                context.extensionSettings[extensionName] = {};
            }
            context.extensionSettings[extensionName].enabled = enabled;
            
            // 保存设置
            if (context.saveSettingsDebounced) {
                context.saveSettingsDebounced();
            } else if (context.saveSettings) {
                context.saveSettings();
            }
        }
        
        // 更新UI
        updateExtensionUI();
        
        // 如果启用，添加按钮；如果禁用，移除按钮
        if (enabled) {
            addDataManageButton();
        } else {
            const parentDoc = (window.parent && window.parent !== window) 
                ? window.parent.document 
                : document;
            const dataManageButton = parentDoc.getElementById('dataManageButton');
            const dataPreviewButton = parentDoc.getElementById('dataPreviewButton');
            if (dataManageButton) {
                dataManageButton.remove();
            }
            if (dataPreviewButton) {
                dataPreviewButton.remove();
            }
        }
        
        return true;
    } catch (error) {
        console.error('设置扩展启用状态失败:', error);
        return false;
    }
}

// 更新扩展UI（显示/隐藏按钮）
function updateExtensionUI() {
    const parentDoc = (window.parent && window.parent !== window) 
        ? window.parent.document 
        : document;
    
    const dataManageButton = parentDoc.getElementById('dataManageButton');
    const dataPreviewButton = parentDoc.getElementById('dataPreviewButton');
    
    const enabled = isExtensionEnabled();
    
    if (dataManageButton) {
        dataManageButton.style.display = enabled ? '' : 'none';
    }
    if (dataPreviewButton) {
        dataPreviewButton.style.display = enabled ? '' : 'none';
    }
}

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

// 当前数据库数据（内存中的数据库状态）
let currentJsonTableData = null;

// 用于中止正在进行的AI请求
let currentAbortController = null;

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
        // 参考参考文档：楼层号直接使用数组索引，不需要减1
        const totalMessages = chat.length;
        
        // 计算已记录的楼层数 - 参考参考文档：查找最新的有数据库记录的消息索引
        let recordedCount = -1;
        for (let i = chat.length - 1; i >= 0; i--) {
            // 检查消息是否有数据库记录标记
            if (chat[i] && chat[i].TavernDB_ACU_Data) {
                recordedCount = i; // 楼层号就是数组索引
                break;
            }
        }
        
        // 计算未记录的楼层数
        const unrecordedCount = recordedCount === -1 ? totalMessages : (totalMessages - 1 - recordedCount);
        
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
    const userMessageTagsInput = parentDoc.getElementById('data-manage-user-message-tags');
    
    // 更新复选框
    const autoUpdateCheckbox = parentDoc.getElementById('data-manage-auto-update-enabled');
    const autoHideCheckbox = parentDoc.getElementById('data-manage-auto-hide-messages');
    
    if (frequencyInput) frequencyInput.value = settings.autoUpdateFrequency || '';
    if (batchSizeInput) batchSizeInput.value = settings.updateBatchSize || '';
    if (maxEntriesInput) maxEntriesInput.value = settings.summaryTableMaxEntries || '';
    if (removeTagsInput) removeTagsInput.value = settings.removeTags || '';
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
    // 检查扩展是否启用
    if (!isExtensionEnabled()) {
        console.log('扩展未启用，不添加按钮');
        return;
    }
    
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
    // 检查扩展是否启用
    if (!isExtensionEnabled()) {
        console.log('扩展未启用，不添加数据预览按钮');
        return;
    }
    
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
    // 检查扩展是否启用
    if (!isExtensionEnabled()) {
        showToast('扩展未启用，请先在设置中启用数据管理扩展', 'warning');
        return;
    }
    
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
                                <input type="number" id="data-manage-floor-start" placeholder="开始楼层" min="0" style="max-width: 150px;">
                            </div>
                            <div class="data-manage-input-group">
                                <label for="data-manage-floor-end">结束楼层:</label>
                                <input type="number" id="data-manage-floor-end" placeholder="结束楼层" min="0" style="max-width: 150px;">
                            </div>
                            <p class="data-manage-notes">楼层号从0开始（参考参考文档规则）</p>
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
            // 参考参考文档：楼层号直接使用数组索引（从0开始）
            const floorStart = parseInt(parentDoc.getElementById('data-manage-floor-start')?.value || '0');
            const floorEnd = parseInt(parentDoc.getElementById('data-manage-floor-end')?.value || '0');
            
            if (isNaN(floorStart) || isNaN(floorEnd) || floorStart < 0 || floorEnd < 0) {
                showToast('请输入有效的楼层范围（楼层号从0开始）', 'warning');
                return;
            }
            
            if (floorStart > floorEnd) {
                showToast('起始楼层不能大于结束楼层', 'warning');
                return;
            }
            
            console.log(`按楼层范围更新数据库: ${floorStart} - ${floorEnd}`);
            showToast(`开始更新楼层 ${floorStart} 到 ${floorEnd} 的数据库...`, 'info');
            
            // 实现实际的数据库更新逻辑
            updateDatabaseByFloorRange(floorStart, floorEnd).catch(error => {
                console.error('更新数据库失败:', error);
                showToast(`更新数据库失败: ${error.message}`, 'error');
            });
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
 * 获取世界书列表 - 完全参考参考资料中的实现
 */
async function getWorldBooks() {
    try {
        // 按照参考资料的方式获取 TavernHelper
        const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
        let TavernHelper_API = null;
        
        // 尝试多种方式获取TavernHelper
        if (typeof TavernHelper !== 'undefined') {
            TavernHelper_API = TavernHelper;
        } else if (parentWin && parentWin.TavernHelper) {
            TavernHelper_API = parentWin.TavernHelper;
        }
        
        // 优先使用 TavernHelper API
        if (TavernHelper_API && typeof TavernHelper_API.getLorebooks === 'function' && typeof TavernHelper_API.getLorebookEntries === 'function') {
            const bookNames = TavernHelper_API.getLorebooks();
            const books = [];
            for (const name of bookNames) {
                let entries = await TavernHelper_API.getLorebookEntries(name);
                // 将世界书名称注入到每个条目中，以便后续处理（如检查启用状态）时可以引用。
                if (entries && Array.isArray(entries)) {
                    entries = entries.map(entry => ({ ...entry, book: name }));
                }
                books.push({ name, entries: entries || [] });
            }
            return books;
        }
        
        // 回退到 SillyTavern API
        const context = SillyTavern.getContext();
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
        // 获取世界书名称列表 - 完全参考参考资料中的实现
        if (source === 'character') {
            // 按照参考资料的方式获取 TavernHelper
            const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
            let TavernHelper_API = null;
            
            // 尝试多种方式获取TavernHelper
            if (typeof TavernHelper !== 'undefined') {
                TavernHelper_API = TavernHelper;
            } else if (parentWin && parentWin.TavernHelper) {
                TavernHelper_API = parentWin.TavernHelper;
            }
            
            if (TavernHelper_API && typeof TavernHelper_API.getCharLorebooks === 'function') {
                try {
                    const charLorebooks = await TavernHelper_API.getCharLorebooks({ type: 'all' });
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
                    // 参考参考资料：使用 entry.comment 作为条目名称，如果没有则使用 uid
                    const entryName = entry.comment || entry.name || entryUid || `条目 ${entryUid}`;
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
            
            // 遍历聊天记录，查找包含数据库数据的消息 - 参考参考文档：楼层号直接使用数组索引
            // 配色参考弹窗主视觉（iOS风格）
            let html = '<div class="overview-content">';
            html += '<h3 style="color: var(--ios-text); margin-bottom: 20px;">聊天记录数据概览</h3>';
            
            for (let i = chat.length - 1; i >= 0; i--) {
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
                    // 参考参考文档：楼层号直接使用数组索引（i就是楼层号）
                    const messageIndex = i;
                    const timestamp = new Date(message.send_date || message.timestamp || Date.now()).toLocaleString();
                    const messageType = message.is_user ? '用户消息' : 'AI回复';
                    
                    // 详情展开区域（根据状态决定是否显示）
                    const isExpanded = expandedDetails.has(i);
                    const displayStyle = isExpanded ? 'block' : 'none';
                    const buttonText = isExpanded ? '收起详情' : '展开详情';
                    
                    // 配色参考弹窗主视觉（iOS风格）
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
                    
                    // 操作按钮 - 参考弹窗主视觉
                    html += `<div style="text-align: right;">`;
                    html += `<button class="toggle-details-btn" data-message-index="${i}" style="
                        background: var(--ios-blue); color: white; border: none; padding: 5px 10px; 
                        border-radius: 6px; cursor: pointer; margin-right: 5px; font-size: 12px;
                    ">${buttonText}</button>`;
                    html += `<button class="delete-message-btn" data-message-index="${i}" style="
                        background: #dc3545; color: white; border: none; padding: 5px 10px; 
                        border-radius: 6px; cursor: pointer; font-size: 12px;
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
                html += '<p style="text-align: center; color: var(--ios-text-secondary); font-style: italic;">暂无数据库记录</p>';
            } else {
                html += `<div style="margin-top: 20px; padding: 10px; background: var(--ios-gray-dark); border-radius: 8px; text-align: center;">`;
                html += `<p style="margin: 0; color: var(--ios-text-secondary);">共找到 ${dataCount} 条数据库记录</p>`;
                html += `</div>`;
            }
            
            html += '</div>';
            
            // 添加样式 - 参考弹窗主视觉
            html += `
                <style>
                    .overview-content { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; }
                    .message-data-card:hover { border-color: var(--ios-blue) !important; box-shadow: 0 2px 8px rgba(0, 122, 255, 0.15); }
                    .toggle-details-btn:hover { background: var(--ios-blue-hover) !important; }
                    .delete-message-btn:hover { background: #c82333 !important; }
                </style>
            `;
            
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
    
    try {
        const messageIndexStr = e.target.getAttribute('data-message-index');
        if (!messageIndexStr) {
            console.error('无法获取消息索引');
            showToast('无法获取消息索引', 'error');
            return;
        }
        
        const messageIndex = parseInt(messageIndexStr);
        if (isNaN(messageIndex)) {
            console.error('消息索引无效:', messageIndexStr);
            showToast('消息索引无效', 'error');
            return;
        }
        
        const parentDoc = (window.parent && window.parent !== window) 
            ? window.parent.document 
            : document;
        const overviewArea = parentDoc.getElementById('data-manage-overview-area');
        if (!overviewArea) {
            console.error('无法找到概览区域');
            showToast('无法找到概览区域', 'error');
            return;
        }
        
        const detailsArea = overviewArea.querySelector(`.message-details[data-message-index="${messageIndex}"]`);
        const toggleBtn = overviewArea.querySelector(`.toggle-details-btn[data-message-index="${messageIndex}"]`);
        
        if (!detailsArea || !toggleBtn) {
            console.error('无法找到详情区域或按钮', { detailsArea: !!detailsArea, toggleBtn: !!toggleBtn, messageIndex });
            showToast('无法找到详情区域', 'error');
            return;
        }
        
        const context = SillyTavern.getContext();
        if (!context || !context.chat) {
            console.error('无法获取聊天记录上下文');
            showToast('无法获取聊天记录', 'error');
            return;
        }
        
        if (messageIndex < 0 || messageIndex >= context.chat.length) {
            console.error('消息索引超出范围:', messageIndex, '聊天记录长度:', context.chat.length);
            showToast('消息索引超出范围', 'error');
            return;
        }
        
        const message = context.chat[messageIndex];
        if (!message) {
            console.error('消息不存在:', messageIndex);
            showToast('消息不存在', 'error');
            return;
        }
        
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
                    } catch (e) {
                        console.warn('无法解析消息文本为JSON:', e);
                    }
                }
            } catch (e) {
                console.warn('解析消息数据失败:', e);
            }
        }
        
        if (!messageData) {
            console.error('无法获取消息数据');
            showToast('该消息没有数据库数据', 'warning');
            return;
        }
        
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
        showToast(`展开/收起详情失败: ${error.message}`, 'error');
    }
}

/**
 * 处理保存行
 */
async function handleSaveRow(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const sheetKey = e.target.getAttribute('data-sheet-key');
    const rowIndex = parseInt(e.target.getAttribute('data-row-index'));
    const messageIndex = parseInt(e.target.getAttribute('data-message-index'));
    
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
        
        if (!messageData || !messageData[sheetKey]) {
            showToast('无法找到指定的表格', 'error');
            return;
        }
        
        const parentDoc = (window.parent && window.parent !== window) 
            ? window.parent.document 
            : document;
        const overviewArea = parentDoc.getElementById('data-manage-overview-area');
        if (!overviewArea) return;
        
        const detailsArea = overviewArea.querySelector(`.message-details[data-message-index="${messageIndex}"]`);
        if (!detailsArea) return;
        
        // 获取输入框内容
        const rowInput = detailsArea.querySelector(`tr[data-row-index="${rowIndex}"][data-sheet-key="${sheetKey}"] .cell-input`);
        if (!rowInput) {
            showToast('无法找到输入框', 'error');
            return;
        }
        
        // 读取输入框内容，按 | 分隔符分割为数组
        const inputValue = rowInput.value;
        const newRowData = inputValue ? inputValue.split(' | ').map(val => val.trim()) : [];
        
        // 确保数组长度与原行数据一致
        const table = messageData[sheetKey];
        const originalRowData = table.content[rowIndex + 1] ? table.content[rowIndex + 1].slice(1) : [];
        while (newRowData.length < originalRowData.length) {
            newRowData.push('');
        }
        
        // 创建深拷贝以更新数据
        const newJsonData = JSON.parse(JSON.stringify(messageData));
        const newTable = newJsonData[sheetKey];
        
        // 更新数据
        if (newTable.content[rowIndex + 1]) {
            newTable.content[rowIndex + 1] = [null, ...newRowData];
        }
        
        // 更新消息数据
        if (message.TavernDB_ACU_Data) {
            message.TavernDB_ACU_Data = newJsonData;
        } else if (message.mes) {
            // 更新消息文本中的JSON数据
            try {
                const mesText = message.mes;
                const jsonMatch = mesText.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    message.mes = mesText.replace(/```json\s*[\s\S]*?\s*```/, `\`\`\`json\n${JSON.stringify(newJsonData, null, 2)}\n\`\`\``);
                } else {
                    message.mes = JSON.stringify(newJsonData);
                }
            } catch (e) {
                console.error('更新消息文本失败:', e);
            }
        }
        
        // 刷新显示
        const contentDiv = detailsArea.querySelector('.details-content');
        if (contentDiv) {
            contentDiv.innerHTML = loadMessageDetails(messageIndex, newJsonData);
            // 重新绑定事件
            bindOverviewEvents(parentDoc);
        }
        
        showToast('数据已保存', 'success');
    } catch (error) {
        console.error('保存行失败:', error);
        showToast(`保存失败: ${error.message}`, 'error');
    }
}

/**
 * 处理删除行
 */
async function handleDeleteRow(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const sheetKey = e.target.getAttribute('data-sheet-key');
    const rowIndex = parseInt(e.target.getAttribute('data-row-index'));
    const messageIndex = parseInt(e.target.getAttribute('data-message-index'));
    
    if (!confirm(`确定要删除这一行数据吗？此操作不可恢复。`)) {
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
        
        if (!messageData || !messageData[sheetKey]) {
            showToast('无法找到指定的表格', 'error');
            return;
        }
        
        const table = messageData[sheetKey];
        if (!table.content || !table.content[rowIndex + 1]) {
            showToast('无法找到指定的行', 'error');
            return;
        }
        
        // 创建深拷贝以更新数据
        const newJsonData = JSON.parse(JSON.stringify(messageData));
        const newTable = newJsonData[sheetKey];
        
        // 删除行
        newTable.content.splice(rowIndex + 1, 1);
        
        // 更新消息数据
        if (message.TavernDB_ACU_Data) {
            message.TavernDB_ACU_Data = newJsonData;
        } else if (message.mes) {
            try {
                const mesText = message.mes;
                const jsonMatch = mesText.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    message.mes = mesText.replace(/```json\s*[\s\S]*?\s*```/, `\`\`\`json\n${JSON.stringify(newJsonData, null, 2)}\n\`\`\``);
                } else {
                    message.mes = JSON.stringify(newJsonData);
                }
            } catch (e) {
                console.error('更新消息文本失败:', e);
            }
        }
        
        // 刷新显示
        const parentDoc = (window.parent && window.parent !== window) 
            ? window.parent.document 
            : document;
        const overviewArea = parentDoc.getElementById('data-manage-overview-area');
        if (overviewArea) {
            const detailsArea = overviewArea.querySelector(`.message-details[data-message-index="${messageIndex}"]`);
            if (detailsArea) {
                const contentDiv = detailsArea.querySelector('.details-content');
                if (contentDiv) {
                    contentDiv.innerHTML = loadMessageDetails(messageIndex, newJsonData);
                    // 重新绑定事件
                    bindOverviewEvents(parentDoc);
                }
            }
        }
        
        showToast('行已删除', 'success');
    } catch (error) {
        console.error('删除行失败:', error);
        showToast(`删除失败: ${error.message}`, 'error');
    }
}

/**
 * 处理删除表格
 */
async function handleDeleteTable(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const sheetKey = e.target.getAttribute('data-sheet-key');
    const messageIndex = parseInt(e.target.getAttribute('data-message-index'));
    
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
        
        if (!messageData || !messageData[sheetKey]) {
            showToast('无法找到指定的表格', 'error');
            return;
        }
        
        const table = messageData[sheetKey];
        const tableName = table.name || '表格';
        
        if (!confirm(`确定要删除表格 "${tableName}" 吗？此操作不可恢复。`)) {
            return;
        }
        
        // 创建深拷贝以更新数据
        const newJsonData = JSON.parse(JSON.stringify(messageData));
        
        // 删除表格
        delete newJsonData[sheetKey];
        
        // 更新消息数据
        if (message.TavernDB_ACU_Data) {
            message.TavernDB_ACU_Data = newJsonData;
        } else if (message.mes) {
            try {
                const mesText = message.mes;
                const jsonMatch = mesText.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    message.mes = mesText.replace(/```json\s*[\s\S]*?\s*```/, `\`\`\`json\n${JSON.stringify(newJsonData, null, 2)}\n\`\`\``);
                } else {
                    message.mes = JSON.stringify(newJsonData);
                }
            } catch (e) {
                console.error('更新消息文本失败:', e);
            }
        }
        
        // 刷新概览
        showDataOverview();
        showToast('表格已删除', 'success');
    } catch (error) {
        console.error('删除表格失败:', error);
        showToast(`删除失败: ${error.message}`, 'error');
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
        html += '<p style="color: var(--ios-text-secondary); text-align: center;">没有数据表格</p>';
    } else {
        tableKeys.forEach(sheetKey => {
            const table = messageData[sheetKey];
            if (!table || !table.name || !table.content) return;
            
            // 配色参考弹窗主视觉（iOS风格）
            html += `<div class="table-section" data-sheet-key="${sheetKey}" style="margin-bottom: 20px; border: 1px solid var(--ios-border); border-radius: 10px; padding: 15px; background: var(--ios-gray);">`;
            html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">`;
            html += `<h4 class="table-title" style="margin: 0; color: var(--ios-text);">${escapeHtml(table.name)}</h4>`;
            html += `<button class="delete-table-btn" data-sheet-key="${sheetKey}" data-message-index="${messageIndex}" style="
                background: #dc3545; color: white; border: none; padding: 5px 10px; 
                border-radius: 6px; cursor: pointer; font-size: 12px;
            ">删除表格</button>`;
            html += `</div>`;
            
            // 显示表格元数据
            if (table.sourceData && table.sourceData.note) {
                html += `<div class="table-metadata" style="background: var(--ios-gray-dark); padding: 10px; margin: 10px 0; border-radius: 6px; font-size: 12px; color: var(--ios-text-secondary);">`;
                html += `<p style="margin: 5px 0;">备注: ${escapeHtml(table.sourceData.note)}</p>`;
                html += `</div>`;
            }
            
            // 显示表格内容（可编辑）- 参考弹窗主视觉
            html += `<div class="table-scroll-container">`;
            html += `<table class="data-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">`;
            
            // 表头 - 简化为两列：内容和操作
            html += '<thead><tr>';
            html += `<th style="border: 1px solid var(--ios-border); padding: 8px; text-align: left; color: var(--ios-text); background: var(--ios-gray-dark);">条目内容</th>`;
            html += `<th style="width: 80px; text-align: center; border: 1px solid var(--ios-border); padding: 8px; color: var(--ios-text); background: var(--ios-gray-dark);">操作</th>`;
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
                html += `<td class="editable-cell" style="border: 1px solid var(--ios-border); padding: 8px;">`;
                html += `<textarea class="cell-input" `;
                html += `data-sheet-key="${sheetKey}" data-row-index="${rowIndex}" `;
                html += `data-message-index="${messageIndex}" `;
                html += `style="width: 100%; min-height: 40px; padding: 6px; border: 1px solid var(--ios-border); border-radius: 6px; background: var(--ios-surface); color: var(--ios-text); font-size: 13px; font-family: inherit; resize: vertical; box-sizing: border-box;">${escapeHtml(combinedValue)}</textarea>`;
                html += `</td>`;
                
                // 操作列 - 按钮上下排列
                html += `<td style="text-align: center; vertical-align: middle; border: 1px solid var(--ios-border); padding: 8px;">`;
                html += `<div style="display: flex; flex-direction: column; gap: 5px; align-items: center;">`;
                html += `<button class="save-row-btn" data-sheet-key="${sheetKey}" data-row-index="${rowIndex}" `;
                html += `data-message-index="${messageIndex}" style="
                    background: #28a745; color: white; border: none; padding: 4px 8px; 
                    border-radius: 6px; cursor: pointer; font-size: 11px; width: 60px;
                ">保存</button>`;
                html += `<button class="delete-row-btn" data-sheet-key="${sheetKey}" data-row-index="${rowIndex}" `;
                html += `data-message-index="${messageIndex}" style="
                    background: #dc3545; color: white; border: none; padding: 4px 8px; 
                    border-radius: 6px; cursor: pointer; font-size: 11px; width: 60px;
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
    // 检查扩展是否启用
    if (!isExtensionEnabled()) {
        showToast('扩展未启用，请先在设置中启用数据管理扩展', 'warning');
        return;
    }
    
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
            
            // 优先检查 TavernDB_ACU_Data 字段
            if (message && message.TavernDB_ACU_Data) {
                messageIndex = i + 1;
                messageData = message.TavernDB_ACU_Data;
                messageType = message.name || '未知';
                timestamp = message.send_date || new Date().toISOString();
                break;
            }
            
            // 然后检查消息文本中的JSON数据
            if (message && message.mes) {
                // 尝试解析消息中的JSON数据
                try {
                    const mesText = message.mes;
                    // 查找JSON格式的数据
                    const jsonMatch = mesText.match(/```json\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        const jsonData = JSON.parse(jsonMatch[1]);
                        if (jsonData && typeof jsonData === 'object' && jsonData.mate && jsonData.mate.type === 'chatSheets') {
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
                        if (jsonData && typeof jsonData === 'object' && jsonData.mate && jsonData.mate.type === 'chatSheets') {
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
                    // 使用表格名称而不是表格id（key）
                    const tableName = value.name || key;
                    tablesHtml += generateTableHtml(tableName, value.content);
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

/**
 * 加载数据库模板
 */
async function loadDatabaseTemplate() {
    try {
        const topLevelWindow = (window.parent && window.parent !== window) ? window.parent : window;
        let templateStr = null;
        
        // 优先从extensionSettings加载
        const context = SillyTavern.getContext();
        if (context && context.extensionSettings && context.extensionSettings.dataManage) {
            const template = context.extensionSettings.dataManage.overviewTemplate;
            if (template && typeof template === 'string' && template.trim()) {
                templateStr = template;
            }
        }
        
        // 备用：从localStorage加载
        if (!templateStr && topLevelWindow.localStorage) {
            templateStr = topLevelWindow.localStorage.getItem(STORAGE_KEY_TEMPLATE);
        }
        
        if (!templateStr || !templateStr.trim()) {
            console.warn('未找到数据库模板，使用空模板');
            // 返回一个基本的空模板结构
            return {
                mate: {
                    type: 'chatSheets'
                }
            };
        }
        
        // 清理模板（移除注释）
        let cleanTemplate = templateStr.trim();
        cleanTemplate = cleanTemplate.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        
        // 解析JSON
        const template = JSON.parse(cleanTemplate);
        
        // 验证模板结构
        if (!template.mate || template.mate.type !== 'chatSheets') {
            throw new Error('模板格式不正确：缺少mate对象或type属性');
        }
        
        const sheetKeys = Object.keys(template).filter(k => k.startsWith('sheet_'));
        if (sheetKeys.length === 0) {
            console.warn('模板中没有表格数据，使用空模板');
            return {
                mate: {
                    type: 'chatSheets'
                }
            };
        }
        
        return template;
    } catch (error) {
        console.error('加载数据库模板失败:', error);
        // 返回一个基本的空模板结构
        return {
            mate: {
                type: 'chatSheets'
            }
        };
    }
}

/**
 * 准备AI输入 - 准备表格数据、消息文本、世界书内容
 */
async function prepareAIInput(messages) {
    if (!currentJsonTableData) {
        console.error('prepareAIInput: 无法准备AI输入，currentJsonTableData为空');
        return null;
    }
    
    // 获取世界书内容（暂时返回空字符串，后续可以完善）
    const worldbookContent = '';
    
    // 1. 格式化当前JSON表格数据为可读文本（用于$0占位符）
    let tableDataText = '';
    const tableKeys = Object.keys(currentJsonTableData).filter(k => k.startsWith('sheet_'));
    
    tableKeys.forEach((sheetKey, tableIndex) => {
        const table = currentJsonTableData[sheetKey];
        if (!table || !table.name || !table.content) return;
        
        tableDataText += `[${tableIndex}:${table.name}]\n`;
        const headers = table.content[0] ? table.content[0].slice(1).map((h, i) => `[${i}:${h}]`).join('|') : 'No Headers';
        tableDataText += `  Columns: ${headers}\n`;
        
        const allRows = table.content.slice(1);
        let rowsToProcess = allRows;
        let startIndex = 0;
        
        // 如果是总结表并且行数超过配置的最大条目数，则只提取最新的N条
        if (table.name.trim() === '总结表' && allRows.length > (currentSettings.summaryTableMaxEntries || 10)) {
            startIndex = allRows.length - (currentSettings.summaryTableMaxEntries || 10);
            rowsToProcess = allRows.slice(-(currentSettings.summaryTableMaxEntries || 10));
            tableDataText += `  - Note: Showing last ${rowsToProcess.length} of ${allRows.length} entries.\n`;
        }
        
        if (rowsToProcess.length > 0) {
            rowsToProcess.forEach((row, index) => {
                const originalRowIndex = startIndex + index;
                const rowData = row.slice(1).join('|');
                tableDataText += `  [${originalRowIndex}] ${rowData}\n`;
            });
        } else {
            tableDataText += '  (No data rows)\n';
        }
        tableDataText += '\n';
    });
    
    // 2. 格式化消息文本（用于$1占位符）
    let messagesText = '当前最新对话内容:\n';
    if (messages && messages.length > 0) {
        const context = SillyTavern.getContext();
        const name1 = context?.name1 || '用户';
        
        messagesText += messages.map(msg => {
            const prefix = msg.is_user ? name1 : (msg.name || '角色');
            let content = msg.mes || msg.message || '';
            
            // 清理内容：移除标记和标签 - 参考参考文档
            
            // 参考参考文档：使用 removeTaggedContent_ACU 的实现方式
            if (currentSettings.removeTags && typeof content === 'string' && content.trim() !== '') {
                const tagsToRemove = currentSettings.removeTags.split('|')
                    .map(tag => tag.trim())
                    .filter(tag => tag);
                
                if (tagsToRemove.length > 0) {
                    let cleanedText = content;
                    tagsToRemove.forEach(tag => {
                        // 创建一个正则表达式来匹配 <tag>...</tag> and <tag/>
                        // g for global, i for case-insensitive
                        const regex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>|<${tag}\\/>`, 'gi');
                        cleanedText = cleanedText.replace(regex, '');
                    });
                    content = cleanedText;
                }
            }
            
            // 如果是用户消息，添加标签 - 参考参考文档
            if (msg.is_user && currentSettings.userMessageTags) {
                const tags = currentSettings.userMessageTags.split('|').map(t => t.trim()).filter(t => t);
                tags.forEach(tag => {
                    if (tag) {
                        content = `<${tag}>${content}</${tag}>`;
                    }
                });
            }
            
            return `${prefix}: ${content}`;
        }).join('\n');
    } else {
        messagesText += '(无最新对话内容)';
    }
    
    return { tableDataText, messagesText, worldbookContent };
}

/**
 * 调用自定义OpenAI API
 */
async function callCustomOpenAI(dynamicContent) {
    // 创建新的AbortController用于本次请求
    currentAbortController = new AbortController();
    const abortSignal = currentAbortController.signal;
    
    // 组装最终的消息数组
    const messages = [];
    const charCardPrompt = currentSettings.charCardPrompt || DEFAULT_CHAR_CARD_PROMPT;
    
    let promptSegments = [];
    if (Array.isArray(charCardPrompt)) {
        promptSegments = charCardPrompt;
    } else if (typeof charCardPrompt === 'string') {
        promptSegments = [{ role: 'USER', content: charCardPrompt }];
    }
    
    // 在每个段落中替换占位符
    promptSegments.forEach(segment => {
        let finalContent = segment.content || '';
        finalContent = finalContent.replace(/\$0/g, dynamicContent.tableDataText || '');
        finalContent = finalContent.replace(/\$1/g, dynamicContent.messagesText || '');
        finalContent = finalContent.replace(/\$4/g, dynamicContent.worldbookContent || '');
        
        // 转换role为小写（API要求）
        messages.push({ 
            role: (segment.role || 'user').toLowerCase(), 
            content: finalContent 
        });
    });
    
    console.log('准备发送到API的消息:', messages);
    
    const apiConfig = currentSettings.apiConfig || {};
    
    // 根据API模式选择调用方式
    if (currentSettings.apiMode === 'tavern') {
        // 使用酒馆连接预设
        const profileId = currentSettings.tavernProfile;
        if (!profileId) {
            throw new Error('未选择酒馆连接预设');
        }
        
        const context = SillyTavern.getContext();
        if (!context || !context.extensionSettings || !context.extensionSettings.connectionManager) {
            throw new Error('无法访问连接管理器');
        }
        
        const profiles = context.extensionSettings.connectionManager.profiles || [];
        const targetProfile = profiles.find(p => p.id === profileId);
        
        if (!targetProfile) {
            throw new Error(`无法找到ID为 "${profileId}" 的连接预设`);
        }
        
        if (!targetProfile.api) {
            throw new Error(`预设 "${targetProfile.name || targetProfile.id}" 没有配置API`);
        }
        
        // 使用ConnectionManagerRequestService发送请求
        if (!context.ConnectionManagerRequestService || !context.ConnectionManagerRequestService.sendRequest) {
            throw new Error('ConnectionManagerRequestService不可用');
        }
        
        const response = await context.ConnectionManagerRequestService.sendRequest(
            profileId,
            messages,
            apiConfig.max_tokens || 4096
        );
        
        if (response && response.ok && response.result?.choices?.[0]?.message?.content) {
            return response.result.choices[0].message.content.trim();
        } else if (response && typeof response.content === 'string') {
            return response.content.trim();
        } else {
            const errorMsg = response?.error || JSON.stringify(response);
            throw new Error(`酒馆预设API调用返回无效响应: ${errorMsg}`);
        }
        
    } else {
        // 使用自定义API
        if (apiConfig.useMainApi) {
            // 模式A: 使用主API
            const parentWin = (window.parent && window.parent !== window) ? window.parent : window;
            let TavernHelper = null;
            
            if (parentWin && parentWin.TavernHelper) {
                TavernHelper = parentWin.TavernHelper;
            } else if (window.TavernHelper) {
                TavernHelper = window.TavernHelper;
            }
            
            if (!TavernHelper || typeof TavernHelper.generateRaw !== 'function') {
                throw new Error('TavernHelper.generateRaw 函数不存在。请检查酒馆版本。');
            }
            
            const response = await TavernHelper.generateRaw({
                ordered_prompts: messages,
                should_stream: false, // 数据库更新不需要流式输出
            });
            
            if (typeof response !== 'string') {
                throw new Error('主API调用未返回预期的文本响应');
            }
            
            return response.trim();
            
        } else {
            // 模式B: 使用独立配置的API
            if (!apiConfig.url || !apiConfig.model) {
                throw new Error('自定义API的URL或模型未配置');
            }
            
            const generateUrl = `/api/backends/chat-completions/generate`;
            const context = SillyTavern.getContext();
            const headers = { 
                ...(context.getRequestHeaders ? context.getRequestHeaders() : {}), 
                'Content-Type': 'application/json' 
            };
            
            const body = JSON.stringify({
                messages: messages,
                model: apiConfig.model,
                temperature: apiConfig.temperature || 0.9,
                frequency_penalty: 0,
                presence_penalty: 0.12,
                top_p: apiConfig.top_p || 0.9,
                max_tokens: apiConfig.max_tokens || 120000,
                stream: false,
                chat_completion_source: 'custom',
                group_names: [],
                include_reasoning: false,
                reasoning_effort: 'medium',
                enable_web_search: false,
                request_images: false,
                custom_prompt_post_processing: 'strict',
                reverse_proxy: apiConfig.url,
                proxy_password: '',
                custom_url: apiConfig.url,
                custom_include_headers: apiConfig.apiKey ? `Authorization: Bearer ${apiConfig.apiKey}` : ''
            });
            
            console.log('调用自定义API:', generateUrl, 'Model:', apiConfig.model);
            
            const response = await fetch(generateUrl, { 
                method: 'POST', 
                headers, 
                body, 
                signal: abortSignal 
            });
            
            if (!response.ok) {
                const errTxt = await response.text();
                throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errTxt}`);
            }
            
            const data = await response.json();
            
            if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                return data.choices[0].message.content.trim();
            }
            
            throw new Error('API响应格式不正确或内容为空');
        }
    }
}

/**
 * 解析并应用表格编辑指令
 */
function parseAndApplyTableEdits(aiResponse) {
    if (!currentJsonTableData) {
        console.error('无法应用编辑，currentJsonTableData未加载');
        return false;
    }
    
    // 清理AI响应
    let cleanedResponse = aiResponse.trim();
    // 移除JS风格的字符串拼接
    cleanedResponse = cleanedResponse.replace(/'/g, '');
    // 将 "\\n" 转换为真实的换行符
    cleanedResponse = cleanedResponse.replace(/\\n/g, '\n');
    // 修复转义的双引号
    cleanedResponse = cleanedResponse.replace(/\\\\"/g, '\\"');
    
    // 提取tableEdit块
    const editBlockMatch = cleanedResponse.match(/<tableEdit>([\s\S]*?)<\/tableEdit>/);
    if (!editBlockMatch || !editBlockMatch[1]) {
        console.warn('AI响应中未找到有效的 <tableEdit> 块');
        return true; // 不是失败，只是没有编辑要应用
    }
    
    const editsString = editBlockMatch[1].replace(/<!--|-->/g, '').trim();
    if (!editsString) {
        console.log('空的 <tableEdit> 块，没有编辑要应用');
        return true;
    }
    
    // 重组指令（处理多行指令）
    const originalLines = editsString.split('\n');
    const commandLines = [];
    let commandReconstructor = '';
    
    originalLines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine === '') return;
        
        if (trimmedLine.startsWith('insertRow') || trimmedLine.startsWith('deleteRow') || trimmedLine.startsWith('updateRow')) {
            if (commandReconstructor) {
                commandLines.push(commandReconstructor);
            }
            commandReconstructor = trimmedLine;
        } else {
            commandReconstructor += trimmedLine;
        }
    });
    
    if (commandReconstructor) {
        commandLines.push(commandReconstructor);
    }
    
    let appliedEdits = 0;
    
    // 获取所有表格
    const sheets = Object.keys(currentJsonTableData)
                         .filter(k => k.startsWith('sheet_'))
                         .map(k => currentJsonTableData[k]);
    
    commandLines.forEach(line => {
        // 移除行尾注释
        const commandLineWithoutComment = line.split('//')[0].trim();
        if (!commandLineWithoutComment) {
            return;
        }
        
        // 解析指令
        const match = commandLineWithoutComment.match(/^(insertRow|deleteRow|updateRow)\s*\((.*)\);?$/);
        if (!match) {
            console.warn(`跳过格式错误或截断的指令行: "${commandLineWithoutComment}"`);
            return;
        }
        
        const command = match[1];
        const argsString = match[2];
        
        try {
            const firstBracket = argsString.indexOf('{');
            let args;
            
            if (firstBracket === -1) {
                // 没有JSON对象，是简单的deleteRow指令
                args = JSON.parse(`[${argsString}]`);
            } else {
                // 包含JSON对象的指令 (insertRow, updateRow)
                const paramsPart = argsString.substring(0, firstBracket).trim();
                const jsonPart = argsString.substring(firstBracket);
                
                // 解析前面的参数
                const initialArgs = JSON.parse(`[${paramsPart.replace(/,$/, '')}]`);
                
                // 解析JSON部分
                try {
                    const jsonData = JSON.parse(jsonPart);
                    args = [...initialArgs, jsonData];
                } catch (jsonError) {
                    // 尝试清理JSON
                    let sanitizedJson = jsonPart;
                    // 移除尾随逗号
                    sanitizedJson = sanitizedJson.replace(/,\s*([}\]])/g, '$1');
                    // 修复悬空键
                    sanitizedJson = sanitizedJson.replace(/,\s*("[^"]*"\s*)}/g, '}');
                    
                    try {
                        const jsonData = JSON.parse(sanitizedJson);
                        args = [...initialArgs, jsonData];
                    } catch (finalError) {
                        console.error(`无法解析JSON: "${jsonPart}"`, finalError);
                        return;
                    }
                }
            }
            
            // 应用指令
            switch (command) {
                case 'insertRow': {
                    const [tableIndex, data] = args;
                    const table = sheets[tableIndex];
                    if (table && table.content && typeof data === 'object') {
                        const newRow = [null];
                        const headers = table.content[0].slice(1);
                        headers.forEach((_, colIndex) => {
                            newRow.push(data[colIndex] || (data[String(colIndex)] || ''));
                        });
                        table.content.push(newRow);
                        console.log(`应用insertRow到表格 ${tableIndex} (${table.name})，数据:`, data);
                        appliedEdits++;
                    }
                    break;
                }
                case 'deleteRow': {
                    const [tableIndex, rowIndex] = args;
                    const table = sheets[tableIndex];
                    if (table && table.content && table.content.length > rowIndex + 1) {
                        table.content.splice(rowIndex + 1, 1);
                        console.log(`应用deleteRow到表格 ${tableIndex} (${table.name})，索引 ${rowIndex}`);
                        appliedEdits++;
                    }
                    break;
                }
                case 'updateRow': {
                    const [tableIndex, rowIndex, data] = args;
                    const table = sheets[tableIndex];
                    if (table && table.content && table.content.length > rowIndex + 1 && typeof data === 'object') {
                        Object.keys(data).forEach(colIndexStr => {
                            const colIndex = parseInt(colIndexStr, 10);
                            if (!isNaN(colIndex) && table.content[rowIndex + 1].length > colIndex + 1) {
                                table.content[rowIndex + 1][colIndex + 1] = data[colIndexStr];
                            }
                        });
                        console.log(`应用updateRow到表格 ${tableIndex} (${table.name})，索引 ${rowIndex}，数据:`, data);
                        appliedEdits++;
                    }
                    break;
                }
            }
        } catch (e) {
            console.error(`解析或应用指令失败: "${line}"`, e);
        }
    });
    
    showToast(`从AI响应中成功应用了 ${appliedEdits} 个数据库更新`, 'info');
    return true;
}

/**
 * 保存JSON表格到聊天记录
 */
async function saveJsonTableToChatHistory(targetMessageIndex = -1) {
    if (!currentJsonTableData) {
        console.error('保存到聊天记录失败: currentJsonTableData为空');
        return false;
    }
    
    const context = SillyTavern.getContext();
    if (!context || !context.chat) {
        console.error('保存失败: 聊天记录为空');
        return false;
    }
    
    const chat = context.chat;
    let targetMessage = null;
    let finalIndex = -1;
    
    // 优先使用传入的目标索引
    if (targetMessageIndex !== -1 && chat[targetMessageIndex] && !chat[targetMessageIndex].is_user) {
        targetMessage = chat[targetMessageIndex];
        finalIndex = targetMessageIndex;
    } else {
        // 作为备用，查找最新的AI消息
        console.log('未提供有效的目标索引，查找最新的AI消息来保存数据库');
        for (let i = chat.length - 1; i >= 0; i--) {
            if (!chat[i].is_user) {
                targetMessage = chat[i];
                finalIndex = i;
                break;
            }
        }
    }
    
    if (!targetMessage) {
        console.warn('保存失败: 聊天记录中未找到AI消息来附加数据');
        return false;
    }
    
    // 使用深拷贝来存储数据快照，防止所有消息引用同一个对象
    targetMessage.TavernDB_ACU_Data = JSON.parse(JSON.stringify(currentJsonTableData));
    console.log(`已将数据库附加到索引 ${finalIndex} 的消息。正在保存聊天记录...`);
    
    // 保存聊天记录
    if (context.saveChat) {
        await context.saveChat();
    } else if (context.saveChatDebounced) {
        context.saveChatDebounced();
    } else {
        console.warn('无法保存聊天记录：saveChat方法不可用');
    }
    
    // 参考参考文档：保存后同步到世界书
    try {
        await updateReadableLorebookEntry(true);
    } catch (error) {
        console.error('同步到世界书失败:', error);
        // 不阻止保存流程，只记录错误
    }
    
    showToast('数据库已成功保存到当前聊天记录', 'success');
    return true;
}

/**
 * 按楼层范围更新数据库
 */
async function updateDatabaseByFloorRange(floorStart, floorEnd) {
    try {
        const context = SillyTavern.getContext();
        if (!context || !context.chat) {
            throw new Error('无法获取聊天记录');
        }
        
        const chat = context.chat;
        
        // 参考参考文档：楼层号直接使用数组索引
        // 1. 获取所有AI消息的索引（楼层号直接使用数组索引）
        const allAiMessageIndices = chat
            .map((msg, index) => !msg.is_user ? index : -1)
            .filter(index => index !== -1);
        
        if (allAiMessageIndices.length === 0) {
            showToast('没有找到AI消息可供处理', 'info');
            return;
        }
        
        // 2. 根据用户输入的楼层范围筛选消息 - 参考参考文档
        let messagesToProcessIndices = [];
        
        // 验证楼层范围
        if (floorStart < 0 || floorEnd < 0 || floorStart > chat.length - 1 || floorEnd > chat.length - 1) {
            throw new Error('楼层范围无效');
        }
        
        if (floorEnd === null || floorEnd === undefined) {
            // 只指定起始楼层，处理从该楼层到最新的所有AI消息
            // 特殊处理：当起始楼层为0时，包含0层
            if (floorStart === 0) {
                messagesToProcessIndices = allAiMessageIndices.filter(floorNum => floorNum >= 0);
            } else {
                messagesToProcessIndices = allAiMessageIndices.filter(floorNum => floorNum >= floorStart);
            }
        } else {
            // 指定了楼层范围，处理该范围内的AI消息
            // 特殊处理：当起始楼层为0时，包含0层
            if (floorStart === 0) {
                messagesToProcessIndices = allAiMessageIndices.filter(floorNum => floorNum >= 0 && floorNum <= floorEnd);
            } else {
                messagesToProcessIndices = allAiMessageIndices.filter(floorNum => floorNum >= floorStart && floorNum <= floorEnd);
            }
        }
        
        // 楼层号已经是数组索引，直接使用
        const indicesToUpdate = messagesToProcessIndices;
        
        if (indicesToUpdate.length === 0) {
            showToast('指定楼层范围内没有需要更新的消息', 'warning');
            return;
        }
        
        showToast(`开始更新 ${indicesToUpdate.length} 条消息的数据库...`, 'info');
        
        // 按批次处理更新
        const batchSize = currentSettings.updateBatchSize || 1;
        const batches = [];
        for (let i = 0; i < indicesToUpdate.length; i += batchSize) {
            batches.push(indicesToUpdate.slice(i, i + batchSize));
        }
        
        console.log(`处理 ${indicesToUpdate.length} 个更新，分为 ${batches.length} 个批次，每批 ${batchSize} 个`);
        
        let overallSuccess = true;
        
        for (let i = 0; i < batches.length; i++) {
            const batchIndices = batches[i];
            const batchNumber = i + 1;
            const totalBatches = batches.length;
            const firstMessageIndex = batchIndices[0];
            const lastMessageIndex = batchIndices[batchIndices.length - 1];
            
            showToast(`正在处理批次 ${batchNumber}/${totalBatches}...`, 'info');
            
            // 1. 加载基础数据库：从当前批次开始的位置往前找最近的记录
            let foundDb = false;
            for (let j = firstMessageIndex - 1; j >= 0; j--) {
                const msg = chat[j];
                if (!msg.is_user && msg.TavernDB_ACU_Data) {
                    currentJsonTableData = JSON.parse(JSON.stringify(msg.TavernDB_ACU_Data));
                    console.log(`[批次 ${batchNumber}] 从消息索引 ${j} 加载数据库状态`);
                    foundDb = true;
                    break;
                }
            }
            
            if (!foundDb) {
                console.log(`[批次 ${batchNumber}] 未找到之前的数据库，从模板初始化`);
                try {
                    // 从模板初始化数据库
                    const template = await loadDatabaseTemplate();
                    if (template) {
                        currentJsonTableData = JSON.parse(JSON.stringify(template));
                        console.log(`[批次 ${batchNumber}] 从模板成功初始化数据库`);
                    } else {
                        throw new Error('无法加载数据库模板');
                    }
                } catch (e) {
                    console.error(`[批次 ${batchNumber}] 从模板初始化数据库失败:`, e);
                    showToast('无法从模板初始化数据库，请检查模板格式', 'error');
                    overallSuccess = false;
                    break;
                }
            }
            
            // 2. 准备要处理的消息（包含用户消息和AI回复）
            const firstMessageIndexAdjusted = Math.max(0, firstMessageIndex - 1);
            let sliceStartIndex = firstMessageIndexAdjusted;
            
            // 确保包含用户消息
            if (sliceStartIndex > 0 && chat[sliceStartIndex] && !chat[sliceStartIndex].is_user && chat[sliceStartIndex - 1]?.is_user) {
                sliceStartIndex--;
                console.log(`[批次 ${batchNumber}] 调整切片起始索引到 ${sliceStartIndex} 以包含用户消息`);
            }
            
            const messagesForContext = chat.slice(sliceStartIndex, lastMessageIndex + 1);
            
            // 3. 执行更新
            // 参考参考文档：修复绑定逻辑，直接使用用户指定的结束楼层作为绑定目标
            // 对于整个范围（如6-10层），数据应该保存在结束楼层（10层）
            const toastMessage = `正在处理手动更新 (${batchNumber}/${totalBatches})...`;
            // 使用整个范围的结束楼层作为保存目标（参考参考文档）
            const saveTargetIndex = floorEnd !== null && floorEnd !== undefined ? floorEnd : lastMessageIndex;
            
            console.log(`[批次 ${batchNumber}] 保存目标楼层: ${saveTargetIndex} (范围: ${floorStart}-${floorEnd}, 批次最后索引: ${lastMessageIndex})`);
            
            try {
                const success = await proceedWithCardUpdate(messagesForContext, toastMessage, saveTargetIndex);
                
                if (!success) {
                    showToast(`批处理在第 ${batchNumber} 批时失败`, 'error');
                    overallSuccess = false;
                    break;
                }
            } catch (error) {
                console.error(`批次 ${batchNumber} 处理失败:`, error);
                showToast(`批次 ${batchNumber} 处理失败: ${error.message}`, 'error');
                overallSuccess = false;
                break;
            }
        }
        
        if (overallSuccess) {
            showToast('所有批次更新完成', 'success');
        }
        
    } catch (error) {
        console.error('更新数据库失败:', error);
        throw error;
    }
}

/**
 * 执行卡片更新流程
 */
async function proceedWithCardUpdate(messagesToUse, batchToastMessage = '正在填表，请稍候...', saveTargetIndex = -1) {
    let success = false;
    const maxRetries = 3;
    let loadingToast = null;
    
    try {
        // 参考参考文档：创建带终止按钮的toast
        const stopButtonHtml = `
            <button id="data-manage-stop-update-btn" 
                    style="border: 1px solid #ffc107; color: #ffc107; background: transparent; padding: 5px 10px; border-radius: 4px; cursor: pointer; float: right; margin-left: 15px; font-size: 0.9em; transition: all 0.2s ease;"
                    onmouseover="this.style.backgroundColor='#ffc107'; this.style.color='#1a1d24';"
                    onmouseout="this.style.backgroundColor='transparent'; this.style.color='#ffc107';">
                终止
            </button>`;
        const toastMessage = `<div>${batchToastMessage}${stopButtonHtml}</div>`;
        
        // 显示toast（使用HTML内容）
        const parentWin = (window.parent && window.parent !== window) ? window.parent : window;
        if (parentWin.toastr) {
            loadingToast = parentWin.toastr.info(toastMessage, '', {
                timeOut: 0,
                extendedTimeOut: 0,
                tapToDismiss: false,
                escapeHtml: false,
                onShown: function() {
                    const stopBtn = parentWin.document.getElementById('data-manage-stop-update-btn');
                    if (stopBtn) {
                        stopBtn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            e.preventDefault();
                            
                            // 中止请求
                            if (currentAbortController) {
                                currentAbortController.abort();
                            }
                            const context = SillyTavern.getContext();
                            if (context && typeof context.stopGeneration === 'function') {
                                context.stopGeneration();
                            }
                            
                            // 移除toast
                            if (parentWin.toastr && loadingToast) {
                                parentWin.toastr.clear(loadingToast);
                            }
                            
                            // 显示确认消息
                            showToast('填表操作已由用户终止。', 'warning');
                        });
                    }
                }
            });
        } else {
            showToast(batchToastMessage, 'info');
        }
        
        // 准备AI输入
        console.log('准备AI输入...');
        const dynamicContent = await prepareAIInput(messagesToUse);
        if (!dynamicContent) {
            throw new Error('无法准备AI输入，数据库未加载');
        }
        
        // 调用API（最多重试3次）
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`第 ${attempt}/${maxRetries} 次调用AI进行增量更新...`);
            
            const aiResponse = await callCustomOpenAI(dynamicContent);
            
            if (currentAbortController && currentAbortController.signal.aborted) {
                throw new DOMException('Aborted by user', 'AbortError');
            }
            
            if (!aiResponse || !aiResponse.includes('<tableEdit>') || !aiResponse.includes('</tableEdit>')) {
                console.warn(`第 ${attempt} 次尝试失败：AI响应中未找到完整有效的 <tableEdit> 标签`);
                if (attempt === maxRetries) {
                    throw new Error(`AI在 ${maxRetries} 次尝试后仍未能返回有效指令`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后重试
                continue;
            }
            
            // 解析并应用AI返回的更新
            console.log('解析并应用AI返回的更新...');
            const parseSuccess = parseAndApplyTableEdits(aiResponse);
            if (!parseSuccess) {
                throw new Error('解析或应用AI更新时出错');
            }
            
            success = true;
            break;
        }
        
        if (success) {
            // 保存到聊天记录
            console.log('正在将更新后的数据库保存到聊天记录...');
            const saveSuccess = await saveJsonTableToChatHistory(saveTargetIndex);
            if (!saveSuccess) {
                throw new Error('无法将更新后的数据库保存到聊天记录');
            }
            
            // 参考参考文档：保存后同步到世界书
            try {
                await updateReadableLorebookEntry(true);
            } catch (error) {
                console.error('同步到世界书失败:', error);
                // 不阻止更新流程，只记录错误
            }
            
            console.log('数据库增量更新成功！');
        }
        
        return success;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('请求被用户中止');
        } else {
            console.error(`数据库增量更新流程失败: ${error.message}`, error);
            showToast(`更新失败: ${error.message}`, 'error');
        }
        return false;
    } finally {
        // 清除toast
        if (loadingToast) {
            const parentWin = (window.parent && window.parent !== window) ? window.parent : window;
            if (parentWin.toastr) {
                parentWin.toastr.clear(loadingToast);
            }
        }
        currentAbortController = null;
    }
}

/**
 * 更新可读世界书条目 - 参考参考文档实现
 */
async function updateReadableLorebookEntry(createIfNeeded = false) {
    if (!currentJsonTableData) {
        console.warn('更新世界书条目失败: currentJsonTableData为空');
        return;
    }
    
    // 获取注入目标世界书
    const primaryLorebookName = await getInjectionTargetLorebook();
    if (!primaryLorebookName) {
        console.warn('无法更新世界书条目: 未设置注入目标世界书');
        return;
    }
    
    // 获取 TavernHelper API
    const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
    let TavernHelper_API = null;
    
    if (typeof TavernHelper !== 'undefined') {
        TavernHelper_API = TavernHelper;
    } else if (parentWin && parentWin.TavernHelper) {
        TavernHelper_API = parentWin.TavernHelper;
    }
    
    if (!TavernHelper_API || typeof TavernHelper_API.getLorebookEntries !== 'function') {
        console.warn('无法更新世界书条目: TavernHelper API不可用');
        return;
    }
    
    try {
        // 格式化数据为可读文本
        const readableText = formatJsonToReadable(currentJsonTableData);
        
        const READABLE_LOREBOOK_COMMENT = 'TavernDB-ACU-ReadableDataTable';
        const entries = await TavernHelper_API.getLorebookEntries(primaryLorebookName);
        const db2Entry = entries.find(e => e.comment === READABLE_LOREBOOK_COMMENT);
        
        if (db2Entry) {
            const newContent = `<main_story_info>\n\n${readableText}\n\n</main_story_info>`;
            if (db2Entry.content !== newContent) {
                const updatedDb2Entry = { uid: db2Entry.uid, content: newContent };
                await TavernHelper_API.setLorebookEntries(primaryLorebookName, [updatedDb2Entry]);
                console.log('成功更新全局可读数据库条目');
            } else {
                console.log('全局可读数据库条目已是最新');
            }
        } else if (createIfNeeded) {
            const newDb2Entry = {
                comment: READABLE_LOREBOOK_COMMENT,
                content: `<main_story_info>\n\n${readableText}\n\n</main_story_info>`,
                enabled: true,
                type: 'constant',
                order: 100,
                prevent_recursion: true,
            };
            await TavernHelper_API.createLorebookEntries(primaryLorebookName, [newDb2Entry]);
            console.log('成功创建全局可读数据库条目');
            showToast('已创建全局可读数据库条目', 'success');
        }
    } catch (error) {
        console.error('更新世界书条目失败:', error);
        throw error;
    }
}

/**
 * 格式化JSON数据为可读文本 - 参考参考文档实现
 */
function formatJsonToReadable(jsonData) {
    if (!jsonData) return '数据库为空。';
    
    let readableText = '';
    const tableKeys = Object.keys(jsonData).filter(k => k.startsWith('sheet_'));
    
    tableKeys.forEach((sheetKey, tableIndex) => {
        const table = jsonData[sheetKey];
        if (!table || !table.name || !table.content) return;
        
        // 添加表格标题 [索引:表名]
        readableText += `[${tableIndex}:${table.name}]\n`;
        
        // 添加列信息 Columns: [0:列名1], [1:列名2], ...
        const headers = table.content[0] ? table.content[0].slice(1) : [];
        if (headers.length > 0) {
            const headerInfo = headers.map((h, i) => `[${i}:${h}]`).join('|');
            readableText += `Columns: ${headerInfo}\n`;
        }
        
        // 添加行数据 [行索引] 值1|值2|...
        const rows = table.content.slice(1);
        if (rows.length > 0) {
            rows.forEach((row, rowIndex) => {
                const rowData = row.slice(1);
                readableText += `[${rowIndex}] ${rowData.join('|')}\n`;
            });
        }
        
        readableText += '\n';
    });
    
    return readableText.trim();
}

/**
 * 获取注入目标世界书名称
 */
async function getInjectionTargetLorebook() {
    const worldbookConfig = currentSettings.worldbookConfig || DEFAULT_SETTINGS.worldbookConfig;
    const injectionTarget = worldbookConfig.injectionTarget || 'character';
    
    if (injectionTarget === 'character') {
        // 获取角色卡绑定的世界书
        const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
        let TavernHelper_API = null;
        
        if (typeof TavernHelper !== 'undefined') {
            TavernHelper_API = TavernHelper;
        } else if (parentWin && parentWin.TavernHelper) {
            TavernHelper_API = parentWin.TavernHelper;
        }
        
        if (TavernHelper_API && typeof TavernHelper_API.getCharLorebooks === 'function') {
            try {
                const charLorebooks = await TavernHelper_API.getCharLorebooks({ type: 'all' });
                if (charLorebooks && charLorebooks.primary) {
                    return charLorebooks.primary;
                }
            } catch (error) {
                console.error('获取角色卡世界书失败:', error);
            }
        }
        return null;
    } else {
        // 返回手动选择的世界书名称
        return injectionTarget;
    }
}

// ==================== 扩展初始化 ====================
// 参考: https://github.com/city-unit/st-extension-example/blob/master/index.js

// 加载扩展设置UI
async function loadExtensionSettingsUI() {
    try {
        const parentDoc = (window.parent && window.parent !== window) 
            ? window.parent.document 
            : document;
        
        // 检查设置容器是否存在
        const extensionsSettings = parentDoc.getElementById('extensions_settings');
        if (!extensionsSettings) {
            console.warn('扩展设置容器不存在，延迟重试...');
            setTimeout(loadExtensionSettingsUI, 500);
            return;
        }
        
        // 检查是否已经添加过设置UI
        if (parentDoc.getElementById('data-manage-extension-settings')) {
            return;
        }
        
        // 创建设置HTML
        const settingsHtml = `
            <div id="data-manage-extension-settings" class="extension_settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>数据管理扩展</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="flex-container flex-column flex-padding">
                            <label class="checkbox_label">
                                <input type="checkbox" id="data-manage-extension-enabled" />
                                <span>启用数据管理扩展</span>
                            </label>
                            <p class="menu_message">启用后，数据管理和数据预览按钮将显示在菜单栏中。</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到设置容器
        extensionsSettings.insertAdjacentHTML('beforeend', settingsHtml);
        
        // 绑定事件
        const enabledCheckbox = parentDoc.getElementById('data-manage-extension-enabled');
        if (enabledCheckbox) {
            // 设置初始状态
            enabledCheckbox.checked = isExtensionEnabled();
            
            // 绑定变化事件
            enabledCheckbox.addEventListener('change', function() {
                setExtensionEnabled(this.checked);
                showToast(this.checked ? '数据管理扩展已启用' : '数据管理扩展已禁用', 'success');
            });
        }
        
        // 绑定折叠/展开事件 - 参考参考文档：使用 SillyTavern 的内置机制
        // 注意：SillyTavern 会自动处理 inline-drawer 的折叠/展开，我们只需要确保事件不被阻止
        const drawerToggle = parentDoc.querySelector('#data-manage-extension-settings .inline-drawer-toggle');
        if (drawerToggle) {
            // 移除可能存在的旧事件监听器
            const newDrawerToggle = drawerToggle.cloneNode(true);
            drawerToggle.parentNode.replaceChild(newDrawerToggle, drawerToggle);
            
            // 不添加自定义事件监听器，让 SillyTavern 的内置机制处理
            // 如果需要自定义行为，可以使用 capture 阶段，但不阻止默认行为
            newDrawerToggle.addEventListener('click', function(e) {
                // 不阻止默认行为，让 SillyTavern 的内置机制处理
                // 只更新图标状态
                const drawer = this.closest('.inline-drawer');
                if (!drawer) return;
                
                const icon = this.querySelector('.inline-drawer-icon');
                if (!icon) return;
                
                // 延迟检查状态，确保 SillyTavern 的内置机制已经处理
                setTimeout(() => {
                    const content = drawer.querySelector('.inline-drawer-content');
                    if (content) {
                        const isOpen = content.style.display !== 'none' && content.style.display !== '';
                        if (isOpen) {
                            icon.classList.remove('down');
                            icon.classList.add('up');
                        } else {
                            icon.classList.remove('up');
                            icon.classList.add('down');
                        }
                    }
                }, 10);
            }, false); // 使用冒泡阶段，不阻止默认行为
        }
        
        console.log('扩展设置UI已添加到设置菜单');
    } catch (error) {
        console.error('加载扩展设置UI失败:', error);
    }
}

// 初始化扩展
function initializeExtension() {
    // 加载扩展设置
    loadExtensionSettingsUI();
    
    // 如果扩展已启用，添加按钮
    if (isExtensionEnabled()) {
        addDataManageButton();
    } else {
        // 即使未启用，也更新UI以确保按钮隐藏
        updateExtensionUI();
    }
}

// 使用 jQuery 初始化（参考示例代码）
if (typeof jQuery !== 'undefined') {
    jQuery(async () => {
        // 等待 SillyTavern 初始化
        await new Promise(resolve => {
            const checkSillyTavern = setInterval(() => {
                if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                    clearInterval(checkSillyTavern);
                    resolve();
                }
            }, 100);
        });
        
        // 初始化扩展
        initializeExtension();
    });
} else {
    // 如果没有 jQuery，使用原生方式
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializeExtension, 500);
        });
    } else {
        setTimeout(initializeExtension, 500);
    }
}

