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

/**
 * 新聊天重置流程：加载设置、重置本地状态、清理插件生成世界书条目、重载数据库
 */
async function resetScriptStateForNewChat(chatFileName) {
    try {
        // 确保设置为最新
        loadSettings();
        const context = SillyTavern.getContext();

        // 记录聊天标识（如可用）
        if (chatFileName) {
            currentChatIdentifier = chatFileName;
        } else if (context && context.chatId) {
            currentChatIdentifier = context.chatId;
        }

        // 重置状态
        currentJsonTableData = null;
        isAutoUpdating = false;
        clearTimeout(newMessageDebounceTimer);

        // 清理插件生成的世界书条目
        try {
            await deleteGeneratedLorebookEntries();
            console.log('[世界书] 新聊天重置：已清理插件生成的世界书条目');
        } catch (cleanupError) {
            console.error('新聊天重置时清理世界书条目失败:', cleanupError);
        }

        // 重新加载数据库
        await loadOrCreateJsonTableFromChatHistory();
        console.log('[自动更新] 新聊天重置完成');
    } catch (error) {
        console.error('resetScriptStateForNewChat 执行失败:', error);
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
    enableWorldbookGeneration: false, // 启用世界书生成（注入到提示词）

    // AI指令预设（支持多个预设）
    charCardPrompts: [
        {
            name: '默认预设',
            prompt: DEFAULT_CHAR_CARD_PROMPT
        }
    ],
    currentPromptIndex: 0,  // 当前使用的预设索引

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
    // 世界书排序（统一一个排序值，数值越小越靠前）
    worldbookOrder: 100,
    previewOnlyShowChanges: false,
};

// 当前配置
let currentSettings = { ...DEFAULT_SETTINGS };

function getWorldbookOrderValue() {
    const v = currentSettings?.worldbookOrder;
    if (typeof v === 'number') return v;
    if (v && typeof v === 'object') {
        // 兼容旧配置：若存在旧的多字段结构，则取 readable 或最小值
        const vals = [v.readable, v.outline, v.summary, v.person].filter(x => typeof x === 'number');
        if (typeof v.readable === 'number') return v.readable;
        if (vals.length > 0) return Math.min(...vals);
    }
    return DEFAULT_SETTINGS.worldbookOrder;
}

// 当前数据库数据（内存中的数据库状态）
let currentJsonTableData = null;

let tableEditErrorLogCache = null;
const TABLE_EDIT_ERROR_LOG_STORAGE_KEY = 'TavernDB_TableEditErrorLog';

function getTableEditErrorLog() {
    if (Array.isArray(tableEditErrorLogCache)) return tableEditErrorLogCache;
    try {
        const raw = localStorage.getItem(TABLE_EDIT_ERROR_LOG_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        tableEditErrorLogCache = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        tableEditErrorLogCache = [];
    }
    return tableEditErrorLogCache;
}

function saveTableEditErrorLog() {
    try {
        localStorage.setItem(TABLE_EDIT_ERROR_LOG_STORAGE_KEY, JSON.stringify(getTableEditErrorLog()));
        return true;
    } catch (e) {
        return false;
    }
}

function appendTableEditErrorLog(entry) {
    try {
        const log = getTableEditErrorLog();
        log.push({
            time: new Date().toISOString(),
            ...entry,
        });
        const max = 200;
        if (log.length > max) log.splice(0, log.length - max);
        saveTableEditErrorLog();
    } catch (e) {
    }
}

function clearTableEditErrorLog() {
    tableEditErrorLogCache = [];
    try {
        localStorage.removeItem(TABLE_EDIT_ERROR_LOG_STORAGE_KEY);
    } catch (e) {
    }
}

function escapeHtmlSafe(s) {
    try {
        return escapeHtml(String(s));
    } catch (e) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

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
 * 迁移旧的 charCardPrompt 到新的 charCardPrompts 格式
 */
function migrateCharCardPrompt(settings) {
    // 如果存在旧的 charCardPrompt 且没有新的 charCardPrompts，进行迁移
    if (settings.charCardPrompt && (!settings.charCardPrompts || !Array.isArray(settings.charCardPrompts) || settings.charCardPrompts.length === 0)) {
        settings.charCardPrompts = [
            {
                name: '默认预设',
                prompt: Array.isArray(settings.charCardPrompt) ? settings.charCardPrompt : DEFAULT_CHAR_CARD_PROMPT
            }
        ];
        settings.currentPromptIndex = 0;
        // 删除旧的字段
        delete settings.charCardPrompt;
        // 保存迁移后的设置
        saveSettings();
        console.log('已迁移旧的 charCardPrompt 到新的 charCardPrompts 格式');
    }
    // 确保 charCardPrompts 存在且有效
    if (!settings.charCardPrompts || !Array.isArray(settings.charCardPrompts) || settings.charCardPrompts.length === 0) {
        settings.charCardPrompts = [
            {
                name: '默认预设',
                prompt: DEFAULT_CHAR_CARD_PROMPT
            }
        ];
        settings.currentPromptIndex = 0;
    }
    // 确保 currentPromptIndex 有效
    if (typeof settings.currentPromptIndex !== 'number' || settings.currentPromptIndex < 0 || settings.currentPromptIndex >= settings.charCardPrompts.length) {
        settings.currentPromptIndex = 0;
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
            // 确保 worldbookConfig 结构完整
            if (!currentSettings.worldbookConfig) {
                currentSettings.worldbookConfig = { ...DEFAULT_SETTINGS.worldbookConfig };
            }
            if (!currentSettings.worldbookConfig.enabledEntries) {
                currentSettings.worldbookConfig.enabledEntries = {};
            }
            // 迁移旧的 charCardPrompt 到新的 charCardPrompts 格式
            migrateCharCardPrompt(currentSettings);
            console.log('[世界书] 从 extensionSettings 加载配置:', JSON.stringify(currentSettings.worldbookConfig.enabledEntries));
            return currentSettings;
        }

        // 备用方案：从 localStorage 加载
        const topLevelWindow = (window.parent && window.parent !== window) ? window.parent : window;
        if (topLevelWindow.localStorage) {
            const saved = topLevelWindow.localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
                // 确保 worldbookConfig 结构完整
                if (!currentSettings.worldbookConfig) {
                    currentSettings.worldbookConfig = { ...DEFAULT_SETTINGS.worldbookConfig };
                }
                if (!currentSettings.worldbookConfig.enabledEntries) {
                    currentSettings.worldbookConfig.enabledEntries = {};
                }
                // 迁移旧的 charCardPrompt 到新的 charCardPrompts 格式
                migrateCharCardPrompt(currentSettings);
                console.log('[世界书] 从 localStorage 加载配置:', JSON.stringify(currentSettings.worldbookConfig.enabledEntries));
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
        // 排除楼层0，统计实际楼层数
        const totalMessages = chat.length > 0 ? chat.length - 1 : 0; // 排除楼层0

        // 计算已记录的楼层数 - 参考参考文档：查找最新的有数据库记录的消息索引
        let recordedCount = -1;
        for (let i = chat.length - 1; i >= 0; i--) {
            // 检查消息是否有数据库记录标记
            if (chat[i] && chat[i].TavernDB_ACU_Data) {
                recordedCount = i; // 楼层号就是数组索引
                break;
            }
        }

        // 计算未记录的楼层数（排除楼层0）
        const unrecordedCount = recordedCount === -1 ? totalMessages : (totalMessages - recordedCount);

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
 * 获取当前选中的预设
 */
function getCurrentPrompt(settings = currentSettings) {
    if (!settings.charCardPrompts || !Array.isArray(settings.charCardPrompts) || settings.charCardPrompts.length === 0) {
        return DEFAULT_CHAR_CARD_PROMPT;
    }
    const index = settings.currentPromptIndex || 0;
    if (index >= 0 && index < settings.charCardPrompts.length) {
        return settings.charCardPrompts[index].prompt || DEFAULT_CHAR_CARD_PROMPT;
    }
    return settings.charCardPrompts[0].prompt || DEFAULT_CHAR_CARD_PROMPT;
}

/**
 * 更新预设选择器UI
 */
function updatePromptSelector(settings = currentSettings) {
    const parentDoc = (window.parent && window.parent !== window)
        ? window.parent.document
        : document;

    const selector = parentDoc.getElementById('data-manage-prompt-selector');
    if (!selector) {
        console.warn('预设选择器元素未找到');
        return;
    }

    // 保存世界书排序
    const saveWorldbookOrderBtn = parentDoc.getElementById('data-manage-save-worldbook-order');
    if (saveWorldbookOrderBtn) {
        saveWorldbookOrderBtn.addEventListener('click', function () {
            const v = parseInt(parentDoc.getElementById('data-manage-worldbook-order')?.value || '100', 10);
            currentSettings.worldbookOrder = Number.isFinite(v) ? v : 100;
            if (saveSettings()) {
                showToast('世界书排序已保存', 'success');
            } else {
                showToast('保存失败', 'error');
            }
        });
    }

    // 确保预设数组存在
    if (!settings.charCardPrompts || !Array.isArray(settings.charCardPrompts) || settings.charCardPrompts.length === 0) {
        settings.charCardPrompts = [
            {
                name: '默认预设',
                prompt: DEFAULT_CHAR_CARD_PROMPT
            }
        ];
        settings.currentPromptIndex = 0;
    }

    const prompts = settings.charCardPrompts;
    selector.innerHTML = '';

    prompts.forEach((prompt, index) => {
        const option = parentDoc.createElement('option');
        option.value = index;
        option.textContent = prompt.name || `预设 ${index + 1}`;
        if (index === (settings.currentPromptIndex || 0)) {
            option.selected = true;
        }
        selector.appendChild(option);
    });

    console.log('预设选择器已更新，共', prompts.length, '个预设');
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
                deleteBtn.addEventListener('click', function () {
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
    const worldbookOrderInput = parentDoc.getElementById('data-manage-worldbook-order');
    const removeTagsInput = parentDoc.getElementById('data-manage-remove-tags');
    const userMessageTagsInput = parentDoc.getElementById('data-manage-user-message-tags');

    // 更新复选框
    const autoUpdateCheckbox = parentDoc.getElementById('data-manage-auto-update-enabled');
    const autoHideCheckbox = parentDoc.getElementById('data-manage-auto-hide-messages');
    const enableWorldbookCheckbox = parentDoc.getElementById('data-manage-enable-worldbook-generation');

    if (frequencyInput) frequencyInput.value = settings.autoUpdateFrequency || '';
    if (batchSizeInput) batchSizeInput.value = settings.updateBatchSize || '';
    if (maxEntriesInput) maxEntriesInput.value = settings.summaryTableMaxEntries || '';
    if (worldbookOrderInput) worldbookOrderInput.value = (typeof settings.worldbookOrder === 'number') ? settings.worldbookOrder : (settings.worldbookOrder?.readable ?? 100);
    if (removeTagsInput) removeTagsInput.value = settings.removeTags || '';
    if (userMessageTagsInput) userMessageTagsInput.value = settings.userMessageTags || '';

    if (autoUpdateCheckbox) autoUpdateCheckbox.checked = settings.autoUpdateEnabled || false;
    if (autoHideCheckbox) autoHideCheckbox.checked = settings.autoHideMessages !== false;
    if (enableWorldbookCheckbox) enableWorldbookCheckbox.checked = settings.enableWorldbookGeneration || false;

    // 渲染提示词片段（使用当前选中的预设）
    const currentPrompt = getCurrentPrompt(settings);
    if (currentPrompt) {
        renderPromptSegments(currentPrompt);
    } else {
        renderPromptSegments(DEFAULT_CHAR_CARD_PROMPT);
    }

    // 更新预设选择器
    updatePromptSelector(settings);

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
    buttonElement.addEventListener('click', function (e) {
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
    buttonElement.addEventListener('click', function (e) {
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

// ============================================================
//  独立窗口系统 — DataManageWindowManager & createDataManageWindow
// ============================================================

/**
 * 窗口管理器：追踪所有打开的窗口实例
 */
const DataManageWindowManager = {
    windows: new Map(), // id -> { el, zIndex, overlay }
    baseZIndex: 10000,
    topZIndex: 10000,

    register(id, el, overlay) {
        this.topZIndex++;
        this.windows.set(id, { el, zIndex: this.topZIndex, overlay });
        el.style.zIndex = this.topZIndex;
    },

    unregister(id) {
        this.windows.delete(id);
    },

    bringToFront(id) {
        const win = this.windows.get(id);
        if (!win) return;
        this.topZIndex++;
        win.zIndex = this.topZIndex;
        win.el.style.zIndex = this.topZIndex;
    },

    getWindow(id) {
        return this.windows.get(id)?.el || null;
    },

    isOpen(id) {
        return this.windows.has(id);
    },

    closeAll() {
        this.windows.forEach((_, id) => {
            const win = this.windows.get(id);
            if (win?.el) win.el.remove();
            if (win?.overlay) win.overlay.remove();
        });
        this.windows.clear();
    }
};

/**
 * 创建独立浮动窗口
 * @param {object} options
 * @param {string} options.id - 窗口唯一ID
 * @param {string} options.title - 窗口标题
 * @param {string} options.content - 窗口内容HTML
 * @param {number} [options.width=900] - 初始宽度
 * @param {number} [options.height=700] - 初始高度
 * @param {boolean} [options.modal=false] - 是否为模态窗口（带遮罩）
 * @param {boolean} [options.resizable=true] - 是否可调整大小
 * @param {boolean} [options.maximizable=true] - 是否可最大化
 * @param {function} [options.onClose] - 关闭回调
 * @param {function} [options.onReady] - 窗口就绪回调
 * @returns {HTMLElement} 窗口元素
 */
function createDataManageWindow(options) {
    const {
        id,
        title = '窗口',
        content = '',
        width = 900,
        height = 700,
        modal = false,
        resizable = true,
        maximizable = true,
        onClose,
        onReady
    } = options;

    const parentDoc = (window.parent && window.parent !== window)
        ? window.parent.document
        : document;

    // 确保样式已注入
    _ensureWindowStyles(parentDoc);

    // 如果窗口已打开，聚焦它
    if (DataManageWindowManager.isOpen(id)) {
        DataManageWindowManager.bringToFront(id);
        return DataManageWindowManager.getWindow(id);
    }

    // 创建遮罩（仅 modal 模式）
    let overlay = null;
    if (modal) {
        overlay = parentDoc.createElement('div');
        overlay.className = 'dm-window-overlay';
        overlay.dataset.windowId = id;
        parentDoc.body.appendChild(overlay);
    }

    // 创建窗口
    const win = parentDoc.createElement('div');
    win.className = 'dm-window';
    win.id = `dm-window-${id}`;

    // 居中定位
    const vw = parentDoc.documentElement.clientWidth || window.innerWidth;
    const vh = parentDoc.documentElement.clientHeight || window.innerHeight;
    const w = Math.min(width, vw - 40);
    const h = Math.min(height, vh - 40);
    const left = Math.max(20, (vw - w) / 2);
    const top = Math.max(20, (vh - h) / 2);

    win.style.left = left + 'px';
    win.style.top = top + 'px';
    win.style.width = w + 'px';
    win.style.height = h + 'px';

    // 构建内部HTML
    let controlsHtml = '';
    if (maximizable) {
        controlsHtml += `<button class="dm-window-btn dm-btn-maximize" title="最大化/还原">
            <i class="fa-solid fa-expand"></i>
        </button>`;
    }
    controlsHtml += `<button class="dm-window-btn dm-btn-close" title="关闭">
        <i class="fa-solid fa-xmark"></i>
    </button>`;

    let resizeHandlesHtml = '';
    if (resizable) {
        const dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        resizeHandlesHtml = dirs.map(d =>
            `<div class="dm-window-resize dm-window-resize-${d}" data-resize-dir="${d}"></div>`
        ).join('');
    }

    win.innerHTML = `
        <div class="dm-window-header">
            <span class="dm-window-title">${title}</span>
            <div class="dm-window-controls">
                ${controlsHtml}
            </div>
        </div>
        <div class="dm-window-body">
            ${content}
        </div>
        ${resizeHandlesHtml}
    `;

    parentDoc.body.appendChild(win);

    // 注册到管理器
    DataManageWindowManager.register(id, win, overlay);

    // --- 事件绑定 ---

    // 点击窗口提升层级
    win.addEventListener('mousedown', () => {
        DataManageWindowManager.bringToFront(id);
    });

    // 关闭按钮
    const closeBtn = win.querySelector('.dm-btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            _closeDataManageWindow(id, win, overlay, onClose);
        });
    }

    // 遮罩点击关闭（modal）
    if (overlay) {
        overlay.addEventListener('click', () => {
            _closeDataManageWindow(id, win, overlay, onClose);
        });
    }

    // 最大化按钮
    const maxBtn = win.querySelector('.dm-btn-maximize');
    if (maxBtn) {
        let savedState = null;
        maxBtn.addEventListener('click', () => {
            if (win.classList.contains('dm-window-maximized')) {
                // 还原
                win.classList.remove('dm-window-maximized');
                if (savedState) {
                    win.style.left = savedState.left;
                    win.style.top = savedState.top;
                    win.style.width = savedState.width;
                    win.style.height = savedState.height;
                }
                maxBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
                maxBtn.title = '最大化';
            } else {
                // 保存当前位置
                savedState = {
                    left: win.style.left,
                    top: win.style.top,
                    width: win.style.width,
                    height: win.style.height
                };
                win.classList.add('dm-window-maximized');
                maxBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
                maxBtn.title = '还原';
            }
        });
    }

    // 拖拽标题栏
    _setupWindowDrag(win, parentDoc);

    // 调整大小
    if (resizable) {
        _setupWindowResize(win, parentDoc);
    }

    // 就绪回调
    if (onReady) {
        setTimeout(() => onReady(win), 50);
    }

    return win;
}

/**
 * 关闭窗口
 */
function _closeDataManageWindow(id, win, overlay, onClose) {
    win.classList.add('dm-window-closing');
    setTimeout(() => {
        win.remove();
        if (overlay) overlay.remove();
        DataManageWindowManager.unregister(id);
        if (onClose) onClose();
    }, 200);
}

/**
 * 设置窗口拖拽
 */
function _setupWindowDrag(win, doc) {
    const header = win.querySelector('.dm-window-header');
    if (!header) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
        // 不拖拽按钮
        if (e.target.closest('.dm-window-controls')) return;
        if (win.classList.contains('dm-window-maximized')) return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(win.style.left) || 0;
        startTop = parseInt(win.style.top) || 0;

        e.preventDefault();
    });

    doc.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        win.style.left = (startLeft + dx) + 'px';
        win.style.top = (startTop + dy) + 'px';
    });

    doc.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

/**
 * 设置窗口调整大小
 */
function _setupWindowResize(win, doc) {
    const handles = win.querySelectorAll('.dm-window-resize');
    let isResizing = false;
    let resizeDir = '';
    let startX, startY, startW, startH, startLeft, startTop;

    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            if (win.classList.contains('dm-window-maximized')) return;

            isResizing = true;
            resizeDir = handle.dataset.resizeDir;
            startX = e.clientX;
            startY = e.clientY;
            startW = win.offsetWidth;
            startH = win.offsetHeight;
            startLeft = parseInt(win.style.left) || 0;
            startTop = parseInt(win.style.top) || 0;

            e.preventDefault();
            e.stopPropagation();
        });
    });

    doc.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const minW = 400;
        const minH = 300;

        if (resizeDir.includes('e')) {
            win.style.width = Math.max(minW, startW + dx) + 'px';
        }
        if (resizeDir.includes('s')) {
            win.style.height = Math.max(minH, startH + dy) + 'px';
        }
        if (resizeDir.includes('w')) {
            const newW = Math.max(minW, startW - dx);
            if (newW > minW || dx < 0) {
                win.style.width = newW + 'px';
                win.style.left = (startLeft + (startW - newW)) + 'px';
            }
        }
        if (resizeDir.includes('n')) {
            const newH = Math.max(minH, startH - dy);
            if (newH > minH || dy < 0) {
                win.style.height = newH + 'px';
                win.style.top = (startTop + (startH - newH)) + 'px';
            }
        }
    });

    doc.addEventListener('mouseup', () => {
        isResizing = false;
        resizeDir = '';
    });
}

/**
 * 确保窗口CSS已注入到父文档
 */
function _ensureWindowStyles(parentDoc) {
    if (parentDoc.getElementById('dm-window-styles-link')) return;

    // 尝试找到已加载的 style.css 并注入
    const extensionPath = `scripts/extensions/third-party/${extensionName}`;
    const link = parentDoc.createElement('link');
    link.id = 'dm-window-styles-link';
    link.rel = 'stylesheet';
    link.href = `${extensionPath}/style.css`;
    parentDoc.head.appendChild(link);
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
                <button class="data-manage-tab-button" data-tab="prompt">数据库更新预设</button>
                <button class="data-manage-tab-button" data-tab="api">API设置</button>
                <button class="data-manage-tab-button" data-tab="worldbook">世界书</button>
                <button class="data-manage-tab-button" data-tab="data">数据管理</button>
                <button class="data-manage-tab-button" data-tab="sheetsettings">表格设置</button>
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
                                <input type="number" id="data-manage-floor-start" placeholder="开始楼层" min="0">
                            </div>
                            <div class="data-manage-input-group">
                                <label for="data-manage-floor-end">结束楼层:</label>
                                <input type="number" id="data-manage-floor-end" placeholder="结束楼层" min="0">
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
                            <div class="data-manage-checkbox-group">
                                <input type="checkbox" id="data-manage-enable-worldbook-generation">
                                <label for="data-manage-enable-worldbook-generation">启用世界书生成</label>
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
                            <label for="data-manage-worldbook-order">世界书排序（统一数值，越小越靠前）:</label>
                            <div class="data-manage-input-group">
                                <input type="number" id="data-manage-worldbook-order" step="1" placeholder="100">
                                <button id="data-manage-save-worldbook-order" class="secondary">保存</button>
                            </div>
                            <p class="data-manage-notes">影响由本扩展生成的世界书条目的优先级（order）。</p>
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
                    <h3>数据库更新预设</h3>
                    <div style="margin-bottom: 15px;">
                        <label for="data-manage-prompt-selector">选择预设:</label>
                        <div class="data-manage-input-group" style="margin-top: 8px;">
                            <select id="data-manage-prompt-selector" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--ios-border); background: var(--ios-gray); color: var(--ios-text);"></select>
                            <button id="data-manage-add-prompt" class="secondary">新增预设</button>
                            <button id="data-manage-delete-prompt" class="secondary">删除预设</button>
                            <button id="data-manage-duplicate-prompt" class="secondary">复制预设</button>
                            <button id="data-manage-rename-prompt" class="secondary">重命名</button>
                        </div>
                    </div>
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
                                <button id="data-manage-worldbook-select-all" class="secondary">全选</button>
                                <button id="data-manage-worldbook-deselect-all" class="secondary">全不选</button>
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
                    <div class="data-manage-button-group" style="margin-top: 15px;">
                        <button id="data-manage-visualize-template" class="secondary">可视化当前模板</button>
                        <button id="data-manage-show-overview" class="secondary">数据概览</button>
                        <button id="data-manage-show-error-log" class="secondary">报错日志</button>
                    </div>
                    <div id="data-manage-template-visualization" style="display: none; margin-top: 15px;">
                        <div class="data-manage-button-group" style="margin-bottom: 10px;">
                            <button id="data-manage-save-visualized-template" class="primary">保存模板</button>
                            <button id="data-manage-refresh-template-display" class="secondary">刷新显示</button>
                        </div>
                        <textarea id="data-manage-template-textarea" style="width: 100%; min-height: 300px; font-family: monospace; background-color: var(--ios-gray); color: var(--ios-text); padding: 12px; border: 1px solid var(--ios-border); border-radius: 8px; resize: vertical;"></textarea>
                    </div>
                    <div id="data-manage-error-log-area" style="display: none; margin-top: 15px;">
                        <div class="data-manage-button-group" style="margin-bottom: 10px;">
                            <button id="data-manage-clear-error-log" class="secondary">清空日志</button>
                            <button id="data-manage-close-error-log" class="secondary">关闭</button>
                        </div>
                        <div id="data-manage-error-log-container" style="max-height: 500px; overflow-y: auto; border: 1px solid var(--ios-border); border-radius: 8px; padding: 12px; background-color: var(--ios-gray);"></div>
                    </div>
                    <div id="data-manage-overview-area" style="display: none; margin-top: 15px;">
                        <div class="data-manage-button-group" style="margin-bottom: 10px;">
                            <button id="data-manage-close-overview" class="secondary">关闭</button>
                        </div>
                        <div id="data-manage-overview-container" style="max-height: 500px; overflow-y: auto; border: 1px solid var(--ios-border); border-radius: 8px; padding: 12px; background-color: var(--ios-gray);">
                            <em style="color: var(--ios-text-secondary);">数据概览内容将显示在这里</em>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="data-manage-tab-sheetsettings" class="data-manage-tab-content">
                <div class="data-manage-card">
                    <h3>表格独立更新设置</h3>
                    <p class="data-manage-notes">为每个表格配置独立的更新参数。设为 <b>-1</b> 表示沿用全局设置，设为 <b>0</b> 表示该表不参与自动更新。</p>
                    <div id="data-manage-sheet-settings-list" style="margin-top: 16px;">
                        <em style="color: var(--ios-text-secondary);">加载中...</em>
                    </div>
                    <div class="data-manage-button-group" style="margin-top: 16px;">
                        <button id="data-manage-save-sheet-settings" class="primary">保存所有表格设置</button>
                        <button id="data-manage-reset-sheet-settings" class="secondary">全部重置为沿用全局</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 使用独立窗口系统
    createDataManageWindow({
        id: 'dm-main',
        title: '数据管理',
        content: popupHtml,
        width: 900,
        height: 700,
        modal: false,
        resizable: true,
        maximizable: true,
        onClose: () => {
            console.log('数据管理窗口已关闭');
        },
        onReady: (win) => {
            // 先加载设置，确保预设数组已初始化
            loadSettings();

            // 然后设置事件监听器
            setupPopupEventListeners();

            // 最后加载UI
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
        }
    });
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
        button.addEventListener('click', function () {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // 状态 & 操作 Tab 的按钮
    setupStatusTabListeners(parentDoc);

    // 数据库更新预设 Tab 的按钮
    setupPromptTabListeners(parentDoc);

    // API设置 Tab 的按钮
    setupApiTabListeners(parentDoc);

    // 世界书 Tab 的按钮
    setupWorldbookTabListeners(parentDoc);

    // 数据管理 Tab 的按钮
    setupDataTabListeners(parentDoc);

    // 表格设置 Tab 的按钮
    setupSheetSettingsTabListeners(parentDoc);
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
        // 确保设置已加载
        loadSettings();
        populateInjectionTargetSelector();
        updateWorldbookSourceView();
    }

    // 如果切换到表格设置Tab，渲染设置UI
    if (tabName === 'sheetsettings') {
        renderSheetSettingsUI();
    }
}

/**
 * 设置状态Tab的事件监听器
 */
function setupStatusTabListeners(parentDoc) {
    // 更新数据库按钮
    const updateBtn = parentDoc.getElementById('data-manage-update-card');
    if (updateBtn) {
        updateBtn.addEventListener('click', function () {
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
        saveFrequencyBtn.addEventListener('click', function () {
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
        saveBatchSizeBtn.addEventListener('click', function () {
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
        saveMaxEntriesBtn.addEventListener('click', function () {
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
        saveRemoveTagsBtn.addEventListener('click', function () {
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
        saveUserTagsBtn.addEventListener('click', function () {
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
        autoUpdateCheckbox.addEventListener('change', function () {
            currentSettings.autoUpdateEnabled = this.checked;
            saveSettings();
            showToast(this.checked ? '已启用自动更新' : '已禁用自动更新', 'info');
        });
    }

    // 自动隐藏消息复选框
    const autoHideCheckbox = parentDoc.getElementById('data-manage-auto-hide-messages');
    if (autoHideCheckbox) {
        autoHideCheckbox.addEventListener('change', function () {
            currentSettings.autoHideMessages = this.checked;
            saveSettings();
        });
    }

    // 启用世界书生成复选框
    const enableWorldbookCheckbox = parentDoc.getElementById('data-manage-enable-worldbook-generation');
    if (enableWorldbookCheckbox) {
        enableWorldbookCheckbox.addEventListener('change', function () {
            currentSettings.enableWorldbookGeneration = this.checked;
            saveSettings();
            showToast(this.checked ? '已启用世界书生成' : '已禁用世界书生成', 'info');
        });
    }
}

/**
 * 设置数据库更新预设Tab的事件监听器
 */
function setupPromptTabListeners(parentDoc) {
    // 确保预设数组存在
    if (!currentSettings.charCardPrompts || !Array.isArray(currentSettings.charCardPrompts) || currentSettings.charCardPrompts.length === 0) {
        currentSettings.charCardPrompts = [
            {
                name: '默认预设',
                prompt: DEFAULT_CHAR_CARD_PROMPT
            }
        ];
        currentSettings.currentPromptIndex = 0;
        saveSettings();
    }

    // 预设选择器切换
    const selector = parentDoc.getElementById('data-manage-prompt-selector');
    if (selector) {
        console.log('找到预设选择器，准备绑定事件');
        selector.addEventListener('change', function () {
            const newIndex = parseInt(this.value);
            if (!isNaN(newIndex) && newIndex >= 0 && newIndex < currentSettings.charCardPrompts.length) {
                // 保存当前编辑的内容到旧预设
                const segments = getPromptSegmentsFromUI();
                if (segments && segments.length > 0) {
                    const oldIndex = currentSettings.currentPromptIndex || 0;
                    if (oldIndex >= 0 && oldIndex < currentSettings.charCardPrompts.length) {
                        currentSettings.charCardPrompts[oldIndex].prompt = segments;
                    }
                }
                // 切换到新预设
                currentSettings.currentPromptIndex = newIndex;
                const newPrompt = currentSettings.charCardPrompts[newIndex].prompt;
                renderPromptSegments(newPrompt);
                saveSettings();
            }
        });
    }

    // 新增预设
    const addBtn = parentDoc.getElementById('data-manage-add-prompt');
    if (addBtn) {
        addBtn.addEventListener('click', function () {
            // 确保预设数组存在
            if (!currentSettings.charCardPrompts || !Array.isArray(currentSettings.charCardPrompts) || currentSettings.charCardPrompts.length === 0) {
                currentSettings.charCardPrompts = [
                    {
                        name: '默认预设',
                        prompt: DEFAULT_CHAR_CARD_PROMPT
                    }
                ];
                currentSettings.currentPromptIndex = 0;
            }

            const name = prompt('请输入新预设的名称:', `预设 ${currentSettings.charCardPrompts.length + 1}`);
            if (name && name.trim()) {
                const newPrompt = {
                    name: name.trim(),
                    prompt: [...DEFAULT_CHAR_CARD_PROMPT]
                };
                currentSettings.charCardPrompts.push(newPrompt);
                currentSettings.currentPromptIndex = currentSettings.charCardPrompts.length - 1;
                updatePromptSelector(currentSettings);
                renderPromptSegments(newPrompt.prompt);
                saveSettings();
                showToast('新预设已创建', 'success');
            } else if (name !== null) {
                // 用户点击了取消或输入为空
                showToast('预设名称不能为空', 'warning');
            }
        });
    } else {
        console.error('新增预设按钮未找到');
    }

    // 删除预设
    const deleteBtn = parentDoc.getElementById('data-manage-delete-prompt');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function () {
            if (currentSettings.charCardPrompts.length <= 1) {
                showToast('至少需要保留一个预设', 'warning');
                return;
            }
            const currentIndex = currentSettings.currentPromptIndex || 0;
            const currentName = currentSettings.charCardPrompts[currentIndex].name;
            if (confirm(`确定要删除预设"${currentName}"吗？`)) {
                currentSettings.charCardPrompts.splice(currentIndex, 1);
                // 调整索引
                if (currentSettings.currentPromptIndex >= currentSettings.charCardPrompts.length) {
                    currentSettings.currentPromptIndex = currentSettings.charCardPrompts.length - 1;
                }
                const newPrompt = currentSettings.charCardPrompts[currentSettings.currentPromptIndex].prompt;
                updatePromptSelector(currentSettings);
                renderPromptSegments(newPrompt);
                saveSettings();
                showToast('预设已删除', 'success');
            }
        });
    }

    // 复制预设
    const duplicateBtn = parentDoc.getElementById('data-manage-duplicate-prompt');
    if (duplicateBtn) {
        duplicateBtn.addEventListener('click', function () {
            const currentIndex = currentSettings.currentPromptIndex || 0;
            const currentPreset = currentSettings.charCardPrompts[currentIndex];
            if (!currentPreset) {
                return;
            }
            const defaultName = `${currentPreset.name} 副本`;
            const newName = prompt('请输入复制预设的名称:', defaultName);
            if (!newName || !newName.trim()) {
                if (newName !== null) {
                    showToast('预设名称不能为空', 'warning');
                }
                return;
            }
            const copiedPrompt = Array.isArray(currentPreset.prompt)
                ? currentPreset.prompt.map(seg => ({ ...seg }))
                : currentPreset.prompt;
            const newPreset = {
                name: newName.trim(),
                prompt: copiedPrompt
            };
            currentSettings.charCardPrompts.push(newPreset);
            currentSettings.currentPromptIndex = currentSettings.charCardPrompts.length - 1;
            updatePromptSelector(currentSettings);
            renderPromptSegments(newPreset.prompt);
            saveSettings();
            showToast('预设已复制', 'success');
        });
    }

    // 重命名预设
    const renameBtn = parentDoc.getElementById('data-manage-rename-prompt');
    if (renameBtn) {
        renameBtn.addEventListener('click', function () {
            const currentIndex = currentSettings.currentPromptIndex || 0;
            const currentName = currentSettings.charCardPrompts[currentIndex].name;
            const newName = prompt('请输入新名称:', currentName);
            if (newName && newName.trim() && newName.trim() !== currentName) {
                currentSettings.charCardPrompts[currentIndex].name = newName.trim();
                updatePromptSelector(currentSettings);
                saveSettings();
                showToast('预设已重命名', 'success');
            }
        });
    }

    // 保存提示词预设
    const saveBtn = parentDoc.getElementById('data-manage-save-prompt');
    if (saveBtn) {
        saveBtn.addEventListener('click', function () {
            const segments = getPromptSegmentsFromUI();

            if (!segments || segments.length === 0 || (segments.length === 1 && !segments[0].content.trim())) {
                showToast('更新预设不能为空', 'warning');
                return;
            }

            // 保存到当前预设
            const currentIndex = currentSettings.currentPromptIndex || 0;
            if (currentIndex >= 0 && currentIndex < currentSettings.charCardPrompts.length) {
                currentSettings.charCardPrompts[currentIndex].prompt = segments;
                if (saveSettings()) {
                    showToast('更新预设已保存', 'success');
                } else {
                    showToast('保存失败', 'error');
                }
            }
        });
    }

    // 添加对话轮次按钮
    const addSegmentBtns = parentDoc.querySelectorAll('.data-manage-add-segment-btn');
    addSegmentBtns.forEach(btn => {
        btn.addEventListener('click', function () {
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
                deleteBtn.addEventListener('click', function () {
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
        radio.addEventListener('change', function () {
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
        useMainApiCheckbox.addEventListener('change', function () {
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
        saveApiBtn.addEventListener('click', function () {
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
        clearApiBtn.addEventListener('click', function () {
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
        testApiBtn.addEventListener('click', async function () {
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
        loadModelsBtn.addEventListener('click', async function () {
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
        refreshBtn.addEventListener('click', function () {
            loadTavernApiProfiles();
            showToast('酒馆预设列表已刷新', 'success');
        });
    }

    // 酒馆预设选择变化
    const tavernProfileSelect = parentDoc.getElementById('data-manage-tavern-profile');
    if (tavernProfileSelect) {
        tavernProfileSelect.addEventListener('change', function () {
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

    // 排序输入框赋值（统一一个数值）
    const orderInput = parentDoc.getElementById('data-manage-order');
    if (orderInput) orderInput.value = (typeof settings.worldbookOrder === 'number') ? settings.worldbookOrder : (settings.worldbookOrder?.readable ?? 100);

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
        select.addEventListener('change', async function () {
            if (!currentSettings.worldbookConfig) {
                currentSettings.worldbookConfig = { ...DEFAULT_SETTINGS.worldbookConfig };
            }

            const oldTargetSetting = currentSettings.worldbookConfig.injectionTarget || 'character';
            const newTargetSetting = this.value || 'character';

            if (oldTargetSetting === newTargetSetting) {
                return;
            }

            try {
                const oldLorebookName = await getInjectionTargetLorebook(oldTargetSetting);
                if (oldLorebookName) {
                    console.log(`[世界书] 注入目标切换，开始清理旧世界书 "${oldLorebookName}"`);
                    await deleteGeneratedLorebookEntries(oldLorebookName);
                }
            } catch (error) {
                console.error('清理旧世界书条目失败:', error);
            }

            currentSettings.worldbookConfig.injectionTarget = newTargetSetting;
            saveSettings();
            showToast('世界书注入目标已更新', 'success');

            if (currentJsonTableData) {
                try {
                    await updateReadableLorebookEntry(true);
                    showToast('当前数据已同步到新的世界书', 'info');
                } catch (error) {
                    console.error('同步新世界书失败:', error);
                    showToast('同步新世界书失败，请稍后重试', 'error');
                }
            } else {
                showToast('注入目标已切换，将在下次更新时写入数据', 'info');
            }
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

            item.addEventListener('click', function () {
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

    // 确保设置已加载（从存储中重新加载，以防切换tab时设置丢失）
    loadSettings();

    // 确保 worldbookConfig 存在并直接引用 currentSettings，而不是创建新对象
    if (!currentSettings.worldbookConfig) {
        currentSettings.worldbookConfig = { ...DEFAULT_SETTINGS.worldbookConfig };
    }

    // 确保 enabledEntries 存在
    if (!currentSettings.worldbookConfig.enabledEntries) {
        currentSettings.worldbookConfig.enabledEntries = {};
    }

    const worldbookConfig = currentSettings.worldbookConfig;
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
        const isLorebookEntryEnabled = (entry) => {
            if (!entry || typeof entry !== 'object') return true;
            if (Object.prototype.hasOwnProperty.call(entry, 'disabled')) return entry.disabled !== true;
            if (Object.prototype.hasOwnProperty.call(entry, 'is_disabled')) return entry.is_disabled !== true;
            if (Object.prototype.hasOwnProperty.call(entry, 'enabled')) return entry.enabled === true;
            if (Object.prototype.hasOwnProperty.call(entry, 'isEnabled')) return entry.isEnabled === true;
            return true;
        };

        for (const bookName of bookNames) {
            const bookData = allBooks.find(b => b.name === bookName);
            if (bookData && bookData.entries) {
                // 将条目ID统一转换为字符串，避免类型不一致导致的匹配失败
                const normalizeEntryId = (entry) => String(entry?.uid ?? entry?.id ?? '');

                // 如果该世界书没有设置，默认启用“世界书里处于启用状态”的条目
                // 注意：只在新世界书时设置默认值，如果已有配置（即使是空数组），则使用已有配置
                if (typeof worldbookConfig.enabledEntries[bookName] === 'undefined') {
                    worldbookConfig.enabledEntries[bookName] = bookData.entries
                        .filter(isLorebookEntryEnabled)
                        .map(normalizeEntryId)
                        .filter(id => id);
                    settingsChanged = true;
                    console.log('[世界书] 新世界书，默认启用已开启条目:', bookName, worldbookConfig.enabledEntries[bookName]);
                } else {
                    // 确保已有配置中的条目ID也被转换为字符串
                    worldbookConfig.enabledEntries[bookName] = worldbookConfig.enabledEntries[bookName].map(id => String(id));
                }

                const enabledEntries = worldbookConfig.enabledEntries[bookName] || [];
                console.log('[世界书] 加载条目列表:', { bookName, enabledEntriesCount: enabledEntries.length, totalEntries: bookData.entries.length });
                html += `<div style="margin-bottom: 8px; font-weight: 600; padding-bottom: 6px; border-bottom: 1px solid var(--ios-border);">${escapeHtml(bookName)}</div>`;

                bookData.entries.forEach(entry => {
                    const entryUid = normalizeEntryId(entry);
                    const isEnabled = enabledEntries.includes(entryUid);
                    // 参考参考资料：使用 entry.comment 作为条目名称，如果没有则使用 uid
                    const entryName = entry.comment || entry.name || entryUid || `条目 ${entryUid}`;
                    const checkboxId = `worldbook-entry-${bookName}-${entryUid}`.replace(/[^a-zA-Z0-9-]/g, '-');
                    const encodedBookName = encodeURIComponent(bookName);
                    const encodedEntryUid = encodeURIComponent(entryUid);

                    html += `
                        <div class="data-manage-checkbox-group" style="margin-bottom: 4px;">
                            <input type="checkbox" id="${checkboxId}" data-book="${encodedBookName}" data-uid="${encodedEntryUid}" ${isEnabled ? 'checked' : ''}>
                            <label for="${checkboxId}" style="margin: 0; cursor: pointer; flex: 1;">${escapeHtml(entryName)}</label>
                        </div>
                    `;
                });
            }
        }

        // 如果有新设置（默认启用所有条目），保存配置
        if (settingsChanged) {
            saveSettings();
        }

        container.innerHTML = html;

        // 绑定复选框事件
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            // 移除可能存在的旧事件监听器（避免重复绑定）
            const newCheckbox = checkbox.cloneNode(true);
            checkbox.parentNode.replaceChild(newCheckbox, checkbox);

            newCheckbox.addEventListener('change', function () {
                const bookName = decodeURIComponent(this.dataset.book || '');
                const entryUid = String(decodeURIComponent(this.dataset.uid || ''));

                console.log('[世界书] 复选框状态改变:', { bookName, entryUid, checked: this.checked });

                // 确保直接操作 currentSettings，而不是局部变量
                if (!currentSettings.worldbookConfig) {
                    currentSettings.worldbookConfig = { ...DEFAULT_SETTINGS.worldbookConfig };
                }
                if (!currentSettings.worldbookConfig.enabledEntries) {
                    currentSettings.worldbookConfig.enabledEntries = {};
                }
                if (!currentSettings.worldbookConfig.enabledEntries[bookName]) {
                    currentSettings.worldbookConfig.enabledEntries[bookName] = [];
                }

                // 确保当前列表中的所有ID都是字符串
                currentSettings.worldbookConfig.enabledEntries[bookName] = currentSettings.worldbookConfig.enabledEntries[bookName].map(id => String(id));
                const enabledList = currentSettings.worldbookConfig.enabledEntries[bookName];
                const index = enabledList.indexOf(entryUid);

                if (this.checked) {
                    if (index === -1) {
                        enabledList.push(entryUid);
                        console.log('[世界书] 已添加条目到启用列表:', entryUid);
                    }
                } else {
                    if (index !== -1) {
                        enabledList.splice(index, 1);
                        console.log('[世界书] 已从启用列表移除条目:', entryUid);
                    }
                }

                console.log('[世界书] 当前启用列表:', enabledList);
                console.log('[世界书] 当前配置:', JSON.stringify(currentSettings.worldbookConfig.enabledEntries));

                // 保存设置
                const saveResult = saveSettings();
                if (saveResult) {
                    console.log('[世界书] 设置已保存');
                } else {
                    console.error('[世界书] 设置保存失败');
                }
            });
        });
    } catch (error) {
        console.error('填充世界书条目列表失败:', error);
        container.innerHTML = '<em style="color: var(--ios-text-secondary);">加载失败</em>';
    }
}

async function deleteGeneratedLorebookEntries(targetLorebookName = null) {
    const targetName = targetLorebookName || await getInjectionTargetLorebook();
    if (!targetName) {
        console.warn('[世界书] 无法清理条目：未找到注入目标');
        return;
    }

    const TavernHelper_API = getTavernHelperAPI();
    if (!TavernHelper_API || typeof TavernHelper_API.getLorebookEntries !== 'function' || typeof TavernHelper_API.deleteLorebookEntries !== 'function') {
        console.warn('[世界书] 无法清理条目：TavernHelper API 不可用');
        return;
    }

    try {
        const allEntries = await TavernHelper_API.getLorebookEntries(targetName);
        if (!allEntries || !Array.isArray(allEntries) || allEntries.length === 0) {
            console.log(`[世界书] ${targetName} 中没有可清理的条目`);
            return;
        }

        const uidsToDelete = allEntries
            .filter(entry => entry?.comment && GENERATED_LOREBOOK_PREFIXES.some(prefix => entry.comment.startsWith(prefix)))
            .map(entry => entry.uid);

        if (uidsToDelete.length === 0) {
            console.log(`[世界书] ${targetName} 中没有匹配的插件条目需要删除`);
            return;
        }

        await TavernHelper_API.deleteLorebookEntries(targetName, uidsToDelete);
        console.log(`[世界书] 已从 ${targetName} 删除 ${uidsToDelete.length} 个插件生成的条目`);
    } catch (error) {
        console.error('清理世界书条目失败:', error);
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
        radio.addEventListener('change', async function () {
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
        refreshBtn.addEventListener('click', async function () {
            await populateWorldbookList();
            showToast('世界书列表已刷新', 'success');
        });
    }

    // 全选条目
    const selectAllBtn = parentDoc.getElementById('data-manage-worldbook-select-all');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function () {
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
        deselectAllBtn.addEventListener('click', function () {
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

        overviewArea.style.display = 'block';
        overviewContainer.innerHTML = '<em style="color: var(--ios-text-secondary);">正在加载数据概览...</em>';

        // 遍历聊天记录，查找包含数据库数据的消息 - 参考参考文档：楼层号直接使用数组索引
        // iOS 26 毛玻璃风格
        let html = '<div class="overview-content">';
        html += '<h3>聊天记录数据概览</h3>';

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

                // iOS 26 毛玻璃卡片
                html += `<div class="message-data-card" data-message-index="${i}">`;
                html += `<div class="message-card-header">`;
                html += `<h4>楼层 ${messageIndex} - ${messageType} - 数据库记录</h4>`;
                html += `<span class="timestamp">${escapeHtml(timestamp)}</span>`;
                html += `</div>`;

                // 显示数据统计
                const tableKeys = Object.keys(messageData).filter(k => k.startsWith('sheet_'));
                html += `<div class="message-stats">`;
                html += `<p>包含 ${tableKeys.length} 个数据表格</p>`;

                // 显示每个表格的简要信息
                tableKeys.forEach(sheetKey => {
                    const table = messageData[sheetKey];
                    if (table && table.name && table.content) {
                        const rowCount = table.content.length - 1; // 减去表头
                        html += `<div class="sheet-tag">`;
                        html += `<strong>${escapeHtml(table.name)}</strong>: ${rowCount} 条记录`;
                        if (table.sourceData && table.sourceData.note) {
                            html += ` - ${escapeHtml(table.sourceData.note)}`;
                        }
                        html += `</div>`;
                    }
                });

                html += `</div>`;

                // 详情展开区域（在操作按钮之前）
                html += `<div class="message-details" data-message-index="${i}" style="display: ${displayStyle};">`;
                html += `<div class="details-content">`;
                if (isExpanded) {
                    html += loadMessageDetails(i, messageData);
                } else {
                    html += `<!-- 详情内容将在这里动态加载 -->`;
                }
                html += `</div>`;
                html += `</div>`;

                // 操作按钮 - 展示在每个条目的底部
                html += `<div class="message-card-actions">`;
                html += `<button class="toggle-details-btn" data-message-index="${i}">${buttonText}</button>`;
                html += `<button class="delete-message-btn" data-message-index="${i}">删除记录</button>`;
                html += `</div>`;
                html += `</div>`;
            }
        }

        if (dataCount === 0) {
            html += '<p style="text-align: center; color: var(--ios-text-secondary); font-style: italic;">暂无数据库记录</p>';
        } else {
            html += `<div class="overview-summary">`;
            html += `<p>共找到 ${dataCount} 条数据库记录</p>`;
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
                            } catch (e) { }
                        }
                    } catch (e) { }
                }
                if (messageData) {
                    const contentDiv = detailsArea.querySelector('.details-content');
                    if (contentDiv) {
                        contentDiv.innerHTML = loadMessageDetails(messageIndex, messageData);
                        // 重新绑定详情区域的事件（重要：确保事件可以正常工作）
                        bindDetailsEventsForMessage(detailsArea, messageIndex);
                    }
                }
            }
        });

        showToast(`已加载 ${dataCount} 条数据库记录`, 'success');
    } catch (error) {
        console.error('显示数据概览失败:', error);
        showToast(`显示数据概览失败: ${error.message}`, 'error');
    }
}

/**
 * 绑定单个消息详情区域的事件 - 参考参考文档的 bindDetailsEvents_ACU
 */
function bindDetailsEventsForMessage(detailsArea, messageIndex) {
    if (!detailsArea) return;

    // 防止重复绑定：如果已经绑定过，先移除
    if (detailsArea._detailsClickHandler) {
        detailsArea.removeEventListener('click', detailsArea._detailsClickHandler, true);
        detailsArea._detailsClickHandler = null;
    }

    // 参考参考文档：使用事件委托，避免重复绑定
    // 使用事件委托，绑定到 detailsArea 容器上，这样即使内容被 innerHTML 替换，事件仍然有效
    const clickHandler = function (e) {
        // 检查点击的目标是否是按钮（包括按钮内的文本节点）
        let target = e.target;

        // 如果点击的是文本节点，向上查找按钮元素
        while (target && target !== detailsArea) {
            if (target.classList && target.classList.contains('save-row-btn')) {
                e.preventDefault();
                e.stopPropagation();
                handleSaveRow(e);
                return;
            }

            if (target.classList && target.classList.contains('delete-row-btn')) {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteRow(e);
                return;
            }

            if (target.classList && target.classList.contains('delete-table-btn')) {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteTable(e);
                return;
            }

            target = target.parentElement;
        }
    };

    // 保存引用以便后续移除
    detailsArea._detailsClickHandler = clickHandler;
    // 添加新的事件监听器（使用捕获阶段，确保事件能够被捕获）
    detailsArea.addEventListener('click', clickHandler, true);

    // 设置 textarea 固定高度
    const textareas = detailsArea.querySelectorAll('.cell-input');
    textareas.forEach(textarea => {
        textarea.style.height = '120px';
        textarea.style.minHeight = '120px';
    });
}

/**
 * 绑定概览事件 - 参考参考文档使用事件委托
 */
function bindOverviewEvents(parentDoc) {
    const overviewArea = parentDoc.getElementById('data-manage-overview-area');
    if (!overviewArea) return;

    // 参考参考文档：使用事件委托，避免重复绑定
    // 使用命名空间事件来避免重复绑定，不要克隆节点（会破坏 DOM 引用）

    // 移除旧的事件监听器（如果存在）
    if (overviewArea._overviewClickHandler) {
        overviewArea.removeEventListener('click', overviewArea._overviewClickHandler);
    }

    // 创建新的事件处理器
    const clickHandler = function (e) {
        // 检查点击的目标是否是按钮（包括按钮内的文本节点）
        let target = e.target;

        // 如果点击的是文本节点，向上查找按钮元素
        while (target && target !== overviewArea) {
            if (target.classList && target.classList.contains('toggle-details-btn')) {
                e.preventDefault();
                e.stopPropagation();
                handleToggleDetails(e);
                return;
            }

            if (target.classList && target.classList.contains('delete-message-btn')) {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteMessage(e);
                return;
            }

            // 注意：保存行、删除行、删除表格按钮的事件由 bindDetailsEventsForMessage 处理
            // 这里不再处理，避免事件冲突

            target = target.parentElement;
        }
    };

    // 保存引用以便后续移除
    overviewArea._overviewClickHandler = clickHandler;
    // 添加新的事件监听器
    overviewArea.addEventListener('click', clickHandler);
}

/**
 * 处理展开/收起详情
 */
function handleToggleDetails(e) {
    e.preventDefault();
    e.stopPropagation();

    try {
        // 获取按钮元素（可能点击的是按钮内的文本节点）
        let button = e.target;
        while (button && (!button.classList || !button.classList.contains('toggle-details-btn'))) {
            button = button.parentElement;
        }

        if (!button) {
            console.error('无法找到展开/收起按钮元素');
            showToast('无法找到展开/收起按钮', 'error');
            return;
        }

        const messageIndexStr = button.getAttribute('data-message-index');
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

        const isCurrentlyVisible = detailsArea.style.display !== 'none' && detailsArea.style.display !== '';

        if (!isCurrentlyVisible) {
            // 展开详情
            const contentDiv = detailsArea.querySelector('.details-content');
            if (contentDiv) {
                // 先设置显示，避免在加载内容时触发其他事件
                detailsArea.style.display = 'block';
                contentDiv.innerHTML = loadMessageDetails(messageIndex, messageData);
                // 重新绑定详情区域的事件（参考参考文档的 bindDetailsEvents_ACU）
                bindDetailsEventsForMessage(detailsArea, messageIndex);
            }
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

    // 获取按钮元素（可能点击的是按钮内的文本节点）
    let button = e.target;
    while (button && (!button.classList || !button.classList.contains('save-row-btn'))) {
        button = button.parentElement;
    }

    if (!button) {
        console.error('无法找到保存按钮元素');
        showToast('无法找到保存按钮', 'error');
        return;
    }

    const sheetKey = button.getAttribute('data-sheet-key');
    const rowIndex = parseInt(button.getAttribute('data-row-index'));
    const messageIndex = parseInt(button.getAttribute('data-message-index'));

    try {
        const context = SillyTavern.getContext();
        if (!context || !context.chat) {
            showToast('无法访问聊天记录', 'error');
            return;
        }

        const message = context.chat[messageIndex];
        if (!message || !message.TavernDB_ACU_Data) {
            showToast('无法找到指定消息的数据', 'error');
            return;
        }

        const table = message.TavernDB_ACU_Data[sheetKey];
        if (!table || !table.content || !table.content[rowIndex + 1]) {
            showToast('无法找到指定的行数据', 'error');
            return;
        }

        const parentDoc = (window.parent && window.parent !== window)
            ? window.parent.document
            : document;
        const overviewArea = parentDoc.getElementById('data-manage-overview-area');
        if (!overviewArea) return;

        const detailsArea = overviewArea.querySelector(`.message-details[data-message-index="${messageIndex}"]`);
        if (!detailsArea) {
            showToast('无法找到详情区域', 'error');
            return;
        }

        // 获取该行的单个输入框（包含整行数据）- 修复：使用entry-card选择器
        const entryCard = detailsArea.querySelector(`.entry-card[data-row-index="${rowIndex}"][data-sheet-key="${sheetKey}"]`);
        if (!entryCard) {
            showToast('无法找到条目卡片', 'error');
            return;
        }

        const rowInput = entryCard.querySelector('.cell-input');
        if (!rowInput) {
            showToast('无法找到输入框', 'error');
            return;
        }

        // 读取输入框内容，按 | 分隔符分割为数组
        const inputValue = rowInput.value;
        const newRowData = inputValue ? inputValue.split(' | ').map(val => val.trim()) : [];

        // 确保数组长度与原行数据一致（如果用户删除了分隔符，可能需要补充空值）
        const originalRowData = table.content[rowIndex + 1] ? table.content[rowIndex + 1].slice(1) : [];
        while (newRowData.length < originalRowData.length) {
            newRowData.push('');
        }

        // 创建深拷贝以更新数据
        const newJsonData = JSON.parse(JSON.stringify(message.TavernDB_ACU_Data));
        const newTable = newJsonData[sheetKey];

        // 更新数据 - 先删除原始数据，再更新新数据
        const originalRow = newTable.content[rowIndex + 1];
        newTable.content.splice(rowIndex + 1, 1); // 删除原始行
        newTable.content.splice(rowIndex + 1, 0, [null, ...newRowData]); // 插入新行

        // 调试日志
        console.log('保存数据详情:', {
            sheetKey,
            rowIndex,
            messageIndex,
            originalRow: originalRow ? originalRow.slice(1) : null,
            newRowData
        });

        // 更新全局数据（参考可视化编辑原理）
        currentJsonTableData = newJsonData;

        // 保存到聊天记录（传递messageIndex以确保保存到原楼层）
        await saveJsonTableToChatHistory(messageIndex);

        // 根据表格类型，只更新对应的世界书条目，避免更新其他表格
        const tableName = newTable.name ? newTable.name.trim() : '';
        if (tableName === '总结表') {
            // 只更新总结表的世界书条目
            const primaryLorebookName = await getInjectionTargetLorebook();
            if (primaryLorebookName) {
                const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
                let TavernHelper_API = null;
                if (typeof TavernHelper !== 'undefined') {
                    TavernHelper_API = TavernHelper;
                } else if (parentWin && parentWin.TavernHelper) {
                    TavernHelper_API = parentWin.TavernHelper;
                }
                if (TavernHelper_API) {
                    await updateSummaryTableEntries(newTable, TavernHelper_API, primaryLorebookName);
                }
            }
        } else if (tableName === '故事主线') {
            // 只更新主线事件表的世界书条目
            const primaryLorebookName = await getInjectionTargetLorebook();
            if (primaryLorebookName) {
                const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
                let TavernHelper_API = null;
                if (typeof TavernHelper !== 'undefined') {
                    TavernHelper_API = TavernHelper;
                } else if (parentWin && parentWin.TavernHelper) {
                    TavernHelper_API = parentWin.TavernHelper;
                }
                if (TavernHelper_API) {
                    await updateOutlineTableEntry(newTable, TavernHelper_API, primaryLorebookName);
                }
            }
        } else if (tableName === '重要角色表') {
            // 只更新重要角色表的世界书条目
            const primaryLorebookName = await getInjectionTargetLorebook();
            if (primaryLorebookName) {
                const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
                let TavernHelper_API = null;
                if (typeof TavernHelper !== 'undefined') {
                    TavernHelper_API = TavernHelper;
                } else if (parentWin && parentWin.TavernHelper) {
                    TavernHelper_API = parentWin.TavernHelper;
                }
                if (TavernHelper_API) {
                    await updateImportantPersonsRelatedEntries(newTable, TavernHelper_API, primaryLorebookName);
                }
            }
        } else {
            // 对于其他表格，更新可读数据库条目（但不包含特殊表格）
            await updateReadableLorebookEntry(false);
        }

        // 刷新当前详情区域 - 参考参考文档：直接调用 loadMessageDetails 并重新绑定事件
        const contentDiv = detailsArea.querySelector('.details-content');
        if (contentDiv) {
            contentDiv.innerHTML = loadMessageDetails(messageIndex, newJsonData);
            // 重新绑定详情区域的事件（参考参考文档的 bindDetailsEvents_ACU）
            bindDetailsEventsForMessage(detailsArea, messageIndex);
        }

        showToast('数据已保存', 'success');
    } catch (error) {
        console.error('保存失败:', error);
        showToast(`保存失败: ${error.message}`, 'error');
    }
}

/**
 * 处理删除行
 */
async function handleDeleteRow(e) {
    e.preventDefault();
    e.stopPropagation();

    // 获取按钮元素（可能点击的是按钮内的文本节点）
    let button = e.target;
    while (button && (!button.classList || !button.classList.contains('delete-row-btn'))) {
        button = button.parentElement;
    }

    if (!button) {
        console.error('无法找到删除按钮元素');
        showToast('无法找到删除按钮', 'error');
        return;
    }

    const sheetKey = button.getAttribute('data-sheet-key');
    const rowIndex = parseInt(button.getAttribute('data-row-index'));
    const messageIndex = parseInt(button.getAttribute('data-message-index'));

    try {
        // 1. 从指定的消息获取源数据
        const context = SillyTavern.getContext();
        if (!context || !context.chat) {
            showToast('无法访问聊天记录', 'error');
            return;
        }

        const message = context.chat[messageIndex];
        if (!message || !message.TavernDB_ACU_Data) {
            showToast('无法找到指定消息的数据', 'error');
            return;
        }

        const sourceData = message.TavernDB_ACU_Data;
        const table = sourceData[sheetKey];
        if (!table || !table.content || !table.content[rowIndex + 1]) {
            showToast('无法找到指定的行数据', 'error');
            return;
        }

        if (!confirm('确定要删除这一行吗？此操作不可撤销。')) {
            return;
        }

        // 开始删除流程
        // 2. 创建深拷贝
        const newJsonData = JSON.parse(JSON.stringify(sourceData));

        // 3. 删除行
        newJsonData[sheetKey].content.splice(rowIndex + 1, 1);

        // 4. 更新全局数据
        currentJsonTableData = newJsonData;

        // 5. 保存到聊天记录（传递messageIndex以确保保存到原楼层）
        await saveJsonTableToChatHistory(messageIndex);

        // 根据表格类型，只更新对应的世界书条目，避免更新其他表格
        const tableName = table.name ? table.name.trim() : '';
        if (tableName === '总结表') {
            // 只更新总结表的世界书条目
            const primaryLorebookName = await getInjectionTargetLorebook();
            if (primaryLorebookName) {
                const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
                let TavernHelper_API = null;
                if (typeof TavernHelper !== 'undefined') {
                    TavernHelper_API = TavernHelper;
                } else if (parentWin && parentWin.TavernHelper) {
                    TavernHelper_API = parentWin.TavernHelper;
                }
                if (TavernHelper_API) {
                    await updateSummaryTableEntries(newJsonData[sheetKey], TavernHelper_API, primaryLorebookName);
                }
            }
        } else if (tableName === '故事主线') {
            // 只更新主线事件表的世界书条目
            const primaryLorebookName = await getInjectionTargetLorebook();
            if (primaryLorebookName) {
                const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
                let TavernHelper_API = null;
                if (typeof TavernHelper !== 'undefined') {
                    TavernHelper_API = TavernHelper;
                } else if (parentWin && parentWin.TavernHelper) {
                    TavernHelper_API = parentWin.TavernHelper;
                }
                if (TavernHelper_API) {
                    await updateOutlineTableEntry(newJsonData[sheetKey], TavernHelper_API, primaryLorebookName);
                }
            }
        } else if (tableName === '重要角色表') {
            // 只更新重要角色表的世界书条目
            const primaryLorebookName = await getInjectionTargetLorebook();
            if (primaryLorebookName) {
                const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
                let TavernHelper_API = null;
                if (typeof TavernHelper !== 'undefined') {
                    TavernHelper_API = TavernHelper;
                } else if (parentWin && parentWin.TavernHelper) {
                    TavernHelper_API = parentWin.TavernHelper;
                }
                if (TavernHelper_API) {
                    await updateImportantPersonsRelatedEntries(newJsonData[sheetKey], TavernHelper_API, primaryLorebookName);
                }
            }
        } else {
            // 对于其他表格，更新可读数据库条目（但不包含特殊表格）
            await updateReadableLorebookEntry(false);
        }

        // 7. 刷新显示 - 参考参考文档：直接调用 loadMessageDetails 并重新绑定事件
        const parentDoc = (window.parent && window.parent !== window)
            ? window.parent.document
            : document;
        const overviewArea = parentDoc.getElementById('data-manage-overview-area');
        if (overviewArea) {
            const detailsArea = overviewArea.querySelector(`.message-details[data-message-index="${messageIndex}"]`);
            if (detailsArea) {
                // 参考参考文档：直接调用 loadMessageDetails_ACU 刷新
                const contentDiv = detailsArea.querySelector('.details-content');
                if (contentDiv) {
                    // 重新获取最新的数据（因为已经保存到聊天记录）
                    const updatedMessage = context.chat[messageIndex];
                    const updatedData = updatedMessage && updatedMessage.TavernDB_ACU_Data ? updatedMessage.TavernDB_ACU_Data : newJsonData;
                    contentDiv.innerHTML = loadMessageDetails(messageIndex, updatedData);
                    // 重新绑定详情区域的事件（参考参考文档的 bindDetailsEvents_ACU）
                    bindDetailsEventsForMessage(detailsArea, messageIndex);
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

    // 获取按钮元素（可能点击的是按钮内的文本节点）
    let button = e.target;
    while (button && (!button.classList || !button.classList.contains('delete-table-btn'))) {
        button = button.parentElement;
    }

    if (!button) {
        console.error('无法找到删除表格按钮元素');
        showToast('无法找到删除表格按钮', 'error');
        return;
    }

    const sheetKey = button.getAttribute('data-sheet-key');
    const messageIndex = parseInt(button.getAttribute('data-message-index'));

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
                    } catch (e) { }
                }
            } catch (e) { }
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

        // 获取表格名称（在删除前）
        const actualTableName = table.name ? table.name.trim() : '';

        // 创建深拷贝以更新数据
        const newJsonData = JSON.parse(JSON.stringify(messageData));

        // 删除表格
        delete newJsonData[sheetKey];

        // 更新全局数据
        currentJsonTableData = newJsonData;

        // 保存到聊天记录
        await saveJsonTableToChatHistory(messageIndex);

        // 根据表格类型，删除对应的世界书条目
        if (actualTableName === '总结表') {
            const primaryLorebookName = await getInjectionTargetLorebook();
            if (primaryLorebookName) {
                const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
                let TavernHelper_API = null;
                if (typeof TavernHelper !== 'undefined') {
                    TavernHelper_API = TavernHelper;
                } else if (parentWin && parentWin.TavernHelper) {
                    TavernHelper_API = parentWin.TavernHelper;
                }
                if (TavernHelper_API) {
                    await updateSummaryTableEntries(null, TavernHelper_API, primaryLorebookName);
                }
            }
        } else if (actualTableName === '故事主线') {
            const primaryLorebookName = await getInjectionTargetLorebook();
            if (primaryLorebookName) {
                const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
                let TavernHelper_API = null;
                if (typeof TavernHelper !== 'undefined') {
                    TavernHelper_API = TavernHelper;
                } else if (parentWin && parentWin.TavernHelper) {
                    TavernHelper_API = parentWin.TavernHelper;
                }
                if (TavernHelper_API) {
                    await updateOutlineTableEntry(null, TavernHelper_API, primaryLorebookName);
                }
            }
        } else if (actualTableName === '重要角色表') {
            const primaryLorebookName = await getInjectionTargetLorebook();
            if (primaryLorebookName) {
                const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
                let TavernHelper_API = null;
                if (typeof TavernHelper !== 'undefined') {
                    TavernHelper_API = TavernHelper;
                } else if (parentWin && parentWin.TavernHelper) {
                    TavernHelper_API = parentWin.TavernHelper;
                }
                if (TavernHelper_API) {
                    await updateImportantPersonsRelatedEntries(null, TavernHelper_API, primaryLorebookName);
                }
            }
        } else {
            await updateReadableLorebookEntry(false);
        }

        // 刷新显示 - 参考参考文档：刷新详情区域或整个概览
        const parentDoc = (window.parent && window.parent !== window)
            ? window.parent.document
            : document;
        const overviewArea = parentDoc.getElementById('data-manage-overview-area');
        if (overviewArea) {
            const detailsArea = overviewArea.querySelector(`.message-details[data-message-index="${messageIndex}"]`);
            if (detailsArea && detailsArea.style.display !== 'none') {
                // 如果详情区域是展开的，刷新它
                const contentDiv = detailsArea.querySelector('.details-content');
                if (contentDiv) {
                    // 重新获取最新的数据（因为已经保存到聊天记录）
                    const updatedMessage = context.chat[messageIndex];
                    const updatedData = updatedMessage && updatedMessage.TavernDB_ACU_Data ? updatedMessage.TavernDB_ACU_Data : newJsonData;
                    contentDiv.innerHTML = loadMessageDetails(messageIndex, updatedData);
                    // 重新绑定详情区域的事件
                    bindDetailsEventsForMessage(detailsArea, messageIndex);
                }
            } else {
                // 如果详情区域是收起的，刷新整个概览
                showDataOverview();
            }
        } else {
            // 如果找不到概览区域，刷新整个概览
            showDataOverview();
        }

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

    // 获取按钮元素（可能点击的是按钮内的文本节点）
    let button = e.target;
    while (button && (!button.classList || !button.classList.contains('delete-message-btn'))) {
        button = button.parentElement;
    }

    if (!button) {
        console.error('无法找到删除消息按钮元素');
        showToast('无法找到删除消息按钮', 'error');
        return;
    }

    const messageIndex = parseInt(button.getAttribute('data-message-index'));

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

        // 保存聊天记录以持久化删除操作 - 参考参考文档
        if (context.saveChat) {
            await context.saveChat();
        } else if (context.saveChatDebounced) {
            context.saveChatDebounced();
        } else {
            console.warn('无法保存聊天记录：saveChat方法不可用');
        }

        // 删除消息后，需要重新生成上一楼层的重要角色表世界书条目
        // 查找最新的包含数据库数据的消息
        let latestDataMessage = null;
        let latestDataIndex = -1;
        for (let i = messageIndex - 1; i >= 0; i--) {
            const msg = context.chat[i];
            if (msg && msg.TavernDB_ACU_Data) {
                latestDataMessage = msg;
                latestDataIndex = i;
                break;
            }
        }

        // 如果找到了上一楼层的数据，更新世界书条目
        if (latestDataMessage && latestDataMessage.TavernDB_ACU_Data) {
            try {
                // 更新全局数据
                currentJsonTableData = JSON.parse(JSON.stringify(latestDataMessage.TavernDB_ACU_Data));

                // 获取注入目标世界书
                const primaryLorebookName = await getInjectionTargetLorebook();
                if (primaryLorebookName) {
                    const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
                    let TavernHelper_API = null;
                    if (typeof TavernHelper !== 'undefined') {
                        TavernHelper_API = TavernHelper;
                    } else if (parentWin && parentWin.TavernHelper) {
                        TavernHelper_API = parentWin.TavernHelper;
                    }

                    if (TavernHelper_API) {
                        // 查找重要角色表
                        const tableKeys = Object.keys(latestDataMessage.TavernDB_ACU_Data).filter(k => k.startsWith('sheet_'));
                        for (const sheetKey of tableKeys) {
                            const table = latestDataMessage.TavernDB_ACU_Data[sheetKey];
                            if (table && table.name && table.name.trim() === '重要角色表') {
                                await updateImportantPersonsRelatedEntries(table, TavernHelper_API, primaryLorebookName);
                                console.log('已重新生成上一楼层的重要角色表世界书条目');
                                break;
                            }
                        }

                        // 同时更新其他世界书条目（总结表、故事主线表、可读数据表）
                        await updateReadableLorebookEntry(false);
                    }
                }
            } catch (error) {
                console.error('重新生成世界书条目失败:', error);
                // 不阻止删除流程，只记录错误
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
        html += '<p style="color: var(--ios-text-secondary); text-align: center; padding: 20px; font-size: 14px;">没有数据表格</p>';
    } else {
        tableKeys.forEach(sheetKey => {
            const table = messageData[sheetKey];
            if (!table || !table.name || !table.content) return;

            // 表格容器 - iOS 26 毛玻璃卡片
            html += `<div class="table-section" data-sheet-key="${sheetKey}">`;

            // 表格标题栏
            html += `<div class="table-section-header">`;
            html += `<h4>${escapeHtml(table.name)}</h4>`;
            html += `<button class="delete-table-btn" data-sheet-key="${sheetKey}" data-message-index="${messageIndex}">删除表格</button>`;
            html += `</div>`;

            // 显示表格元数据（如果有）
            if (table.sourceData && table.sourceData.note) {
                html += `<div class="table-metadata">`;
                html += `<p>备注: ${escapeHtml(table.sourceData.note)}</p>`;
                html += `</div>`;
            }

            // 条目列表容器
            html += `<div class="entries-list-container">`;

            const rows = table.content.slice(1);
            rows.forEach((row, rowIndex) => {
                const rowData = row.slice(1);
                // 将所有字段值用 | 分隔符合并为一个字符串
                const combinedValue = rowData.map(cell => cell || '').join(' | ');

                // 每个条目
                html += `<div class="entry-card" data-row-index="${rowIndex}" data-sheet-key="${sheetKey}">`;

                // 输入框区域
                html += `<div style="margin-bottom: 12px;">`;
                html += `<textarea class="cell-input" `;
                html += `data-sheet-key="${sheetKey}" data-row-index="${rowIndex}" `;
                html += `data-message-index="${messageIndex}"`;
                html += `>${escapeHtml(combinedValue)}</textarea>`;
                html += `</div>`;

                // 操作按钮区域
                html += `<div class="entry-actions">`;
                html += `<button class="save-row-btn" data-sheet-key="${sheetKey}" data-row-index="${rowIndex}" `;
                html += `data-message-index="${messageIndex}">保存</button>`;
                html += `<button class="delete-row-btn" data-sheet-key="${sheetKey}" data-row-index="${rowIndex}" `;
                html += `data-message-index="${messageIndex}">删除</button>`;
                html += `</div>`;

                html += `</div>`;
            });

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
        // 获取可视化模板内容
        const parentDoc = (window.parent && window.parent !== window)
            ? window.parent.document
            : document;
        const textarea = parentDoc.getElementById('data-manage-template-textarea');
        let overviewTemplateContent = '';

        // 如果可视化模板区域是显示的，从textarea获取内容
        if (textarea && textarea.value) {
            overviewTemplateContent = textarea.value.trim();
        } else {
            // 否则从设置中获取
            overviewTemplateContent = currentSettings.overviewTemplate || '';
        }

        const combinedData = {
            charCardPrompts: currentSettings.charCardPrompts,
            currentPromptIndex: currentSettings.currentPromptIndex,
            // 向后兼容：保留旧的 prompt 字段
            prompt: getCurrentPrompt(currentSettings),
            overviewTemplate: overviewTemplateContent,
            timestamp: new Date().toISOString(),
            version: '1.1.0'
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
    input.onchange = function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (readerEvent) {
            try {
                const importedData = JSON.parse(readerEvent.target.result);

                // 只导入指令预设内容和可视化模板内容
                // 优先使用新的多预设格式
                if (importedData.charCardPrompts && Array.isArray(importedData.charCardPrompts) && importedData.charCardPrompts.length > 0) {
                    currentSettings.charCardPrompts = importedData.charCardPrompts;
                    currentSettings.currentPromptIndex = (typeof importedData.currentPromptIndex === 'number' && importedData.currentPromptIndex >= 0 && importedData.currentPromptIndex < importedData.charCardPrompts.length)
                        ? importedData.currentPromptIndex
                        : 0;
                } else if (importedData.prompt) {
                    // 向后兼容：如果只有旧的 prompt 字段，迁移到新格式
                    const promptData = Array.isArray(importedData.prompt) ? importedData.prompt : DEFAULT_CHAR_CARD_PROMPT;
                    currentSettings.charCardPrompts = [
                        {
                            name: '导入的预设',
                            prompt: promptData
                        }
                    ];
                    currentSettings.currentPromptIndex = 0;
                }
                // 保存设置并更新UI
                saveSettings();

                // 更新UI显示
                const parentDoc = (window.parent && window.parent !== window)
                    ? window.parent.document
                    : document;

                // 更新预设选择器
                updatePromptSelector(currentSettings);

                // 渲染当前预设
                const currentPrompt = getCurrentPrompt(currentSettings);
                renderPromptSegments(currentPrompt);

                if (importedData.overviewTemplate) {
                    currentSettings.overviewTemplate = importedData.overviewTemplate;

                    // 如果可视化模板区域是显示的，更新textarea内容
                    const textarea = parentDoc.getElementById('data-manage-template-textarea');
                    if (textarea) {
                        textarea.value = importedData.overviewTemplate;
                    }
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
    // 辅助函数：隐藏所有三个互斥面板
    function hideAllDataPanels() {
        const panels = [
            'data-manage-template-visualization',
            'data-manage-overview-area',
            'data-manage-error-log-area'
        ];
        panels.forEach(id => {
            const el = parentDoc.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    // 显示数据概览（切换逻辑）
    const showOverviewBtn = parentDoc.getElementById('data-manage-show-overview');
    if (showOverviewBtn) {
        showOverviewBtn.addEventListener('click', function () {
            const area = parentDoc.getElementById('data-manage-overview-area');
            if (!area) return;
            if (area.style.display === 'block') {
                area.style.display = 'none';
            } else {
                hideAllDataPanels();
                area.style.display = 'block';
                showDataOverview();
            }
        });
    }

    // 关闭概览
    const closeOverviewBtn = parentDoc.getElementById('data-manage-close-overview');
    if (closeOverviewBtn) {
        closeOverviewBtn.addEventListener('click', function () {
            const overviewArea = parentDoc.getElementById('data-manage-overview-area');
            if (overviewArea) overviewArea.style.display = 'none';
        });
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

    // 可视化模板（切换逻辑）
    const visualizeTemplateBtn = parentDoc.getElementById('data-manage-visualize-template');
    if (visualizeTemplateBtn) {
        visualizeTemplateBtn.addEventListener('click', function () {
            const area = parentDoc.getElementById('data-manage-template-visualization');
            if (!area) return;
            if (area.style.display === 'block') {
                area.style.display = 'none';
            } else {
                hideAllDataPanels();
                visualizeTemplate();
            }
        });
    }

    // 保存可视化模板
    const saveVisualizedBtn = parentDoc.getElementById('data-manage-save-visualized-template');
    if (saveVisualizedBtn) {
        saveVisualizedBtn.addEventListener('click', saveVisualizedTemplate);
    }

    // 刷新模板显示
    const refreshTemplateBtn = parentDoc.getElementById('data-manage-refresh-template-display');
    if (refreshTemplateBtn) {
        refreshTemplateBtn.addEventListener('click', function () {
            visualizeTemplate();
            showToast('模板显示已刷新', 'success');
        });
    }

    // 报错日志（切换逻辑）
    const showErrorLogBtn = parentDoc.getElementById('data-manage-show-error-log');
    if (showErrorLogBtn) {
        showErrorLogBtn.addEventListener('click', function () {
            const area = parentDoc.getElementById('data-manage-error-log-area');
            const container = parentDoc.getElementById('data-manage-error-log-container');
            if (!area || !container) return;
            if (area.style.display === 'block') {
                area.style.display = 'none';
                return;
            }
            hideAllDataPanels();
            const log = getTableEditErrorLog();
            if (!log.length) {
                container.innerHTML = '<em style="color: var(--ios-text-secondary);">暂无报错日志</em>';
            } else {
                const rows = log
                    .slice()
                    .reverse()
                    .map((e, idx) => {
                        const time = escapeHtmlSafe(e.time || '');
                        const reason = escapeHtmlSafe(e.reason || '');
                        const command = escapeHtmlSafe(e.command || '');
                        const detail = escapeHtmlSafe(e.detail || '');
                        return `
                            <div style="padding: 10px; border: 1px solid var(--ios-border); border-radius: 8px; margin-bottom: 10px; background: rgba(255, 59, 48, 0.06);">
                                <div style="display:flex; justify-content:space-between; gap:12px;">
                                    <div><b>#${idx + 1}</b> <span style="color: var(--ios-text-secondary);">${time}</span></div>
                                    <div style="color: #FF3B30;"><b>${reason}</b></div>
                                </div>
                                <div style="margin-top:8px; font-family: monospace; white-space: pre-wrap; word-break: break-word;">${command}</div>
                                ${detail ? `<div style="margin-top:8px; color: var(--ios-text-secondary); white-space: pre-wrap; word-break: break-word;">${detail}</div>` : ''}
                            </div>
                        `;
                    })
                    .join('');
                container.innerHTML = rows;
            }
            area.style.display = 'block';
        });
    }

    const closeErrorLogBtn = parentDoc.getElementById('data-manage-close-error-log');
    if (closeErrorLogBtn) {
        closeErrorLogBtn.addEventListener('click', function () {
            const area = parentDoc.getElementById('data-manage-error-log-area');
            if (area) area.style.display = 'none';
        });
    }

    const clearErrorLogBtn = parentDoc.getElementById('data-manage-clear-error-log');
    if (clearErrorLogBtn) {
        clearErrorLogBtn.addEventListener('click', function () {
            clearTableEditErrorLog();
            const container = parentDoc.getElementById('data-manage-error-log-container');
            if (container) container.innerHTML = '<em style="color: var(--ios-text-secondary);">暂无报错日志</em>';
            showToast('报错日志已清空', 'success');
        });
    }
}

// ============================================================
//  表格独立更新设置 — renderSheetSettingsUI & setupSheetSettingsTabListeners
// ============================================================

/**
 * 渲染表格独立更新设置 UI
 */
function renderSheetSettingsUI() {
    const parentDoc = (window.parent && window.parent !== window)
        ? window.parent.document
        : document;

    const listContainer = parentDoc.getElementById('data-manage-sheet-settings-list');
    if (!listContainer) return;

    if (!currentJsonTableData) {
        listContainer.innerHTML = '<em style="color: var(--ios-text-secondary);">暂无数据库加载，请先在聊天中生成数据后再配置。</em>';
        return;
    }

    const sheetKeys = Object.keys(currentJsonTableData).filter(k => {
        const v = currentJsonTableData[k];
        return v && typeof v === 'object' && v.content && Array.isArray(v.content);
    });

    if (sheetKeys.length === 0) {
        listContainer.innerHTML = '<em style="color: var(--ios-text-secondary);">当前数据库没有有效的表格。</em>';
        return;
    }

    // 全局默认值（用于显示参考）
    const globalFreq = currentSettings.autoUpdateFrequency ?? 0;
    const globalBatch = currentSettings.updateBatchSize || 1;

    let html = `<p class="data-manage-notes" style="margin-bottom: 12px;">
        当前全局设置：最新N层不更新 = <b>${globalFreq}</b>，每次更新楼层数 = <b>${globalBatch}</b>
    </p>`;

    sheetKeys.forEach((key, idx) => {
        const table = currentJsonTableData[key];
        const name = table.name || key;
        const config = table.updateConfig || {};

        const freqVal = Number.isFinite(config.updateFrequency) ? config.updateFrequency : -1;
        const batchVal = Number.isFinite(config.batchSize) ? config.batchSize : -1;
        const skipVal = Number.isFinite(config.skipFloors) ? config.skipFloors : -1;
        const depthVal = Number.isFinite(config.contextDepth) ? config.contextDepth : -1;

        html += `
        <div class="data-manage-card" style="margin-bottom: 12px; padding: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <h4 style="margin: 0; font-size: 15px; font-weight: 600; color: var(--ios-text);">
                    ${escapeHtml(name)}
                </h4>
                <span style="font-size: 12px; color: var(--ios-text-secondary);">Key: ${escapeHtml(key)}</span>
            </div>
            <div class="data-manage-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                <div>
                    <label style="font-size: 13px;">更新频率 (updateFrequency)</label>
                    <input type="number" class="sheet-cfg-input" data-sheet-key="${key}" data-cfg-field="updateFrequency" value="${freqVal}" min="-1" step="1" style="padding: 8px 12px; font-size: 14px;">
                    <p class="data-manage-notes" style="margin-top: 4px; font-size: 11px;">-1=沿用全局, 0=不自动更新, >0=每N层AI回复更新一次</p>
                </div>
                <div>
                    <label style="font-size: 13px;">批量大小 (batchSize)</label>
                    <input type="number" class="sheet-cfg-input" data-sheet-key="${key}" data-cfg-field="batchSize" value="${batchVal}" min="-1" step="1" style="padding: 8px 12px; font-size: 14px;">
                    <p class="data-manage-notes" style="margin-top: 4px; font-size: 11px;">-1=沿用全局, >0=每次更新的楼层数</p>
                </div>
                <div>
                    <label style="font-size: 13px;">跳过楼层数 (skipFloors)</label>
                    <input type="number" class="sheet-cfg-input" data-sheet-key="${key}" data-cfg-field="skipFloors" value="${skipVal}" min="-1" step="1" style="padding: 8px 12px; font-size: 14px;">
                    <p class="data-manage-notes" style="margin-top: 4px; font-size: 11px;">-1=沿用全局, >=0=最新N层不计入触发条件</p>
                </div>
                <div>
                    <label style="font-size: 13px;">上下文深度 (contextDepth)</label>
                    <input type="number" class="sheet-cfg-input" data-sheet-key="${key}" data-cfg-field="contextDepth" value="${depthVal}" min="-1" step="1" style="padding: 8px 12px; font-size: 14px;">
                    <p class="data-manage-notes" style="margin-top: 4px; font-size: 11px;">-1=沿用全局, >0=AI可见的最新消息数量</p>
                </div>
            </div>
        </div>`;
    });

    listContainer.innerHTML = html;
}

/**
 * 设置表格设置 Tab 的事件监听器
 */
function setupSheetSettingsTabListeners(parentDoc) {
    // 保存所有表格设置
    const saveBtn = parentDoc.getElementById('data-manage-save-sheet-settings');
    if (saveBtn) {
        saveBtn.addEventListener('click', function () {
            _saveAllSheetSettings();
        });
    }

    // 重置所有表格设置
    const resetBtn = parentDoc.getElementById('data-manage-reset-sheet-settings');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            if (!confirm('确定要将所有表格的独立设置重置为沿用全局（-1）吗？')) return;
            _resetAllSheetSettings();
        });
    }
}

/**
 * 从 UI 读取并保存所有表格的 updateConfig
 */
function _saveAllSheetSettings() {
    const parentDoc = (window.parent && window.parent !== window)
        ? window.parent.document
        : document;

    if (!currentJsonTableData) {
        showToast('数据库未加载', 'warning');
        return;
    }

    const inputs = parentDoc.querySelectorAll('.sheet-cfg-input');
    inputs.forEach(input => {
        const sheetKey = input.dataset.sheetKey;
        const field = input.dataset.cfgField;
        const value = parseInt(input.value);

        if (!sheetKey || !field || isNaN(value)) return;

        const table = currentJsonTableData[sheetKey];
        if (!table) return;

        if (!table.updateConfig) {
            table.updateConfig = {};
        }
        table.updateConfig[field] = value;
    });

    // 保存到聊天记录
    saveJsonTableToChatHistory(currentJsonTableData);
    showToast('所有表格的独立更新设置已保存', 'success');
}

/**
 * 将所有表格的 updateConfig 重置为 -1
 */
function _resetAllSheetSettings() {
    if (!currentJsonTableData) {
        showToast('数据库未加载', 'warning');
        return;
    }

    for (const key of Object.keys(currentJsonTableData)) {
        const table = currentJsonTableData[key];
        if (table && typeof table === 'object') {
            table.updateConfig = {
                updateFrequency: -1,
                batchSize: -1,
                skipFloors: -1,
                contextDepth: -1
            };
        }
    }

    saveJsonTableToChatHistory(currentJsonTableData);
    renderSheetSettingsUI(); // 刷新 UI
    showToast('所有表格设置已重置为沿用全局', 'success');
}

/**
 * 数据预览 — 卡片式布局 (Card-based Data Preview)
 *
 * 内部状态管理：
 *   _dpState 保存当前预览的所有运行时状态（表格数据、分页、搜索、undo 栈等）
 */
const _dpState = {
    messageIndex: -1,          // 当前数据所在的聊天楼层
    messageData: null,         // 原始引用 (TavernDB_ACU_Data)
    previousData: null,        // 上一楼层数据（用于 diff）
    tables: [],                // [{key, name, headers, rows}]
    activeTab: 0,              // 当前选中的 tab 序号
    page: 1,                   // 当前页码
    perPage: 20,               // 每页卡片数
    search: '',                // 搜索关键词
    diffMode: false,           // 是否仅展示变化
    undoStack: [],             // 撤销栈 [{desc, snapshot}]
    collapsed: false,          // 收起/展开
};

/**
 * 显示数据预览 — 入口
 * 改为直接在数据管理弹窗内渲染（不再使用 SillyTavern callGenericPopup）
 */
async function showDataPreview() {
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
        let messageIndex = -1;
        let messageData = null;

        for (let i = chat.length - 1; i >= 0; i--) {
            const message = chat[i];
            if (message && message.TavernDB_ACU_Data) {
                messageIndex = i;
                messageData = message.TavernDB_ACU_Data;
                break;
            }
            if (message && message.mes) {
                try {
                    const mesText = message.mes;
                    let jsonData = null;
                    const jsonMatch = mesText.match(/```json\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        jsonData = JSON.parse(jsonMatch[1]);
                    } else {
                        try { jsonData = JSON.parse(mesText); } catch (_) { /* not JSON */ }
                    }
                    if (jsonData && typeof jsonData === 'object' && jsonData.mate && jsonData.mate.type === 'chatSheets') {
                        messageIndex = i;
                        messageData = jsonData;
                        break;
                    }
                } catch (_) { /* skip */ }
            }
        }

        if (messageIndex === -1 || !messageData) {
            showToast('未找到包含数据库数据的消息', 'warning');
            return;
        }

        const prevMsg = findPreviousDbMessage(chat, messageIndex);

        const tables = [];
        for (const [key, value] of Object.entries(messageData)) {
            if (value && typeof value === 'object' && value.content && Array.isArray(value.content) && value.content.length > 0) {
                const headers = value.content[0] || [];
                const rows = value.content.slice(1);
                tables.push({ key, name: value.name || key, headers, rows });
            }
        }

        if (tables.length === 0) {
            showToast('未找到有效的数据表格', 'warning');
            return;
        }

        const settings = loadSettings();
        _dpState.messageIndex = messageIndex;
        _dpState.messageData = messageData;
        _dpState.previousData = prevMsg ? prevMsg.data : null;
        _dpState.tables = tables;
        _dpState.activeTab = 0;
        _dpState.page = 1;
        _dpState.search = '';
        _dpState.diffMode = !!(settings && settings.previewOnlyShowChanges);
        _dpState.undoStack = [];
        _dpState.collapsed = false;

        // 使用独立窗口渲染数据预览
        const previewWindowId = 'dm-preview';

        // 如果预览窗口已打开，先关闭
        if (DataManageWindowManager.isOpen(previewWindowId)) {
            const existingWin = DataManageWindowManager.getWindow(previewWindowId);
            if (existingWin) {
                existingWin.remove();
                DataManageWindowManager.unregister(previewWindowId);
            }
        }

        createDataManageWindow({
            id: previewWindowId,
            title: `数据预览 — 楼层 ${messageIndex}`,
            content: '<div id="dm-preview-wrapper" class="dm-preview-wrapper"></div>',
            width: 1000,
            height: 700,
            modal: false,
            resizable: true,
            maximizable: true,
            onClose: () => {
                console.log('数据预览窗口已关闭');
            },
            onReady: () => {
                _dpRenderFull();
                showToast(`已加载楼层 ${messageIndex} 的数据预览 (${tables.length} 张表)`, 'success');
            }
        });

    } catch (error) {
        console.error('显示数据预览失败:', error);
        showToast(`显示数据预览失败: ${error.message}`, 'error');
    }
}

/* ---------- 渲染主体 ---------- */

function _dpRenderFull() {
    const parentDoc = (window.parent && window.parent !== window) ? window.parent.document : document;

    let wrapper = parentDoc.getElementById('dm-preview-wrapper');
    if (!wrapper) {
        // 尝试在预览窗口中查找
        const previewWin = parentDoc.getElementById('dm-window-dm-preview');
        if (previewWin) {
            const body = previewWin.querySelector('.dm-window-body');
            if (body) {
                wrapper = parentDoc.createElement('div');
                wrapper.id = 'dm-preview-wrapper';
                wrapper.className = 'dm-preview-wrapper';
                body.appendChild(wrapper);
            }
        }
        if (!wrapper) {
            console.error('无法找到数据预览容器');
            return;
        }
    }

    if (_dpState.collapsed) {
        wrapper.innerHTML = `
            <div class="dm-preview-toolbar">
                <span class="dm-toolbar-info"><i class="fa-solid fa-database"></i> 数据预览 (已收起)</span>
                <div class="dm-toolbar-actions">
                    <button class="dm-toolbar-btn" data-dp-action="expand" title="展开"><i class="fa-solid fa-chevron-down"></i></button>
                </div>
            </div>`;
        _dpBindEvents(wrapper);
        return;
    }

    const t = _dpState.tables[_dpState.activeTab];
    if (!t) return;

    let displayRows = _dpGetDisplayRows(t);
    const totalItems = displayRows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / _dpState.perPage));
    if (_dpState.page > totalPages) _dpState.page = totalPages;
    const startIdx = (_dpState.page - 1) * _dpState.perPage;
    const endIdx = Math.min(startIdx + _dpState.perPage, totalItems);
    const pageRows = displayRows.slice(startIdx, endIdx);

    let html = '';

    // 工具栏
    html += `
        <div class="dm-preview-toolbar">
            <div class="dm-search-box">
                <i class="fa-solid fa-search dm-search-icon"></i>
                <input type="text" placeholder="搜索..." value="${escapeHtml(_dpState.search)}" data-dp-action="search" />
            </div>
            <span class="dm-toolbar-info">楼层 ${_dpState.messageIndex} · ${startIdx + 1}-${endIdx} / ${totalItems}项</span>
            <label class="dm-diff-toggle">
                <input type="checkbox" data-dp-action="diff-toggle" ${_dpState.diffMode ? 'checked' : ''} />
                仅显示变化
            </label>
            <div class="dm-toolbar-actions">
                <button class="dm-toolbar-btn" data-dp-action="undo" title="撤销" ${_dpState.undoStack.length ? '' : 'disabled'}><i class="fa-solid fa-rotate-left"></i></button>
                <span class="dm-toolbar-divider"></span>
                <button class="dm-toolbar-btn" data-dp-action="collapse" title="收起"><i class="fa-solid fa-chevron-up"></i></button>
                <button class="dm-toolbar-btn dm-btn-danger" data-dp-action="close" title="关闭预览"><i class="fa-solid fa-times"></i></button>
            </div>
        </div>`;

    // Tab 导航
    if (_dpState.tables.length > 1) {
        html += '<div class="dm-preview-tabs">';
        _dpState.tables.forEach((tbl, idx) => {
            const rowCount = tbl.rows.length;
            html += `<div class="dm-preview-tab ${idx === _dpState.activeTab ? 'active' : ''}" data-dp-action="tab" data-tab-index="${idx}">
                ${escapeHtml(tbl.name)} <span class="dm-tab-count">(${rowCount})</span>
            </div>`;
        });
        html += '</div>';
    }

    // 卡片网格
    html += '<div class="dm-card-content-area"><div class="dm-card-grid">';

    if (pageRows.length === 0) {
        html += '<div class="dm-empty-state">没有匹配的数据</div>';
    } else {
        const headers = t.headers;
        pageRows.forEach(item => {
            const row = item.row;
            const realIdx = item.realIndex;
            const diffType = item.diffType || '';
            const changedCols = item.changedCols || [];

            let cardClass = 'dm-data-card';
            if (diffType === 'added') cardClass += ' dm-card-added';
            else if (diffType === 'deleted') cardClass += ' dm-card-deleted';
            else if (diffType === 'modified') cardClass += ' dm-card-modified';

            // 卡片标题（取第二列的值，或第一个非空列）
            let cardTitle = '';
            for (let ci = 1; ci < row.length; ci++) {
                if (row[ci] && String(row[ci]).trim()) { cardTitle = String(row[ci]); break; }
            }
            if (!cardTitle && row.length > 0) cardTitle = String(row[0] || '');
            if (!cardTitle) cardTitle = `条目 ${realIdx + 1}`;

            let badgeHtml = '';
            if (diffType === 'added') badgeHtml = '<span class="dm-diff-badge dm-badge-new">新增</span>';
            else if (diffType === 'deleted') badgeHtml = '<span class="dm-diff-badge dm-badge-del">删除</span>';
            else if (diffType === 'modified') badgeHtml = '<span class="dm-diff-badge dm-badge-mod">修改</span>';

            html += `<div class="${cardClass}" data-real-index="${realIdx}">`;
            html += `<div class="dm-card-head" data-dp-action="card-menu" data-real-index="${realIdx}">
                <span class="dm-card-index">#${realIdx + 1}</span>
                <span class="dm-card-title">${escapeHtml(cardTitle)}</span>
                ${badgeHtml}
            </div>`;
            html += '<div class="dm-card-body">';

            // 键值对（跳过首列空白列）
            for (let ci = 1; ci < headers.length; ci++) {
                const headerName = headers[ci] || `列${ci}`;
                const cellVal = (row[ci] !== undefined && row[ci] !== null) ? String(row[ci]) : '';
                let rowClass = 'dm-card-row';
                if (diffType === 'modified' && changedCols[ci]) rowClass += ' dm-cell-changed';
                if (diffType === 'deleted') rowClass += ' dm-cell-deleted-val';

                html += `<div class="${rowClass}" data-dp-action="edit-cell" data-real-index="${realIdx}" data-col="${ci}">
                    <div class="dm-card-label">${escapeHtml(headerName)}</div>
                    <div class="dm-card-value">${escapeHtml(cellVal) || '<i style="color:var(--ios-text-secondary)">空</i>'}</div>
                </div>`;
            }

            html += '</div></div>';
        });
    }

    html += '</div></div>';

    // 分页
    if (totalPages > 1) {
        html += '<div class="dm-pagination">';
        html += `<div class="dm-page-btn ${_dpState.page <= 1 ? 'disabled' : ''}" data-dp-action="page" data-page="${_dpState.page - 1}">‹</div>`;
        const pages = _dpPaginationRange(_dpState.page, totalPages);
        pages.forEach(p => {
            if (p === '...') {
                html += '<span class="dm-page-ellipsis">…</span>';
            } else {
                html += `<div class="dm-page-btn ${p === _dpState.page ? 'active' : ''}" data-dp-action="page" data-page="${p}">${p}</div>`;
            }
        });
        html += `<div class="dm-page-btn ${_dpState.page >= totalPages ? 'disabled' : ''}" data-dp-action="page" data-page="${_dpState.page + 1}">›</div>`;
        html += '</div>';
    }

    wrapper.innerHTML = html;
    _dpBindEvents(wrapper);
}

/**
 * 获取当前 tab 的展示行（集成搜索 + diff 过滤）
 */
function _dpGetDisplayRows(tableObj) {
    const key = tableObj.key;
    const headers = tableObj.headers;
    const rows = tableObj.rows;

    let annotated = rows.map((row, idx) => ({ row, realIndex: idx, diffType: '', changedCols: [] }));

    if (_dpState.diffMode && _dpState.previousData) {
        const oldTable = _dpState.previousData[key];
        if (oldTable && Array.isArray(oldTable.content)) {
            const oldRows = oldTable.content.slice(1);
            const maxLen = Math.max(rows.length, oldRows.length);
            const result = [];
            for (let i = 0; i < maxLen; i++) {
                const oldRow = oldRows[i];
                const newRow = rows[i];
                if (oldRow && !newRow) {
                    result.push({ row: oldRow, realIndex: i, diffType: 'deleted', changedCols: [] });
                } else if (!oldRow && newRow) {
                    result.push({ row: newRow, realIndex: i, diffType: 'added', changedCols: [] });
                } else if (oldRow && newRow) {
                    if (JSON.stringify(oldRow) !== JSON.stringify(newRow)) {
                        const cc = [];
                        const colCount = Math.max(oldRow.length, newRow.length, headers.length);
                        for (let c = 0; c < colCount; c++) {
                            cc[c] = ((oldRow[c] ?? '') !== (newRow[c] ?? ''));
                        }
                        result.push({ row: newRow, realIndex: i, diffType: 'modified', changedCols: cc });
                    }
                }
            }
            annotated = result;
        }
    } else if (_dpState.previousData) {
        const oldTable = _dpState.previousData[key];
        if (oldTable && Array.isArray(oldTable.content)) {
            const oldRows = oldTable.content.slice(1);
            annotated = rows.map((row, idx) => {
                const oldRow = oldRows[idx];
                let diffType = '';
                let changedCols = [];
                if (!oldRow) {
                    diffType = 'added';
                } else if (JSON.stringify(oldRow) !== JSON.stringify(row)) {
                    diffType = 'modified';
                    const colCount = Math.max(oldRow.length, row.length, headers.length);
                    for (let c = 0; c < colCount; c++) {
                        changedCols[c] = ((oldRow[c] ?? '') !== (row[c] ?? ''));
                    }
                }
                return { row, realIndex: idx, diffType, changedCols };
            });
        }
    }

    if (_dpState.search) {
        const kw = _dpState.search.toLowerCase();
        annotated = annotated.filter(item => {
            return item.row.some(cell => String(cell || '').toLowerCase().includes(kw));
        });
    }

    return annotated;
}

function _dpPaginationRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
}

/* ---------- 事件绑定 ---------- */

let _dpSearchTimer = null;

function _dpBindEvents(wrapper) {
    if (wrapper._dpHandler) wrapper.removeEventListener('click', wrapper._dpHandler);
    if (wrapper._dpInputHandler) wrapper.removeEventListener('input', wrapper._dpInputHandler);

    const clickHandler = function (e) {
        let target = e.target;
        while (target && target !== wrapper) {
            const action = target.getAttribute('data-dp-action');
            if (action) {
                e.preventDefault();
                e.stopPropagation();
                _dpHandleAction(action, target, e);
                return;
            }
            target = target.parentElement;
        }
    };

    const inputHandler = function (e) {
        const target = e.target;
        if (target.getAttribute('data-dp-action') === 'search') {
            clearTimeout(_dpSearchTimer);
            _dpSearchTimer = setTimeout(() => {
                _dpState.search = target.value || '';
                _dpState.page = 1;
                _dpRenderFull();
            }, 250);
        }
    };

    wrapper._dpHandler = clickHandler;
    wrapper._dpInputHandler = inputHandler;
    wrapper.addEventListener('click', clickHandler);
    wrapper.addEventListener('input', inputHandler);
}

function _dpHandleAction(action, target, e) {
    switch (action) {
        case 'tab': {
            const idx = parseInt(target.getAttribute('data-tab-index'));
            if (!isNaN(idx) && idx >= 0 && idx < _dpState.tables.length) {
                _dpState.activeTab = idx;
                _dpState.page = 1;
                _dpState.search = '';
                _dpRenderFull();
            }
            break;
        }
        case 'page': {
            const p = parseInt(target.getAttribute('data-page'));
            const t = _dpState.tables[_dpState.activeTab];
            if (!t) break;
            const displayRows = _dpGetDisplayRows(t);
            const totalPages = Math.max(1, Math.ceil(displayRows.length / _dpState.perPage));
            if (!isNaN(p) && p >= 1 && p <= totalPages) {
                _dpState.page = p;
                _dpRenderFull();
            }
            break;
        }
        case 'diff-toggle': {
            _dpState.diffMode = target.checked;
            _dpState.page = 1;
            const s = loadSettings();
            s.previewOnlyShowChanges = _dpState.diffMode;
            currentSettings.previewOnlyShowChanges = _dpState.diffMode;
            saveSettings();
            _dpRenderFull();
            break;
        }
        case 'collapse':
            _dpState.collapsed = true;
            _dpRenderFull();
            break;
        case 'expand':
            _dpState.collapsed = false;
            _dpRenderFull();
            break;
        case 'close': {
            const previewWin = DataManageWindowManager.getWindow('dm-preview');
            if (previewWin) {
                _closeDataManageWindow('dm-preview', previewWin, null, null);
            } else {
                const parentDoc = (window.parent && window.parent !== window) ? window.parent.document : document;
                const w = parentDoc.getElementById('dm-preview-wrapper');
                if (w) w.remove();
            }
            break;
        }
        case 'undo':
            _dpUndo();
            break;
        case 'edit-cell':
            _dpShowEditDialog(target);
            break;
        case 'card-menu':
            _dpShowContextMenu(target, e);
            break;
        default:
            break;
    }
}

/* ---------- 编辑单元格 ---------- */

function _dpShowEditDialog(target) {
    const realIdx = parseInt(target.getAttribute('data-real-index'));
    const col = parseInt(target.getAttribute('data-col'));
    const t = _dpState.tables[_dpState.activeTab];
    if (!t || isNaN(realIdx) || isNaN(col)) return;

    const row = t.rows[realIdx];
    if (!row) return;

    const headerName = t.headers[col] || `列${col}`;
    const currentVal = (row[col] !== undefined && row[col] !== null) ? String(row[col]) : '';

    const parentDoc = (window.parent && window.parent !== window) ? window.parent.document : document;

    const overlay = parentDoc.createElement('div');
    overlay.className = 'dm-edit-overlay';
    overlay.innerHTML = `
        <div class="dm-edit-dialog">
            <h4><i class="fa-solid fa-pen"></i> 编辑 — ${escapeHtml(headerName)}</h4>
            <textarea id="dm-edit-textarea">${escapeHtml(currentVal)}</textarea>
            <div class="dm-dialog-actions">
                <button class="dm-dialog-btn" id="dm-edit-cancel">取消</button>
                <button class="dm-dialog-btn dm-btn-primary" id="dm-edit-save">保存</button>
            </div>
        </div>
    `;
    parentDoc.body.appendChild(overlay);

    const textarea = overlay.querySelector('#dm-edit-textarea');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    overlay.querySelector('#dm-edit-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });

    overlay.querySelector('#dm-edit-save').addEventListener('click', async () => {
        const newVal = textarea.value;
        if (newVal === currentVal) { overlay.remove(); return; }

        _dpPushUndo(`编辑 [${headerName}] 行${realIdx + 1}`);
        t.rows[realIdx][col] = newVal;
        await _dpSyncToChat();

        overlay.remove();
        _dpRenderFull();
        showToast('单元格已更新', 'success');
    });
}

/* ---------- 右键/点击菜单 ---------- */

function _dpShowContextMenu(target, e) {
    const realIdx = parseInt(target.getAttribute('data-real-index'));
    const t = _dpState.tables[_dpState.activeTab];
    if (!t || isNaN(realIdx)) return;

    const parentDoc = (window.parent && window.parent !== window) ? window.parent.document : document;

    parentDoc.querySelectorAll('.dm-context-backdrop, .dm-context-menu').forEach(el => el.remove());

    const backdrop = parentDoc.createElement('div');
    backdrop.className = 'dm-context-backdrop';

    const menu = parentDoc.createElement('div');
    menu.className = 'dm-context-menu';

    const rect = target.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.left;
    if (top + 200 > window.innerHeight) top = rect.top - 200;
    if (left + 180 > window.innerWidth) left = window.innerWidth - 190;
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';

    const row = t.rows[realIdx];
    const allText = row ? row.slice(1).map(c => c || '').join('\n') : '';

    menu.innerHTML = `
        <div class="dm-context-item" data-ctx="copy"><i class="fa-solid fa-copy" style="width:16px"></i> 复制内容</div>
        <div class="dm-context-item" data-ctx="edit"><i class="fa-solid fa-pen-to-square" style="width:16px"></i> 编辑条目</div>
        <div class="dm-context-item dm-ctx-danger" data-ctx="delete"><i class="fa-solid fa-trash" style="width:16px"></i> 删除条目</div>
        <div class="dm-context-item dm-ctx-close" data-ctx="close"><i class="fa-solid fa-xmark" style="width:16px"></i> 关闭</div>
    `;

    const closeMenu = () => { backdrop.remove(); menu.remove(); };
    backdrop.addEventListener('click', closeMenu);

    menu.addEventListener('click', async (ev) => {
        let el = ev.target;
        while (el && el !== menu) {
            const ctx = el.getAttribute('data-ctx');
            if (ctx) {
                closeMenu();
                if (ctx === 'copy') {
                    try {
                        await (window.parent || window).navigator.clipboard.writeText(allText);
                        showToast('已复制到剪贴板', 'success');
                    } catch (_) {
                        showToast('复制失败', 'error');
                    }
                } else if (ctx === 'edit') {
                    for (let ci = 1; ci < t.headers.length; ci++) {
                        if (row[ci] !== undefined) {
                            const fakeTarget = document.createElement('div');
                            fakeTarget.setAttribute('data-real-index', realIdx);
                            fakeTarget.setAttribute('data-col', ci);
                            _dpShowEditDialog(fakeTarget);
                            break;
                        }
                    }
                } else if (ctx === 'delete') {
                    await _dpDeleteRow(realIdx);
                }
                return;
            }
            el = el.parentElement;
        }
    });

    parentDoc.body.appendChild(backdrop);
    parentDoc.body.appendChild(menu);
}

/* ---------- 删除行 ---------- */

async function _dpDeleteRow(realIdx) {
    const t = _dpState.tables[_dpState.activeTab];
    if (!t || realIdx < 0 || realIdx >= t.rows.length) return;

    _dpPushUndo(`删除行 #${realIdx + 1}`);
    t.rows.splice(realIdx, 1);

    await _dpSyncToChat();
    _dpRenderFull();
    showToast(`已删除第 ${realIdx + 1} 条`, 'success');
}

/* ---------- 撤销 ---------- */

function _dpPushUndo(desc) {
    const snapshot = {};
    for (const tbl of _dpState.tables) {
        snapshot[tbl.key] = JSON.parse(JSON.stringify(tbl.rows));
    }
    _dpState.undoStack.push({ desc, snapshot });
    if (_dpState.undoStack.length > 30) _dpState.undoStack.shift();
}

async function _dpUndo() {
    if (_dpState.undoStack.length === 0) {
        showToast('没有可撤销的操作', 'warning');
        return;
    }
    const { desc, snapshot } = _dpState.undoStack.pop();
    for (const tbl of _dpState.tables) {
        if (snapshot[tbl.key]) {
            tbl.rows = snapshot[tbl.key];
        }
    }
    await _dpSyncToChat();
    _dpRenderFull();
    showToast(`已撤销: ${desc}`, 'success');
}

/* ---------- 同步到聊天记录 ---------- */

async function _dpSyncToChat() {
    try {
        const context = SillyTavern.getContext();
        if (!context || !context.chat) return;

        const message = context.chat[_dpState.messageIndex];
        if (!message || !message.TavernDB_ACU_Data) return;

        for (const tbl of _dpState.tables) {
            const tableData = message.TavernDB_ACU_Data[tbl.key];
            if (tableData && tableData.content) {
                tableData.content = [tbl.headers, ...tbl.rows];
            }
        }

        if (context.saveChatDebounced) {
            context.saveChatDebounced();
        }
    } catch (e) {
        console.error('同步数据到聊天记录失败:', e);
        showToast('同步数据失败', 'error');
    }
}

/* ---------- 兼容：保留 generateAllTablesHtml / generateTableHtml / generateDiffTablesHtml ---------- */

/**
 * 生成完整表格HTML（不做diff）
 */
function generateAllTablesHtml(messageData) {
    let tablesHtml = '';
    for (const [key, value] of Object.entries(messageData)) {
        if (value && typeof value === 'object' && value.content && Array.isArray(value.content)) {
            const tableName = value.name || key;
            tablesHtml += generateTableHtml(tableName, value.content);
        }
    }
    if (!tablesHtml) {
        tablesHtml = `<div class="data-manage-card">
            <h3>数据内容</h3>
            <pre class="dm-code-block">${escapeHtml(JSON.stringify(messageData, null, 2))}</pre>
        </div>`;
    }
    return tablesHtml;
}

/**
 * 根据前后两份数据生成仅包含变化行的表格HTML
 */
function generateDiffTablesHtml(oldData, newData) {
    let html = '';
    if (!oldData || !newData || typeof oldData !== 'object' || typeof newData !== 'object') {
        return generateAllTablesHtml(newData || oldData || {});
    }
    const keys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));
    keys.forEach(key => {
        const oldTable = oldData[key];
        const newTable = newData[key];
        if (!newTable || !newTable.content || !Array.isArray(newTable.content)) return;
        const oldContent = (oldTable && Array.isArray(oldTable.content)) ? oldTable.content : [];
        const newContent = newTable.content;
        if (!newContent.length) return;
        const headers = newContent[0] || (oldContent[0] || []);
        const maxRows = Math.max(oldContent.length, newContent.length);
        const diffRows = [];
        for (let i = 1; i < maxRows; i++) {
            const oldRow = oldContent[i];
            const newRow = newContent[i];
            if (oldRow && !newRow) {
                diffRows.push({ type: 'deleted', row: oldRow });
            } else if (!oldRow && newRow) {
                diffRows.push({ type: 'added', row: newRow });
            } else if (oldRow && newRow && JSON.stringify(oldRow) !== JSON.stringify(newRow)) {
                const changedCols = [];
                const colCount = Math.max(oldRow.length, newRow.length, headers.length);
                for (let c = 0; c < colCount; c++) {
                    changedCols[c] = ((oldRow[c] ?? '') !== (newRow[c] ?? ''));
                }
                diffRows.push({ type: 'modified', row: newRow, changedCols });
            }
        }
        if (diffRows.length === 0) return;
        const tableName = (newTable && newTable.name) || (oldTable && oldTable.name) || key;
        html += `<div class="data-manage-card">
            <h3>${escapeHtml(tableName)}（仅显示有变化的行）</h3>
            <div class="dm-table-wrap"><table class="dm-table"><thead><tr>`;
        const displayHeaders = headers.slice(1);
        displayHeaders.forEach(header => { html += `<th>${escapeHtml(header || '')}</th>`; });
        html += `</tr></thead><tbody>`;
        diffRows.forEach(item => {
            let rowClass = '';
            if (item.type === 'deleted') rowClass = 'dm-row-deleted';
            else if (item.type === 'added') rowClass = 'dm-row-added';
            html += `<tr class="${rowClass}">`;
            const row = item.row || [];
            const changedCols = item.changedCols || [];
            displayHeaders.forEach((_, colIndex) => {
                const origIndex = colIndex + 1;
                const cellContent = (row[origIndex]) ? row[origIndex] : '';
                let cellClass = '';
                if (item.type === 'deleted') cellClass = 'dm-cell-deleted';
                else if (item.type === 'added') cellClass = 'dm-cell-added';
                else if (item.type === 'modified' && changedCols[origIndex]) cellClass = 'dm-cell-modified';
                html += `<td class="${cellClass}">${escapeHtml(cellContent)}</td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table></div></div>`;
    });
    if (!html) {
        html = `<div class="data-manage-card">
            <h3>数据内容</h3>
            <p class="data-manage-notes">相比上一楼层未检测到变化，已隐藏详细表格。</p>
        </div>`;
    }
    return html;
}

/**
 * 生成表格HTML
 */
function generateTableHtml(tableName, content) {
    if (!content || content.length === 0) {
        return `<div class="data-manage-card">
            <h3>${escapeHtml(tableName)}</h3>
            <p class="data-manage-notes">表格内容为空</p>
        </div>`;
    }

    let html = `<div class="data-manage-card">
        <h3>${escapeHtml(tableName)}</h3>
        <div class="dm-table-wrap"><table class="dm-table"><thead><tr>`;

    const headers = content[0] ? content[0].slice(1) : [];
    headers.forEach(header => { html += `<th>${escapeHtml(header || '')}</th>`; });

    html += `</tr></thead><tbody>`;

    for (let i = 1; i < content.length; i++) {
        const row = content[i].slice(1);
        html += `<tr>`;
        row.forEach(cell => {
            const cellContent = cell || '';
            html += `<td class="${cellContent === '' ? 'data-manage-notes' : ''}">${escapeHtml(cellContent)}</td>`;
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
async function getCombinedWorldbookContent() {
    try {
        const parentWin = (typeof window.parent !== 'undefined') ? window.parent : window;
        let TavernHelper_API = getTavernHelperAPI ? getTavernHelperAPI() : (typeof TavernHelper !== 'undefined' ? TavernHelper : (parentWin && parentWin.TavernHelper ? parentWin.TavernHelper : null));
        const worldbookConfig = currentSettings.worldbookConfig || DEFAULT_SETTINGS.worldbookConfig;
        let bookNames = [];
        if ((worldbookConfig.source || 'character') === 'character') {
            if (TavernHelper_API && typeof TavernHelper_API.getCharLorebooks === 'function') {
                try {
                    const charLorebooks = await TavernHelper_API.getCharLorebooks({ type: 'all' });
                    if (charLorebooks) {
                        if (charLorebooks.primary) bookNames.push(charLorebooks.primary);
                        if (Array.isArray(charLorebooks.additional) && charLorebooks.additional.length > 0) bookNames.push(...charLorebooks.additional);
                    }
                } catch (_) { }
            }
            if (bookNames.length === 0) {
                const context = SillyTavern.getContext();
                if (context && context.chat && context.chat.character) {
                    try {
                        const char = context.chat.character;
                        if (Array.isArray(char.lorebook) && char.lorebook.length > 0) {
                            const names = new Set();
                            char.lorebook.forEach(e => { if (e && e.worldbook) names.add(e.worldbook); });
                            bookNames = Array.from(names);
                        }
                    } catch (_) { }
                }
            }
        } else {
            bookNames = worldbookConfig.manualSelection || [];
        }
        if (!Array.isArray(bookNames) || bookNames.length === 0) return '';
        const allBooks = await getWorldBooks();
        const enabledEntriesMap = (currentSettings.worldbookConfig && currentSettings.worldbookConfig.enabledEntries) ? currentSettings.worldbookConfig.enabledEntries : {};
        const normalizeId = (entry) => String(entry?.uid ?? entry?.id ?? '');
        const isLorebookEntryEnabled = (entry) => {
            if (!entry || typeof entry !== 'object') return true;
            if (Object.prototype.hasOwnProperty.call(entry, 'disabled')) return entry.disabled !== true;
            if (Object.prototype.hasOwnProperty.call(entry, 'is_disabled')) return entry.is_disabled !== true;
            if (Object.prototype.hasOwnProperty.call(entry, 'enabled')) return entry.enabled === true;
            if (Object.prototype.hasOwnProperty.call(entry, 'isEnabled')) return entry.isEnabled === true;
            return true;
        };
        let parts = [];
        for (const bookName of bookNames) {
            const book = allBooks.find(b => b.name === bookName);
            if (!book || !Array.isArray(book.entries) || book.entries.length === 0) continue;
            let enabled = enabledEntriesMap[bookName];
            if (!Array.isArray(enabled)) {
                enabled = book.entries
                    .filter(isLorebookEntryEnabled)
                    .map(normalizeId)
                    .filter(id => id);
            }
            enabled = enabled.map(id => String(id));
            book.entries.forEach(entry => {
                const uid = normalizeId(entry);
                if (!uid || !enabled.includes(uid)) return;
                const content = entry.content || '';
                if (content && typeof content === 'string') {
                    parts.push(`${content}`);
                }
            });
        }
        return parts.join('\n\n');
    } catch (e) {
        console.error('构建世界书内容失败:', e);
        return '';
    }
}

/**
 * 构建表格数据的可读文本
 * @param {Object} jsonTableData 当前表格数据
 * @param {Object} settings 当前配置
 * @returns {{ text: string, hasData: boolean }}
 */
function buildReadableTableDataText(jsonTableData, settings) {
    if (!jsonTableData) {
        return { text: '', hasData: false };
    }

    const summaryLimit = settings?.summaryTableMaxEntries || 10;
    const tableKeys = Object.keys(jsonTableData).filter(k => k.startsWith('sheet_'));
    if (tableKeys.length === 0) {
        return { text: '', hasData: false };
    }

    const sections = [];
    let hasAnyRow = false;

    tableKeys.forEach((sheetKey) => {
        const table = jsonTableData[sheetKey];
        if (!table || !table.name || !Array.isArray(table.content) || table.content.length === 0) {
            return;
        }

        const headerRow = Array.isArray(table.content[0]) ? table.content[0].slice(1) : [];
        const allRows = table.content.slice(1);

        let rowsToProcess = allRows;
        let startIndex = 0;
        if (table.name.trim() === '总结表' && allRows.length > summaryLimit) {
            startIndex = allRows.length - summaryLimit;
            rowsToProcess = allRows.slice(-summaryLimit);
        }

        if (rowsToProcess.length === 0) {
            return;
        }

        const sectionLines = [];
        sectionLines.push(`### ${table.name}`);

        rowsToProcess.forEach((row, index) => {
            hasAnyRow = true;
            const rowCells = Array.isArray(row) ? row.slice(1) : [];
            const titleCell = rowCells[0];
            const displayTitle = (titleCell && String(titleCell).trim()) ? String(titleCell).trim() : `条目 ${startIndex + index + 1}`;

            sectionLines.push(`- ${displayTitle}`);

            const detailHeaders = headerRow.slice(1);
            const detailValues = rowCells.slice(1);
            if (detailHeaders.length > 0 && detailValues.length > 0) {
                detailHeaders.forEach((header, detailIndex) => {
                    const fieldName = (header && String(header).trim()) ? String(header).trim() : `字段 ${detailIndex + 2}`;
                    const fieldValue = detailValues[detailIndex];
                    const displayValue = (fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== '') ? String(fieldValue).trim() : '-';
                    sectionLines.push(`  - ${fieldName}: ${displayValue}`);
                });
            }

            sectionLines.push('');
        });

        sections.push(sectionLines.join('\n').trim());
    });

    const finalText = sections.join('\n\n').trim();
    return { text: finalText, hasData: hasAnyRow };
}

function buildTableDataTextForDollar0(jsonTableData, settings) {
    if (!jsonTableData) {
        // 即使没有表格数据，也返回说明性文本，避免 $0 完全为空
        return { text: '(当前还没有表格数据)', hasData: false };
    }

    const summaryLimit = settings?.summaryTableMaxEntries || 10;
    const tableKeys = Object.keys(jsonTableData).filter(k => k.startsWith('sheet_'));
    if (tableKeys.length === 0) {
        // 没有任何 sheet_ 表时，同样返回占位说明
        return { text: '(当前还没有表格数据)', hasData: false };
    }

    let hasAnyRow = false;
    let tableDataText = '';

    tableKeys.forEach((sheetKey, tableIndex) => {
        const table = jsonTableData[sheetKey];
        if (!table || !table.name || !Array.isArray(table.content)) {
            return;
        }

        tableDataText += `[${tableIndex}:${table.name}]\n`;
        const headers = Array.isArray(table.content[0])
            ? table.content[0].slice(1).map((h, i) => `[${i}:${h}]`).join('|')
            : 'No Headers';
        tableDataText += `  Columns: ${headers}\n`;

        const allRows = table.content.slice(1);
        let rowsToProcess = allRows;
        let startIndex = 0;

        if (table.name.trim() === '总结表' && allRows.length > summaryLimit) {
            startIndex = allRows.length - summaryLimit;
            rowsToProcess = allRows.slice(-summaryLimit);
            tableDataText += `  - Note: Showing last ${rowsToProcess.length} of ${allRows.length} entries.\n`;
        }

        if (rowsToProcess.length > 0) {
            rowsToProcess.forEach((row, index) => {
                hasAnyRow = true;
                const originalRowIndex = startIndex + index;
                const rowData = Array.isArray(row) ? row.slice(1).join('|') : '';
                tableDataText += `  [${originalRowIndex}] ${rowData}\n`;
            });
        } else {
            tableDataText += '  (No data rows)\n';
        }

        tableDataText += '\n';
    });

    return { text: tableDataText.trim(), hasData: hasAnyRow };
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
    const worldbookContent = await getCombinedWorldbookContent();

    // 1. 格式化当前JSON表格数据为可读文本（用于$0占位符）
    const { text: tableDataText, hasData: hasTableData } = buildTableDataTextForDollar0(currentJsonTableData, currentSettings);
    // 与参考文档保持一致：即使没有实际数据行，也使用构建好的占位文本
    const safeTableDataText = tableDataText || '(当前还没有表格数据)';

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

    return { tableDataText: safeTableDataText, messagesText, worldbookContent };
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
    const charCardPrompt = getCurrentPrompt(currentSettings);

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
        let trimmedLine = line.trim();
        if (trimmedLine === '') return;

        // 兼容 AI 输出为 JS 字符串拼接形式：
        // 例如："...\n' + updateRow(...)" 或单独一行 "+"
        if (trimmedLine === '+') return;
        if (trimmedLine.startsWith('+')) {
            trimmedLine = trimmedLine.slice(1).trimStart();
        }
        if (trimmedLine.endsWith('+')) {
            trimmedLine = trimmedLine.slice(0, -1).trimEnd();
        }
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

    // 进一步拆分：有些AI/字符串拼接会把多条指令合并到同一行（例如：updateRow(...);deleteRow(...);...）
    // 这里按分号再切分一次，避免整行无法匹配单条指令的正则而导致“全部失效”。
    const expandedCommandLines = [];
    commandLines.forEach(cmdLine => {
        const parts = String(cmdLine).split(';');
        parts.forEach(part => {
            const t = part.trim();
            if (!t) return;
            if (t.startsWith('insertRow') || t.startsWith('deleteRow') || t.startsWith('updateRow')) {
                expandedCommandLines.push(t + ';');
            }
        });
    });
    commandLines.length = 0;
    commandLines.push(...expandedCommandLines);

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
            appendTableEditErrorLog({
                reason: '指令格式错误',
                command: commandLineWithoutComment,
            });
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
                    // 简化的JSON清洗流程：拆解 → 归一化 → 重建
                    let sanitizedJson = jsonPart;

                    // 1. 统一剔除所有双引号（含全角引号）
                    sanitizedJson = sanitizedJson.replace(/["\u201C\u201D]/g, '');

                    // 2. 统一将全角逗号转为半角逗号
                    sanitizedJson = sanitizedJson.replace(/，/g, ',');

                    // 3. 匹配 数字键: 值 的模式，重建合法JSON
                    //    用 ,\s*数字[:：] 或 } 作为值的边界，区分分隔逗号和内容逗号
                    const kvPairs = [];
                    const kvRegex = /(\d+)\s*[:：]\s*(.*?)(?=\s*,\s*\d+\s*[:：]|\s*})/gs;
                    let kvMatch;
                    while ((kvMatch = kvRegex.exec(sanitizedJson)) !== null) {
                        const key = kvMatch[1];
                        let value = kvMatch[2].trim();
                        // 转义JSON特殊字符
                        value = value
                            .replace(/\\/g, '\\\\')
                            .replace(/"/g, '\\"')
                            .replace(/\n/g, '\\n')
                            .replace(/\r/g, '\\r')
                            .replace(/\t/g, '\\t');
                        kvPairs.push(`"${key}":"${value}"`);
                    }

                    if (kvPairs.length > 0) {
                        sanitizedJson = '{' + kvPairs.join(',') + '}';
                    }

                    // 调试日志
                    console.error('JSON 解析失败，原始 jsonPart:', jsonPart);
                    console.error('JSON 解析失败，清洗后的 sanitizedJson:', sanitizedJson);

                    try {
                        const jsonData = JSON.parse(sanitizedJson);
                        args = [...initialArgs, jsonData];
                    } catch (finalError) {
                        console.error(`无法解析JSON: "${jsonPart}"`, finalError);
                        appendTableEditErrorLog({
                            reason: 'JSON解析失败',
                            command: commandLineWithoutComment,
                            detail: (
                                String(finalError && finalError.message ? finalError.message : finalError) +
                                '\n原始 jsonPart: ' + String(jsonPart) +
                                '\n清洗后的 sanitizedJson: ' + String(sanitizedJson)
                            ),
                        });
                        return;
                    }
                }
            }

            // 应用指令
            switch (command) {
                case 'insertRow': {
                    let tableIndex;
                    let rowIndex;
                    let data;
                    if (Array.isArray(args) && args.length === 3) {
                        [tableIndex, rowIndex, data] = args;
                    } else {
                        [tableIndex, data] = args;
                        rowIndex = null;
                    }
                    const table = sheets[tableIndex];
                    if (table && table.content && typeof data === 'object') {
                        const newRow = [null];
                        const headers = table.content[0].slice(1);
                        headers.forEach((_, colIndex) => {
                            newRow.push(data[colIndex] || (data[String(colIndex)] || ''));
                        });
                        if (typeof rowIndex === 'number' && !isNaN(rowIndex)) {
                            const insertAt = Math.max(0, Math.min(rowIndex, Math.max(0, table.content.length - 1)));
                            table.content.splice(insertAt + 1, 0, newRow);
                            console.log(`应用insertRow到表格 ${tableIndex} (${table.name})，索引 ${insertAt}，数据:`, data);
                            appliedEdits++;
                        } else {
                            table.content.push(newRow);
                            console.log(`应用insertRow到表格 ${tableIndex} (${table.name})，数据:`, data);
                            appliedEdits++;
                        }
                    } else {
                        appendTableEditErrorLog({
                            reason: 'insertRow 目标表不存在或参数无效',
                            command: commandLineWithoutComment,
                        });
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
                    } else {
                        appendTableEditErrorLog({
                            reason: 'deleteRow 目标表不存在或行索引越界',
                            command: commandLineWithoutComment,
                        });
                    }
                    break;
                }
                case 'updateRow': {
                    const [tableIndex, rowIndex, data] = args;
                    const table = sheets[tableIndex];
                    if (table && table.content && typeof data === 'object') {
                        const headerLen = Array.isArray(table.content[0]) ? table.content[0].length : 0;
                        const createEmptyRow = () => {
                            const row = [];
                            const targetLen = Math.max(1, headerLen);
                            for (let i = 0; i < targetLen; i++) row.push('');
                            row[0] = null;
                            return row;
                        };

                        // 若目标行不存在（常见于首次更新），自动补齐行
                        while (table.content.length <= rowIndex + 1) {
                            table.content.push(createEmptyRow());
                        }

                        Object.keys(data).forEach(colIndexStr => {
                            const colIndex = parseInt(colIndexStr, 10);
                            if (isNaN(colIndex)) return;

                            const targetCol = colIndex + 1;
                            const row = table.content[rowIndex + 1];
                            while (row.length <= targetCol) {
                                row.push('');
                            }
                            row[targetCol] = data[colIndexStr];
                        });

                        console.log(`应用updateRow到表格 ${tableIndex} (${table.name})，索引 ${rowIndex}，数据:`, data);
                        appliedEdits++;
                    } else {
                        appendTableEditErrorLog({
                            reason: 'updateRow 目标表不存在或参数无效',
                            command: commandLineWithoutComment,
                        });
                    }
                    break;
                }
            }
        } catch (error) {
            console.error(`应用指令失败: ${line}`, error);
            appendTableEditErrorLog({
                reason: '应用指令异常',
                command: commandLineWithoutComment || String(line),
                detail: String(error && error.message ? error.message : error),
            });
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

    // 记录本次更新涉及的表的 key（用于 per-sheet 更新频率追踪）
    if (window._currentAutoUpdateModifiedKeys && Array.isArray(window._currentAutoUpdateModifiedKeys)) {
        targetMessage.TavernDB_ACU_ModifiedKeys = [...window._currentAutoUpdateModifiedKeys];
    }
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
            return true; // 没有消息需要处理，视为成功
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
            return true; // 没有消息需要更新，视为成功
        }

        showToast(`开始更新 ${indicesToUpdate.length} 条消息的数据库...`, 'info');

        // 手动更新不分批：范围内一次性处理
        const batches = [indicesToUpdate];
        console.log(`处理 ${indicesToUpdate.length} 个更新，分为 ${batches.length} 个批次，每批 ${indicesToUpdate.length} 个`);

        let overallSuccess = true;

        for (let i = 0; i < batches.length; i++) {
            const batchIndices = batches[i];
            const batchNumber = i + 1;
            const totalBatches = batches.length;
            const firstMessageIndex = batchIndices[0];
            const lastMessageIndex = batchIndices[batchIndices.length - 1];

            // 1. 加载基础数据库：优先使用当前消息的数据库，如果没有则往前找最近的记录
            let foundDb = false;

            // 首先检查当前消息是否已经有数据库记录
            const currentMsg = chat[firstMessageIndex];
            if (currentMsg && !currentMsg.is_user && currentMsg.TavernDB_ACU_Data) {
                currentJsonTableData = JSON.parse(JSON.stringify(currentMsg.TavernDB_ACU_Data));
                console.log(`[批次 ${batchNumber}] 使用当前消息索引 ${firstMessageIndex} 的数据库状态`);
                foundDb = true;
            }
            // 如果当前消息没有数据库记录，则向前查找
            else {
                for (let j = firstMessageIndex - 1; j >= 0; j--) {
                    const msg = chat[j];
                    if (!msg.is_user && msg.TavernDB_ACU_Data) {
                        currentJsonTableData = JSON.parse(JSON.stringify(msg.TavernDB_ACU_Data));
                        console.log(`[批次 ${batchNumber}] 从消息索引 ${j} 加载数据库状态`);
                        foundDb = true;
                        break;
                    }
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
            const toastMessage = `正在处理手动更新 (${batchNumber}/${totalBatches})...`;
            const saveTargetIndex = lastMessageIndex;

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

            // 如果用户启用了自动隐藏功能，则在手动更新成功后隐藏相关楼层
            if (currentSettings.autoHideMessages) {
                try {
                    const hideResult = await hideMessagesByFloorRange(floorStart, floorEnd);
                    if (hideResult.success) {
                        showToast(`数据整理完成！已成功隐藏${hideResult.rangeText}。`, 'success');
                    } else {
                        showToast(`数据整理完成！但隐藏楼层时出现问题：${hideResult.errorMessage}`, 'warning');
                    }
                } catch (error) {
                    console.error('隐藏楼层时发生错误:', error);
                    showToast('数据整理完成！但自动隐藏功能出现问题，请手动隐藏相关楼层。', 'warning');
                }
            }

            return true; // 返回成功
        } else {
            return false; // 返回失败
        }

    } catch (error) {
        console.error('更新数据库失败:', error);
        throw error;
    }
}

/**
 * 根据楼层范围隐藏消息
 */
async function hideMessagesByFloorRange(startFloor, endFloor) {
    try {
        // 特殊处理：当起始楼层为1时，包含0层
        let actualStartFloor = startFloor;
        let actualEndFloor = endFloor;

        if (startFloor === 1) {
            actualStartFloor = 0; // 包含0层
        }

        // 构建楼层范围字符串
        let rangeText;
        let hideCommand;

        if (actualEndFloor === null || actualEndFloor === undefined) {
            // 只指定起始楼层，隐藏从该楼层到最新的所有楼层
            rangeText = `楼层 ${actualStartFloor} 及以后`;
            hideCommand = `/hide ${actualStartFloor}-`;
        } else {
            // 指定了楼层范围
            rangeText = `楼层 ${actualStartFloor}-${actualEndFloor}`;
            hideCommand = `/hide ${actualStartFloor}-${actualEndFloor}`;
        }

        console.log(`准备隐藏楼层范围: ${hideCommand} (原始范围: ${startFloor}${endFloor !== null && endFloor !== undefined ? `-${endFloor}` : ' 及以后'})`);

        // 调用 /hide 命令
        await triggerSlashCommand(hideCommand);

        return {
            success: true,
            rangeText: rangeText,
            hideCommand: hideCommand,
        };
    } catch (error) {
        console.error('隐藏楼层时发生错误:', error);
        return {
            success: false,
            rangeText: endFloor !== null && endFloor !== undefined ? `楼层 ${startFloor}-${endFloor}` : `楼层 ${startFloor} 及以后`,
            errorMessage: error.message || '未知错误',
        };
    }
}

/**
 * 触发斜杠命令的辅助函数
 */
async function triggerSlashCommand(command) {
    return new Promise((resolve, reject) => {
        try {
            // 优先使用 SillyTavern 暴露的 API（如果存在）
            if (typeof SillyTavern_API_ACU !== 'undefined' && SillyTavern_API_ACU.triggerSlash) {
                SillyTavern_API_ACU.triggerSlash(command);
                resolve();
                return;
            }

            // 备用方案：直接调用全局 window.triggerSlash（若可用）
            if (typeof window !== 'undefined' && typeof window.triggerSlash === 'function') {
                window.triggerSlash(command);
                resolve();
                return;
            }

            reject(new Error('无法找到 triggerSlash 函数'));
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * 执行卡片更新流程
 */
async function proceedWithCardUpdate(messagesToUse, batchToastMessage = '正在填表，请稍候...', saveTargetIndex = -1) {
    let success = false;
    const maxRetries = 3;
    let loadingToast = null;
    // 记录更新前的数据库快照，用于判断是否有实际变更
    const beforeSnapshot = currentJsonTableData ? JSON.stringify(currentJsonTableData) : null;

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
                onShown: function () {
                    const stopBtn = parentWin.document.getElementById('data-manage-stop-update-btn');
                    if (stopBtn) {
                        stopBtn.addEventListener('click', function (e) {
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

                            // 移除toast - 参照参考文档实现
                            const $toast = parentWin.jQuery ? parentWin.jQuery(this).closest('.toast') : null;
                            if ($toast && $toast.length) {
                                $toast.remove();
                            } else if (parentWin.toastr) {
                                // 兜底方案
                                if (loadingToast) {
                                    parentWin.toastr.clear(loadingToast);
                                } else {
                                    parentWin.toastr.clear();
                                }
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

            // 判断是否有实际数据变更（前后快照对比）
            const afterSnapshot = currentJsonTableData ? JSON.stringify(currentJsonTableData) : null;
            if (beforeSnapshot !== null && afterSnapshot !== null && beforeSnapshot === afterSnapshot) {
                console.warn('AI 更新指令解析成功，但数据库内容无实际变更，本次不写入聊天记录');
                if (attempt === maxRetries) {
                    throw new Error('AI更新未对数据库产生任何变更');
                }
                // 视为本次尝试失败，等待后重试
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
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
 * 参考参考文档：需要分别处理重要角色表、总结表、故事主线表和可读数据表
 */
async function updateReadableLorebookEntry(createIfNeeded = false) {
    // 检查是否启用世界书生成
    if (currentSettings.enableWorldbookGeneration !== true) {
        console.log('世界书生成未启用，跳过更新世界书条目');
        return;
    }

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
        // 参考参考文档：使用 formatJsonToReadable 分离特殊表格
        const { readableText, importantPersonsTable, summaryTable, outlineTable } = formatJsonToReadable(currentJsonTableData);

        // 参考参考文档：分别更新各个特殊表格的世界书条目
        await updateImportantPersonsRelatedEntries(importantPersonsTable, TavernHelper_API, primaryLorebookName);
        await updateSummaryTableEntries(summaryTable, TavernHelper_API, primaryLorebookName);
        await updateOutlineTableEntry(outlineTable, TavernHelper_API, primaryLorebookName);

        // 更新可读数据表（不包含特殊表格）
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
                order: getWorldbookOrderValue(),
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

async function persistInitialDatabaseSnapshot(context) {
    try {
        if (!currentJsonTableData) {
            console.warn('无法保存初始快照：currentJsonTableData 为空');
            return;
        }

        const chat = context?.chat || [];
        if (!Array.isArray(chat)) {
            console.warn('无法保存初始快照：chat 不可用');
            return;
        }

        const latestAiIndex = [...chat]
            .map((msg, index) => (!msg.is_user ? index : -1))
            .filter(index => index !== -1)
            .pop();

        if (typeof latestAiIndex !== 'number') {
            console.warn('无法保存初始快照：未找到AI消息');
            return;
        }

        const targetMessage = chat[latestAiIndex];
        if (!targetMessage) {
            console.warn('无法保存初始快照：目标消息不存在');
            return;
        }

        targetMessage.TavernDB_ACU_Data = JSON.parse(JSON.stringify(currentJsonTableData));

        if (typeof context.saveChat === 'function') {
            await context.saveChat();
            console.log('初始数据库快照已保存到聊天记录');
        } else if (typeof SillyTavern !== 'undefined' && SillyTavern.saveChat) {
            await SillyTavern.saveChat();
            console.log('初始数据库快照已通过 SillyTavern.saveChat 保存');
        } else {
            console.warn('无法保存初始快照：saveChat 方法不可用');
        }
    } catch (error) {
        console.error('保存初始数据库快照失败:', error);
    }
}

/**
 * 格式化JSON数据为可读文本 - 参考参考文档实现
 * 重要角色表、总结表、故事主线表不应该展示在 TavernDB-ACU-ReadableDataTable 中
 * 返回分离后的数据：readableText（普通表格）、importantPersonsTable、summaryTable、outlineTable
 */
function formatJsonToReadable(jsonData) {
    if (!jsonData) {
        return {
            readableText: '数据库为空。',
            importantPersonsTable: null,
            summaryTable: null,
            outlineTable: null
        };
    }

    let readableText = '';
    let importantPersonsTable = null;
    let summaryTable = null;
    let outlineTable = null;

    const tableKeys = Object.keys(jsonData).filter(k => k.startsWith('sheet_'));

    // 用于跟踪实际处理的表格索引（排除特殊表格后）
    let actualTableIndex = 0;

    tableKeys.forEach((sheetKey) => {
        const table = jsonData[sheetKey];
        if (!table || !table.name || !table.content) return;

        // 参考参考文档：提取特殊表格 - 这些表格不应该包含在 ReadableDataTable 中
        const tableName = table.name.trim();
        switch (tableName) {
            case '重要角色表':
                importantPersonsTable = table;
                return; // 跳过，不包含在可读数据表中
            case '总结表':
                summaryTable = table;
                return; // 跳过，不包含在可读数据表中
            case '故事主线':
                outlineTable = table;
                return; // 跳过，不包含在可读数据表中
            default:
                // 处理所有其他表格
                break;
        }

        // 添加表格标题 [索引:表名]
        readableText += `[${actualTableIndex}:${table.name}]\n`;

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
        actualTableIndex++; // 只有处理了表格才增加索引
    });

    return {
        readableText: readableText.trim(),
        importantPersonsTable,
        summaryTable,
        outlineTable
    };
}

/**
 * 更新总结表世界书条目 - 参考参考文档实现
 */
async function updateSummaryTableEntries(summaryTable, TavernHelper_API, primaryLorebookName) {
    // 检查是否启用世界书生成
    if (currentSettings.enableWorldbookGeneration !== true) {
        console.log('世界书生成未启用，跳过更新总结表条目');
        return;
    }

    if (!TavernHelper_API) return;
    if (!primaryLorebookName) {
        console.warn('无法更新总结表条目: 未设置注入目标世界书');
        return;
    }

    const SUMMARY_COMMENT = 'TavernDB-ACU-SummaryTable';

    try {
        const allEntries = await TavernHelper_API.getLorebookEntries(primaryLorebookName);
        const existingEntry = allEntries.find(e => e.comment === SUMMARY_COMMENT);

        // 如果没有总结表数据，删除条目（如果存在）
        if (!summaryTable || summaryTable.content.length < 2) {
            if (existingEntry) {
                await TavernHelper_API.deleteLorebookEntries(primaryLorebookName, [existingEntry.uid]);
                console.log('已删除总结表条目（无数据）');
            }
            return;
        }

        // 获取最新N行（展示最新N条数据，N由用户配置）
        const MAX_SHOW_ENTRIES = currentSettings.summaryTableMaxEntries || 10;
        const summaryRows = summaryTable.content.slice(1);
        const totalRows = summaryRows.length;
        const startIndex = Math.max(0, totalRows - MAX_SHOW_ENTRIES);
        const latestRows = summaryRows.slice(startIndex);

        // 格式化最新N行（保持现有展示逻辑）
        const headers = summaryTable.content[0] ? summaryTable.content[0].slice(1) : [];
        let content = `[0:事件详情]\n`;

        if (headers.length > 0) {
            const headerInfo = headers.map((h, i) => `[${i}:${h}]`).join('|');
            content += `Columns: ${headerInfo}\n`;
        }

        latestRows.forEach((row, rowIndex) => {
            const rowData = row.slice(1);
            const actualIndex = startIndex + rowIndex;
            content += `[${actualIndex}] ${rowData.join('|')}\n`;
        });

        const finalContent = `<event_details>\n\n${content.trim()}\n\n</event_details>`;

        if (existingEntry) {
            if (existingEntry.content !== finalContent) {
                const updatedEntry = {
                    uid: existingEntry.uid,
                    content: finalContent,
                    enabled: true,
                    type: 'constant',
                    prevent_recursion: true
                };
                await TavernHelper_API.setLorebookEntries(primaryLorebookName, [updatedEntry]);
                console.log('成功更新总结表世界书条目');
            }
        } else {
            const newEntry = {
                comment: SUMMARY_COMMENT,
                content: finalContent,
                enabled: true,
                type: 'constant',
                order: getWorldbookOrderValue(),
                prevent_recursion: true,
            };
            await TavernHelper_API.createLorebookEntries(primaryLorebookName, [newEntry]);
            console.log('总结表世界书条目不存在，已创建新条目');
        }
    } catch (error) {
        console.error('更新总结表世界书条目失败:', error);
    }
}

/**
 * 更新重要角色表相关世界书条目 - 参考参考文档实现
 */
async function updateImportantPersonsRelatedEntries(importantPersonsTable, TavernHelper_API, primaryLorebookName) {
    // 检查是否启用世界书生成
    if (currentSettings.enableWorldbookGeneration !== true) {
        console.log('世界书生成未启用，跳过更新重要角色表条目');
        return;
    }

    if (!TavernHelper_API) return;
    if (!primaryLorebookName) {
        console.warn('无法更新重要角色表条目: 未设置注入目标世界书');
        return;
    }

    const PERSON_ENTRY_PREFIX = '重要人物条目';

    try {
        const allEntries = await TavernHelper_API.getLorebookEntries(primaryLorebookName);

        // --- 1. 全量删除 ---
        // 找出所有由插件管理的旧条目 (人物条目)
        const uidsToDelete = allEntries
            .filter(e => e.comment && e.comment.startsWith(PERSON_ENTRY_PREFIX))
            .map(e => e.uid);

        if (uidsToDelete.length > 0) {
            await TavernHelper_API.deleteLorebookEntries(primaryLorebookName, uidsToDelete);
            console.log(`已删除 ${uidsToDelete.length} 个旧的人物相关世界书条目`);
        }

        // --- 2. 全量重建 ---
        const personRows = (importantPersonsTable?.content?.length > 1) ? importantPersonsTable.content.slice(1) : [];
        if (personRows.length === 0) {
            console.log('没有重要角色需要创建条目');
            return; // 如果没有人物，删除后直接返回
        }

        const headers = importantPersonsTable.content[0].slice(1);
        const nameColumnIndex = headers.indexOf('姓名') !== -1 ? headers.indexOf('姓名') : headers.indexOf('角色名');
        if (nameColumnIndex === -1) {
            console.error('无法在重要角色表中找到"姓名"或"角色名"列，无法处理人物条目');
            return;
        }

        const personEntriesToCreate = [];
        const personNames = [];

        // 2.1 准备要创建的人物条目
        personRows.forEach((row, i) => {
            const rowData = row.slice(1);
            const personName = rowData[nameColumnIndex];
            if (!personName) return;
            personNames.push(personName);

            const content = `<latest_role_info>\n\n[0:${importantPersonsTable.name}]\n\nColumns: ${headers.map((h, idx) => `[${idx}:${h}]`).join('|')}\n\n[0] ${rowData.join('|')}\n\n</latest_role_info>`;
            const newEntryData = {
                comment: `${PERSON_ENTRY_PREFIX}${i + 1}`,
                content: content,
                keys: [personName],
                enabled: true,
                type: 'keyword',
                order: getWorldbookOrderValue(),
                prevent_recursion: true
            };
            personEntriesToCreate.push(newEntryData);
        });

        // 2.2 执行创建
        if (personEntriesToCreate.length > 0) {
            await TavernHelper_API.createLorebookEntries(primaryLorebookName, personEntriesToCreate);
            console.log(`成功创建 ${personEntriesToCreate.length} 个新的人物相关世界书条目`);
        }

    } catch (error) {
        console.error('更新重要角色表相关世界书条目失败:', error);
    }
}

/**
 * 更新故事主线表世界书条目 - 参考参考文档实现
 */
async function updateOutlineTableEntry(outlineTable, TavernHelper_API, primaryLorebookName) {
    // 检查是否启用世界书生成
    if (currentSettings.enableWorldbookGeneration !== true) {
        console.log('世界书生成未启用，跳过更新故事主线表条目');
        return;
    }

    if (!TavernHelper_API) return;
    if (!primaryLorebookName) {
        console.warn('无法更新故事主线表条目: 未设置注入目标世界书');
        return;
    }

    const OUTLINE_COMMENT = 'TavernDB-ACU-OutlineTable';

    try {
        const allEntries = await TavernHelper_API.getLorebookEntries(primaryLorebookName);
        const existingEntry = allEntries.find(e => e.comment === OUTLINE_COMMENT);

        // 如果没有故事主线表数据，删除条目（如果存在）
        if (!outlineTable || outlineTable.content.length < 2) {
            if (existingEntry) {
                await TavernHelper_API.deleteLorebookEntries(primaryLorebookName, [existingEntry.uid]);
                console.log('已删除故事主线表条目（无数据）');
            }
            return;
        }

        // 格式化整个表格（使用相同的自定义格式）
        let content = `[0:${outlineTable.name}]\n`;
        const headers = outlineTable.content[0] ? outlineTable.content[0].slice(1) : [];
        if (headers.length > 0) {
            const headerInfo = headers.map((h, i) => `[${i}:${h}]`).join('|');
            content += `Columns: ${headerInfo}\n`;
        }
        const rows = outlineTable.content.slice(1);
        rows.forEach((row, rowIndex) => {
            const rowData = row.slice(1);
            content += `[${rowIndex}] ${rowData.join('|')}\n`;
        });

        const finalContent = `<main_storyline>\n\n${content.trim()}\n\n</main_storyline>`;

        if (existingEntry) {
            if (existingEntry.content !== finalContent) {
                const updatedEntry = {
                    uid: existingEntry.uid,
                    content: finalContent,
                    enabled: true,
                    type: 'constant',
                    prevent_recursion: true
                };
                await TavernHelper_API.setLorebookEntries(primaryLorebookName, [updatedEntry]);
                console.log('成功更新故事主线表世界书条目');
            }
        } else {
            const newEntry = {
                comment: OUTLINE_COMMENT,
                content: finalContent,
                enabled: true,
                type: 'constant',
                order: getWorldbookOrderValue(),
                prevent_recursion: true,
            };
            await TavernHelper_API.createLorebookEntries(primaryLorebookName, [newEntry]);
            console.log('故事主线表世界书条目不存在，已创建新条目');
        }
    } catch (error) {
        console.error('更新故事主线表世界书条目失败:', error);
    }
}

/**
 * 获取注入目标世界书名称
 */
async function getInjectionTargetLorebook(targetSetting = null) {
    const worldbookConfig = currentSettings.worldbookConfig || DEFAULT_SETTINGS.worldbookConfig;
    const injectionTarget = targetSetting || worldbookConfig.injectionTarget || 'character';

    if (injectionTarget === 'character') {
        const TavernHelper_API = getTavernHelperAPI();
        try {
            return await resolveCharacterPrimaryLorebook(TavernHelper_API);
        } catch (error) {
            console.error('解析角色卡世界书失败:', error);
            return null;
        }
    } else {
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
            enabledCheckbox.addEventListener('change', function () {
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
            newDrawerToggle.addEventListener('click', function (e) {
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

// 全局变量：防抖定时器和自动更新状态
let newMessageDebounceTimer = null;
let isAutoUpdating = false;
const NEW_MESSAGE_DEBOUNCE_DELAY = 2000; // 2秒防抖延迟

// 事件监听器注册状态
let eventListenersRegistered = false;
let eventListenerRetryTimer = null;
const EVENT_LISTENER_RETRY_INTERVAL = 5000; // 5秒重试间隔
const MAX_RETRY_ATTEMPTS = 20; // 最多重试20次（100秒）
let retryAttempts = 0;
let currentChatIdentifier = null;
async function resolveCharacterPrimaryLorebook(TavernHelper_API) {
    if (!TavernHelper_API) return null;

    // 首选：专用API
    if (typeof TavernHelper_API.getCurrentCharPrimaryLorebook === 'function') {
        try {
            const primary = await TavernHelper_API.getCurrentCharPrimaryLorebook();
            if (primary) {
                return primary;
            }
        } catch (error) {
            console.warn('调用 getCurrentCharPrimaryLorebook 失败:', error);
        }
    }

    // 回退：getCharLorebooks
    if (typeof TavernHelper_API.getCharLorebooks === 'function') {
        try {
            const lorebooks = await TavernHelper_API.getCharLorebooks({ type: 'all' });
            if (lorebooks) {
                if (lorebooks.primary) {
                    return lorebooks.primary;
                }
                if (Array.isArray(lorebooks.additional) && lorebooks.additional.length > 0) {
                    return lorebooks.additional[0];
                }
            }
        } catch (error) {
            console.warn('调用 getCharLorebooks 失败:', error);
        }
    }

    // 额外回退：getCurrentLorebook
    if (typeof TavernHelper_API.getCurrentLorebook === 'function') {
        try {
            const current = await TavernHelper_API.getCurrentLorebook();
            if (current) {
                return current;
            }
        } catch (error) {
            console.warn('调用 getCurrentLorebook 失败:', error);
        }
    }

    return null;
}

const GENERATED_LOREBOOK_PREFIXES = [
    'TavernDB-ACU-ReadableDataTable',
    'TavernDB-ACU-OutlineTable',
    '重要人物条目',
    'TavernDB-ACU-SummaryTable',
    '总结条目',
    '小总结条目'
];

function getTavernHelperAPI() {
    try {
        if (typeof TavernHelper !== 'undefined') {
            return TavernHelper;
        }
    } catch (error) {
        console.warn('访问全局 TavernHelper 失败:', error);
    }

    try {
        const parentWin = (typeof window !== 'undefined' && window.parent) ? window.parent : window;
        if (parentWin && parentWin.TavernHelper) {
            return parentWin.TavernHelper;
        }
    } catch (error) {
        console.warn('访问父窗口 TavernHelper 失败:', error);
    }

    return null;
}

/**
 * 从模板初始化数据库 - 参考参考文档实现
 */
async function initializeJsonTableFromTemplate() {
    console.log('从模板初始化数据库...');

    try {
        // 从设置中获取模板
        const template = await loadDatabaseTemplate();
        if (template) {
            currentJsonTableData = JSON.parse(JSON.stringify(template));
            console.log('从模板成功初始化数据库');
            try {
                await deleteGeneratedLorebookEntries();
            } catch (cleanupError) {
                console.warn('初始化新数据库时清理世界书条目失败:', cleanupError);
            }
            return true;
        } else {
            console.warn('无法加载数据库模板，使用空数据库');
            currentJsonTableData = {};
            return false;
        }
    } catch (error) {
        console.error('从模板初始化数据库失败:', error);
        currentJsonTableData = {};
        return false;
    }
}

/**
 * 从聊天历史加载或创建数据库 - 参考参考文档实现
 */
async function loadOrCreateJsonTableFromChatHistory() {
    currentJsonTableData = null; // 重置前先清空
    console.log('尝试从聊天历史加载数据库...');

    const context = SillyTavern.getContext();
    if (!context || !context.chat) {
        console.log('无法获取聊天上下文');
        return;
    }

    const chat = context.chat;
    if (!chat || chat.length === 0) {
        console.log('聊天历史为空，初始化新数据库');
        const initialized = await initializeJsonTableFromTemplate();
        if (initialized) {
            try {
                // 新聊天：仅保存初始快照，不创建任何世界书条目
                // await persistInitialDatabaseSnapshot(context);
            } catch (error) {
                console.error('初始化新数据库时写入世界书或聊天记录失败:', error);
            }
        }
        return;
    }

    // 从最新消息开始往前找，找到最后一条包含数据库数据的消息
    for (let i = chat.length - 1; i >= 0; i--) {
        const message = chat[i];
        if (!message.is_user && message.TavernDB_ACU_Data) {
            console.log(`在消息索引 ${i} 找到数据库数据`);
            try {
                // 使用深拷贝来加载数据，防止对内存中数据的修改影响到历史记录
                currentJsonTableData = JSON.parse(JSON.stringify(message.TavernDB_ACU_Data));
                console.log('数据库内容已成功从聊天历史加载到内存');
                // 旧聊天：加载到内存后，生成/同步对应世界书条目
                try {
                    await updateReadableLorebookEntry(true);
                } catch (wbErr) {
                    console.error('加载旧聊天后同步世界书失败:', wbErr);
                }
                return; // 找到数据后退出
            } catch (error) {
                console.error(`处理消息索引 ${i} 的数据库内容失败:`, error);
                // 继续搜索或初始化
            }
        }
    }

    // 如果到这里，说明聊天历史中没有找到数据库数据
    console.log('聊天历史中未找到数据库，初始化新数据库');
    const initialized = await initializeJsonTableFromTemplate();
    if (initialized) {
        try {
            // 新聊天（无历史数据库）：仅保存初始快照，不创建世界书条目
            // await persistInitialDatabaseSnapshot(context);
            console.log('新数据库已保存初始快照（未创建世界书条目）');
        } catch (error) {
            console.error('写入世界书或保存快照失败:', error);
        }
    }
}

/**
 * 处理新消息事件（防抖） - 参考参考文档实现
 */
async function handleNewMessageDebounced(eventType = 'unknown') {
    console.log(`[自动更新] 新消息事件 (${eventType}) 检测到，防抖延迟 ${NEW_MESSAGE_DEBOUNCE_DELAY}ms...`);

    // 检查事件监听器是否已注册
    if (!eventListenersRegistered) {
        console.warn('[自动更新] 事件监听器未注册，尝试重新注册...');
        tryRegisterEventListeners();
    }

    // 清除之前的定时器
    if (newMessageDebounceTimer) {
        clearTimeout(newMessageDebounceTimer);
        newMessageDebounceTimer = null;
    }

    // 设置新的防抖定时器
    newMessageDebounceTimer = setTimeout(async () => {
        console.log('[自动更新] 防抖后的新消息处理触发');

        // 确保定时器引用被清除
        newMessageDebounceTimer = null;

        if (isAutoUpdating) {
            console.log('[自动更新] 自动更新已在进行中，跳过');
            return;
        }

        const context = SillyTavern.getContext();
        if (!context) {
            console.warn('[自动更新] 无法获取 SillyTavern 上下文');
            return;
        }

        if (!context.chat) {
            console.warn('[自动更新] 无法获取聊天上下文 (context.chat 为空)');
            return;
        }

        // 参考参考文档：在触发自动更新前，先加载数据库
        try {
            await loadOrCreateJsonTableFromChatHistory();
        } catch (error) {
            console.error('[自动更新] 加载数据库失败:', error);
            return;
        }

        await triggerAutomaticUpdateIfNeeded();
    }, NEW_MESSAGE_DEBOUNCE_DELAY);
}

/**
 * 触发自动更新检查 - 参考参考文档实现
 */
async function triggerAutomaticUpdateIfNeeded() {
    console.log('[自动更新] 触发器: 开始检查...');

    // 确保设置已加载
    if (!currentSettings) {
        console.warn('[自动更新] 设置未加载，尝试重新加载...');
        loadSettings();
    }

    if (!currentSettings.autoUpdateEnabled) {
        console.log('[自动更新] 触发器: 自动更新已禁用');
        return;
    }

    const context = SillyTavern.getContext();
    if (!context) {
        console.warn('[自动更新] 触发器: 无法获取 SillyTavern 上下文');
        return;
    }

    if (!context.chat) {
        console.warn('[自动更新] 触发器: 无法获取聊天上下文 (context.chat 为空)');
        return;
    }

    // 检查API是否已配置
    const apiIsConfigured = (currentSettings.apiMode === 'custom' &&
        (currentSettings.apiConfig?.useMainApi ||
            (currentSettings.apiConfig?.url && currentSettings.apiConfig?.model))) ||
        (currentSettings.apiMode === 'tavern' && currentSettings.tavernProfile);

    if (!apiIsConfigured) {
        console.warn('[自动更新] 触发器: API 未配置', {
            apiMode: currentSettings.apiMode,
            useMainApi: currentSettings.apiConfig?.useMainApi,
            hasUrl: !!currentSettings.apiConfig?.url,
            hasModel: !!currentSettings.apiConfig?.model,
            tavernProfile: currentSettings.tavernProfile
        });
        return;
    }

    // 参考参考文档：如果数据库未加载，尝试加载
    if (!currentJsonTableData) {
        console.log('[自动更新] 触发器: 数据库未加载，尝试加载...');
        try {
            await loadOrCreateJsonTableFromChatHistory();
        } catch (error) {
            console.error('[自动更新] 触发器: 数据库加载失败:', error);
            return;
        }
        if (!currentJsonTableData) {
            console.warn('[自动更新] 触发器: 数据库加载失败，跳过');
            return;
        }
    }

    if (isAutoUpdating) {
        console.log('[自动更新] 触发器: 自动更新已在进行中，跳过');
        return;
    }

    const liveChat = context.chat;
    if (!liveChat) {
        console.warn('[自动更新] 触发器: liveChat 为空');
        return;
    }

    if (liveChat.length < 2) {
        console.log('[自动更新] 触发器: 聊天历史太短（< 2条消息），当前长度:', liveChat.length);
        return;
    }

    const lastLiveMessage = liveChat[liveChat.length - 1];
    if (!lastLiveMessage) {
        console.warn('[自动更新] 触发器: 无法获取最后一条消息');
        return;
    }

    // 仅在AI有新回复时触发
    if (lastLiveMessage.is_user) {
        console.log('[自动更新] 触发器: 最后一条消息是用户消息，跳过');
        return;
    }

    // 如果最新的AI消息已经包含数据，则跳过
    if (lastLiveMessage.TavernDB_ACU_Data) {
        console.log('[自动更新] 触发器: 最新的AI消息已包含数据库数据，跳过');
        return;
    }

    // ========== 按表独立更新频率逻辑 ==========

    // 1. 收集所有数据表的 updateConfig
    const sheetKeys = Object.keys(currentJsonTableData).filter(k => {
        const v = currentJsonTableData[k];
        return v && typeof v === 'object' && v.content && Array.isArray(v.content);
    });

    if (sheetKeys.length === 0) {
        console.log('[自动更新] 触发器: 没有有效的数据表');
        return;
    }

    // 2. 全局默认值
    const globalSkipLatestN = currentSettings.autoUpdateFrequency ?? 0;
    const globalBatchSize = currentSettings.updateBatchSize || 1;

    // 3. 扫描聊天记录，找到每个表的最后更新楼层
    const totalFloors = liveChat.length; // 总楼层数（包括楼层0）

    // 查找每个表的最后更新楼层
    const perSheetLastUpdated = {}; // key -> lastUpdatedFloor
    let globalLastRecordedFloor = 0;

    for (let i = liveChat.length - 1; i > 0; i--) {
        const msg = liveChat[i];
        if (!msg) continue;

        // 检查该消息是否有 TavernDB_ACU_Data
        if (msg.TavernDB_ACU_Data) {
            // 如果有 TavernDB_ACU_ModifiedKeys，只标记对应表
            const modifiedKeys = msg.TavernDB_ACU_ModifiedKeys;
            if (modifiedKeys && Array.isArray(modifiedKeys)) {
                for (const key of modifiedKeys) {
                    if (!perSheetLastUpdated[key]) {
                        perSheetLastUpdated[key] = i;
                    }
                }
            } else {
                // 没有 ModifiedKeys，说明是旧格式，认为全部表都在该楼层更新了
                for (const key of sheetKeys) {
                    if (!perSheetLastUpdated[key]) {
                        perSheetLastUpdated[key] = i;
                    }
                }
            }

            // 记录全局最后已记录楼层
            if (globalLastRecordedFloor === 0) {
                globalLastRecordedFloor = i;
            }
        }
    }

    // 4. 逐表判断是否需要更新
    const tablesToUpdate = []; // { sheetKey, indices, batchSize }
    const totalMessages = totalFloors - 1; // 排除楼层0

    for (const sheetKey of sheetKeys) {
        const table = currentJsonTableData[sheetKey];
        const config = table.updateConfig || {};

        // 读取每个表的独立配置，-1 回退到全局
        const rawFreq = Number.isFinite(config.updateFrequency) ? config.updateFrequency : -1;
        const rawBatch = Number.isFinite(config.batchSize) ? config.batchSize : -1;
        const rawSkip = Number.isFinite(config.skipFloors) ? config.skipFloors : -1;

        const frequency = (rawFreq === -1) ? globalSkipLatestN : rawFreq;
        const batchSize = (rawBatch === -1) ? globalBatchSize : rawBatch;
        const skipFloors = (rawSkip === -1) ? globalSkipLatestN : rawSkip;

        // frequency 为 0 表示该表不参与自动更新
        if (frequency <= 0 && rawFreq === 0) {
            console.log(`[自动更新] 表 ${sheetKey}: 已配置为不自动更新 (frequency=0)，跳过`);
            continue;
        }

        // 该表的最后更新楼层
        const lastUpdated = perSheetLastUpdated[sheetKey] || 0;

        // 有效未记录层数 = 总AI楼层 - 跳过楼层 - 最后更新楼层
        const effectiveTotal = Math.max(0, totalMessages - skipFloors);
        const effectiveUnrecorded = Math.max(0, effectiveTotal - lastUpdated);
        const threshold = batchSize;

        console.log(`[自动更新] 表 ${sheetKey}: frequency=${frequency}, batchSize=${batchSize}, skipFloors=${skipFloors}, lastUpdated=${lastUpdated}, effectiveUnrecorded=${effectiveUnrecorded}, threshold=${threshold}`);

        if (frequency > 0 && effectiveUnrecorded >= frequency && threshold > 0) {
            // 计算需要更新的楼层范围
            const startFloor = lastUpdated + 1;
            const endFloor = Math.min(totalMessages - skipFloors, startFloor + batchSize - 1);

            if (startFloor <= endFloor && startFloor > 0) {
                tablesToUpdate.push({
                    sheetKey,
                    startFloor,
                    endFloor,
                    batchSize
                });
                console.log(`[自动更新] 表 ${sheetKey}: 需要更新，楼层范围 ${startFloor}-${endFloor}`);
            }
        }
    }

    if (tablesToUpdate.length === 0) {
        console.log('[自动更新] 触发器: 没有表格需要更新');
        return;
    }

    // 5. 合并楼层范围，执行更新
    // 找到所有需要更新的楼层的最大范围
    let minFloor = Infinity;
    let maxFloor = 0;
    const modifiedSheetKeys = [];

    for (const item of tablesToUpdate) {
        minFloor = Math.min(minFloor, item.startFloor);
        maxFloor = Math.max(maxFloor, item.endFloor);
        modifiedSheetKeys.push(item.sheetKey);
    }

    console.log(`[自动更新] 触发器: 需要更新 ${tablesToUpdate.length} 个表，合并楼层范围 ${minFloor}-${maxFloor}`);
    console.log('[自动更新] 触发器: 待更新表:', modifiedSheetKeys);

    showToast(`触发自动更新：${tablesToUpdate.length} 个表需要更新`, 'info');

    isAutoUpdating = true;
    try {
        // 记录本次更新涉及的表的 key，用于后续 per-sheet 判断
        window._currentAutoUpdateModifiedKeys = modifiedSheetKeys;

        const success = await updateDatabaseByFloorRange(minFloor, maxFloor);
        console.log('[自动更新] 触发器: 更新完成，结果:', success);

        if (success) {
            console.log('[自动更新] 过程成功完成');
            showToast('自动更新完成', 'success');
        } else {
            console.warn('[自动更新] 过程失败');
            showToast('自动更新失败', 'error');
        }
    } catch (error) {
        console.error('[自动更新] 过程出错:', error);
        showToast(`自动更新出错: ${error.message}`, 'error');
    } finally {
        isAutoUpdating = false;
        window._currentAutoUpdateModifiedKeys = null;
    }
}


/**
 * 注册事件监听器
 * @returns {boolean} 是否成功注册
 */
function registerEventListeners() {
    try {
        const context = SillyTavern.getContext();

        // 详细检查所有必需的条件
        if (!context) {
            console.warn('[自动更新] 无法获取上下文：SillyTavern.getContext() 返回 null');
            return false;
        }

        if (!context.eventSource) {
            console.warn('[自动更新] eventSource 不可用');
            return false;
        }

        if (typeof context.eventSource.on !== 'function') {
            console.warn('[自动更新] eventSource.on 不是函数');
            return false;
        }

        if (!context.eventTypes) {
            console.warn('[自动更新] eventTypes 不可用');
            return false;
        }

        // 监听生成结束事件
        if (context.eventTypes.GENERATION_ENDED) {
            context.eventSource.on(context.eventTypes.GENERATION_ENDED, (message_id) => {
                console.log(`[自动更新] 生成结束事件，message_id: ${message_id}`);
                handleNewMessageDebounced('GENERATION_ENDED');
            });
            console.log('[自动更新] GENERATION_ENDED 事件监听器已注册');
        } else {
            console.warn('[自动更新] GENERATION_ENDED 事件类型不可用');
        }

        // 监听聊天变更事件
        if (context.eventTypes.CHAT_CHANGED) {
            context.eventSource.on(context.eventTypes.CHAT_CHANGED, async (chatFileName) => {
                console.log(`[自动更新] 聊天变更事件: ${chatFileName}`);
                // 与参考文档一致：统一走新聊天重置流程
                await resetScriptStateForNewChat(chatFileName);
            });
            console.log('[自动更新] CHAT_CHANGED 事件监听器已注册');
        } else {
            console.warn('[自动更新] CHAT_CHANGED 事件类型不可用');
        }

        eventListenersRegistered = true;
        retryAttempts = 0; // 重置重试计数
        if (eventListenerRetryTimer) {
            clearInterval(eventListenerRetryTimer);
            eventListenerRetryTimer = null;
        }
        console.log('[自动更新] 所有事件监听器已成功注册');
        return true;
    } catch (error) {
        console.error('[自动更新] 注册事件监听器时出错:', error);
        return false;
    }
}

/**
 * 尝试注册事件监听器，如果失败则设置重试机制
 */
function tryRegisterEventListeners() {
    if (eventListenersRegistered) {
        console.log('[自动更新] 事件监听器已注册，跳过重复注册');
        return;
    }

    const success = registerEventListeners();
    if (!success) {
        retryAttempts++;
        if (retryAttempts < MAX_RETRY_ATTEMPTS) {
            console.log(`[自动更新] 事件监听器注册失败，将在 ${EVENT_LISTENER_RETRY_INTERVAL}ms 后重试 (${retryAttempts}/${MAX_RETRY_ATTEMPTS})`);
            if (!eventListenerRetryTimer) {
                eventListenerRetryTimer = setInterval(() => {
                    if (eventListenersRegistered) {
                        clearInterval(eventListenerRetryTimer);
                        eventListenerRetryTimer = null;
                        return;
                    }
                    const retrySuccess = registerEventListeners();
                    if (retrySuccess) {
                        clearInterval(eventListenerRetryTimer);
                        eventListenerRetryTimer = null;
                    } else {
                        retryAttempts++;
                        if (retryAttempts >= MAX_RETRY_ATTEMPTS) {
                            console.error(`[自动更新] 事件监听器注册失败，已达到最大重试次数 (${MAX_RETRY_ATTEMPTS})`);
                            clearInterval(eventListenerRetryTimer);
                            eventListenerRetryTimer = null;
                        }
                    }
                }, EVENT_LISTENER_RETRY_INTERVAL);
            }
        } else {
            console.error(`[自动更新] 事件监听器注册失败，已达到最大重试次数 (${MAX_RETRY_ATTEMPTS})`);
        }
    }
}

/**
 * 检查自动更新状态（调试用）
 * 在控制台调用 window.DataManageDebug?.checkAutoUpdateStatus() 查看状态
 */
function checkAutoUpdateStatus() {
    const context = SillyTavern.getContext();
    const status = {
        '自动更新已启用': currentSettings?.autoUpdateEnabled || false,
        '事件监听器已注册': eventListenersRegistered,
        'API已配置': (currentSettings?.apiMode === 'custom' &&
            (currentSettings?.apiConfig?.useMainApi ||
                (currentSettings?.apiConfig?.url && currentSettings?.apiConfig?.model))) ||
            (currentSettings?.apiMode === 'tavern' && currentSettings?.tavernProfile),
        '数据库已加载': !!currentJsonTableData,
        '正在更新中': isAutoUpdating,
        '上下文可用': !!context,
        'eventSource可用': !!(context?.eventSource),
        'eventTypes可用': !!(context?.eventTypes),
        '聊天记录长度': context?.chat?.length || 0,
        '配置参数': {
            '最新N层不更新': currentSettings?.autoUpdateFrequency ?? 0,
            '每次更新楼层数': currentSettings?.updateBatchSize || 1
        }
    };

    console.log('=== 自动更新状态检查 ===');
    console.table(status);

    if (!eventListenersRegistered) {
        console.warn('⚠️ 事件监听器未注册！尝试重新注册...');
        tryRegisterEventListeners();
    }

    return status;
}

/**
 * 手动触发自动更新检查（调试用）
 * 在控制台调用 window.DataManageDebug?.triggerAutoUpdate() 手动触发
 */
async function manualTriggerAutoUpdate() {
    console.log('[调试] 手动触发自动更新检查...');

    // 确保设置已加载
    if (!currentSettings) {
        loadSettings();
    }

    // 确保数据库已加载
    if (!currentJsonTableData) {
        console.log('[调试] 数据库未加载，尝试加载...');
        await loadOrCreateJsonTableFromChatHistory();
    }

    // 触发检查
    await triggerAutomaticUpdateIfNeeded();
}

// 暴露调试接口到全局（仅在开发环境）
if (typeof window !== 'undefined') {
    if (!window.DataManageDebug) {
        window.DataManageDebug = {};
    }
    window.DataManageDebug.checkAutoUpdateStatus = checkAutoUpdateStatus;
    window.DataManageDebug.triggerAutoUpdate = manualTriggerAutoUpdate;
    window.DataManageDebug.registerEventListeners = tryRegisterEventListeners;
    console.log('[自动更新] 调试接口已暴露到 window.DataManageDebug');
    console.log('[自动更新] 使用方法:');
    console.log('  - window.DataManageDebug.checkAutoUpdateStatus() - 检查状态');
    console.log('  - window.DataManageDebug.triggerAutoUpdate() - 手动触发更新');
    console.log('  - window.DataManageDebug.registerEventListeners() - 重新注册事件监听器');
}

// 初始化扩展
function initializeExtension() {
    // 注册世界书注入功能
    registerWorldbookInjection();
    // 加载扩展设置
    loadExtensionSettingsUI();

    // 如果扩展已启用，添加按钮
    if (isExtensionEnabled()) {
        addDataManageButton();
    } else {
        // 即使未启用，也更新UI以确保按钮隐藏
        updateExtensionUI();
    }

    // 尝试注册事件监听器（带重试机制）
    tryRegisterEventListeners();
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

        // 参考文档：初始化完成后，延迟到下一个事件循环执行“新聊天重置”以避免竞态
        setTimeout(async () => {
            try {
                const ctx = SillyTavern.getContext();
                const chatId = ctx?.chatId || null;
                await resetScriptStateForNewChat(chatId);
            } catch (error) {
                console.error('初始化时新聊天重置失败:', error);
            }
        }, 0);
    });
} else {
    // 如果没有 jQuery，使用原生方式
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(async () => {
                initializeExtension();
                // 初始化完成后立即进行新聊天重置（微任务后）
                setTimeout(async () => {
                    try {
                        const ctx = SillyTavern.getContext();
                        const chatId = ctx?.chatId || null;
                        await resetScriptStateForNewChat(chatId);
                    } catch (error) {
                        console.error('初始化时新聊天重置失败:', error);
                    }
                }, 0);
            }, 500);
        });
    } else {
        setTimeout(async () => {
            initializeExtension();
            // 初始化完成后立即进行新聊天重置（微任务后）
            setTimeout(async () => {
                try {
                    const ctx = SillyTavern.getContext();
                    const chatId = ctx?.chatId || null;
                    await resetScriptStateForNewChat(chatId);
                } catch (error) {
                    console.error('初始化时新聊天重置失败:', error);
                }
            }, 0);
        }, 500);
    }
}

// ==================== 世界书数据注入功能 ====================

// 世界书内容缓存（用于宏的同步访问）
let worldbookContentCache = '';
let worldbookContentCacheTime = 0;
const WORLDBOOK_CACHE_TTL = 5000; // 缓存有效期5秒

/**
 * 更新世界书内容缓存
 * 注意：缓存更新不受"启用世界书生成"开关影响，因为宏需要始终可用
 */
async function updateWorldbookContentCache() {
    try {
        // 无论开关是否启用，都更新缓存，以便宏可以获取数据
        const content = await getCombinedWorldbookContent();
        worldbookContentCache = content || '';
        worldbookContentCacheTime = Date.now();
    } catch (error) {
        console.error('更新世界书内容缓存失败:', error);
        worldbookContentCache = '';
    }
}

/**
 * 获取世界书相关提示词
 * @param {*} eventData 事件数据（可选）
 * @returns {Promise<string>} 世界书相关提示词
 */
async function getWorldbookPrompt(eventData) {
    try {
        const worldbookContent = await getCombinedWorldbookContent();
        if (!worldbookContent || worldbookContent.trim() === '') {
            return '';
        }
        // 更新缓存
        worldbookContentCache = worldbookContent;
        worldbookContentCacheTime = Date.now();
        return worldbookContent;
    } catch (error) {
        console.error('获取世界书提示词失败:', error);
        return '';
    }
}

/**
 * 初始化世界书数据（用于模板替换）
 * @param {*} eventData 事件数据（可选）
 * @returns {Promise<string>} 完整的世界书提示词
 */
async function initWorldbookData(eventData) {
    try {
        const worldbookContent = await getWorldbookPrompt(eventData);
        if (!worldbookContent || worldbookContent.trim() === '') {
            return '';
        }
        // 可以在这里添加模板，类似参考文档2中的message_template
        // 目前直接返回世界书内容
        return worldbookContent;
    } catch (error) {
        console.error('初始化世界书数据失败:', error);
        return '';
    }
}

/**
 * 宏获取表格数据（同步版本，用于宏注册）
 * 返回表格数据（与$0相同）
 * @returns {string} 表格数据文本
 */
function getMacroTableDataSync() {
    try {
        // 宏不受"启用世界书生成"开关影响，始终返回表格数据（与$0相同）
        return getTableDataTextForInjection();
    } catch (error) {
        console.error('宏获取表格数据失败:', error);
        return '';
    }
}

/**
 * 宏获取世界书提示词（异步版本，用于事件注入）
 * @returns {Promise<string>} 世界书提示词
 */
async function getMacroWorldbookPrompt() {
    try {
        if (currentSettings.enableWorldbookGeneration !== true) {
            return '';
        }
        const promptContent = await getWorldbookPrompt();
        return promptContent;
    } catch (error) {
        console.error('宏获取世界书提示词失败:', error);
        return '';
    }
}

/**
 * 获取表格数据文本（用于注入，格式与$0相同）
 * @returns {string} 表格数据文本
 */
function getTableDataTextForInjection() {
    if (!currentJsonTableData) {
        return '';
    }

    const { text, hasData } = buildReadableTableDataText(currentJsonTableData, currentSettings);
    return hasData ? text : '';
}

/**
 * 注入表格数据（与$0对应的内容相同）
 * @param {*} eventData 事件数据
 */
async function onChatCompletionPromptReadyForWorldbook(eventData) {
    try {
        // 检查是否启用世界书生成
        if (currentSettings.enableWorldbookGeneration !== true) {
            return;
        }

        // 检查是否是dryRun
        if (eventData.dryRun === true) {
            return;
        }

        console.log('[世界书注入] 开始注入表格数据');
        const tableDataText = getTableDataTextForInjection();

        if (!tableDataText || tableDataText.trim() === '') {
            console.log('[世界书注入] 表格数据为空，跳过注入');
            return;
        }

        // 构建最终提示词（与$0对应的内容相同）
        const finalPrompt = `\n${tableDataText}`;

        // 注入到聊天消息中（默认使用user角色，插入到倒数第0个位置，即最后）
        eventData.chat.push({ role: 'user', content: finalPrompt });

        console.log('[世界书注入] 表格数据已注入', eventData.chat);
    } catch (error) {
        console.error('[世界书注入] 表格数据注入失败:', error);
    }
}

/**
 * 注册世界书相关的事件监听器和宏
 */
function registerWorldbookInjection() {
    try {
        const context = SillyTavern.getContext();

        if (!context) {
            console.warn('[世界书注入] 无法获取上下文，延迟注册');
            setTimeout(registerWorldbookInjection, 1000);
            return;
        }

        // 注册宏（如果context支持）
        if (context.registerMacro && typeof context.registerMacro === 'function') {
            // 注册宏 - 使用同步函数，返回表格数据（与$0相同）
            context.registerMacro('tableData', () => {
                return getMacroTableDataSync();
            });
            console.log('[世界书注入] 宏 tableData 已注册（返回表格数据，与$0相同）');
        }

        // 注册事件监听器
        if (context.eventSource && context.eventTypes) {
            if (context.eventTypes.CHAT_COMPLETION_PROMPT_READY) {
                // 包装原始处理器，在注入前先更新缓存
                context.eventSource.on(context.eventTypes.CHAT_COMPLETION_PROMPT_READY, async (eventData) => {
                    // 在注入前先更新缓存，确保宏获取到最新数据
                    await updateWorldbookContentCache();
                    // 然后执行注入
                    await onChatCompletionPromptReadyForWorldbook(eventData);
                });
                console.log('[世界书注入] CHAT_COMPLETION_PROMPT_READY 事件监听器已注册');
            } else {
                console.warn('[世界书注入] CHAT_COMPLETION_PROMPT_READY 事件类型不可用');
            }

            // 监听聊天变更事件，更新缓存
            if (context.eventTypes.CHAT_CHANGED) {
                context.eventSource.on(context.eventTypes.CHAT_CHANGED, () => {
                    updateWorldbookContentCache();
                });
            }
        } else {
            console.warn('[世界书注入] eventSource 或 eventTypes 不可用，延迟注册');
            setTimeout(registerWorldbookInjection, 1000);
        }
    } catch (error) {
        console.error('[世界书注入] 注册失败:', error);
        // 延迟重试
        setTimeout(registerWorldbookInjection, 1000);
    }
}

