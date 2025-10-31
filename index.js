/**
 * 数据库自动更新器 - SillyTavern 扩展
 * 基于原始脚本 https://github.com/city-unit/st-extension-example
 */

(function() {
    'use strict';

    // ==================== 扩展初始化 ====================
    
    // 等待 SillyTavern 加载完成
    function initExtension() {
        console.log('[数据库自动更新器] 开始初始化...');
        
        // 检查必要的 API
        if (typeof SillyTavern === 'undefined') {
            console.warn('[数据库自动更新器] SillyTavern API 未就绪，延迟初始化...');
            setTimeout(initExtension, 1000);
            return;
        }

        // 开始初始化扩展
        mainInitialize_ACU();
    }

    // 如果 DOM 已加载，立即初始化；否则等待
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExtension);
    } else {
        setTimeout(initExtension, 500);
    }

    // ==================== 核心常量定义 ====================
    const DEBUG_MODE_ACU = true;
    const SCRIPT_ID_PREFIX_ACU = 'biaozhunbanv2';
    const POPUP_ID_ACU = `${SCRIPT_ID_PREFIX_ACU}-popup`;
    const MENU_ITEM_ID_ACU = `${SCRIPT_ID_PREFIX_ACU}-menu-item`;
    const STORAGE_KEY_CUSTOM_TEMPLATE_ACU = `${SCRIPT_ID_PREFIX_ACU}_customTemplate`;
    const STORAGE_KEY_ALL_SETTINGS_ACU = `${SCRIPT_ID_PREFIX_ACU}_allSettings_v2`;
    const MENU_ITEM_CONTAINER_ID_ACU = `${SCRIPT_ID_PREFIX_ACU}-extensions-menu-container`;
    const NEW_MESSAGE_DEBOUNCE_DELAY_ACU = 500;

    // ==================== 默认常量和模板 ====================
    const DEFAULT_CHAR_CARD_PROMPT_ACU = [
        {
            "role": "USER",
            "content": ""
        },
        {
            "role": "assistant",
            "content": ""
        }
    ];
    
    // 默认表格模板（简化版本，完整版本请从原始脚本复制）
    const DEFAULT_TABLE_TEMPLATE_ACU = `{"sheet_dCudvUnH":{"uid":"sheet_dCudvUnH","name":"全局数据表","domain":"chat","type":"dynamic","enable":true,"required":false,"triggerSend":false,"triggerSendDeep":1,"config":{"toChat":true,"useCustomStyle":false,"triggerSendToChat":false,"alternateTable":false,"insertTable":false,"alternateLevel":0,"skipTop":false,"selectedCustomStyleKey":"","customStyles":{"自定义样式":{"mode":"regex","basedOn":"html","regex":"/(^[\\\\s\\\\S]*$)/g","replace":"$1","replaceDivide":""}}},"sourceData":{"note":"记录当前主角所在地点及时间相关参数","initNode":"故事开始时，插入初始世界状态。","deleteNode":"禁止删除。","updateNode":"当主角从当前所在区域离开时，更新所在地点。每轮必须更新时间。","insertNode":"禁止操作。"},"content":[[null,"主角当前所在地点","当前时间","上轮场景时间","经过的时间"]]},"mate":{"type":"chatSheets","version":1}}`;
    let TABLE_TEMPLATE_ACU = DEFAULT_TABLE_TEMPLATE_ACU;

    const DEFAULT_AUTO_UPDATE_FREQUENCY_ACU = 1; // 最新N层不更新
    const DEFAULT_AUTO_UPDATE_TOKEN_THRESHOLD_ACU = 500; // 默认token阈值

    // 存储引用
    const topLevelWindow = (typeof window.parent !== 'undefined' ? window.parent : window);
    let storage_ACU;
    try {
        storage_ACU = topLevelWindow.localStorage;
        const testKey = 'acu_storage_test';
        storage_ACU.setItem(testKey, 'test');
        storage_ACU.removeItem(testKey);
    } catch (e) {
        console.error('[数据库自动更新器] localStorage 不可用', e);
        storage_ACU = {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
        };
    }

    // ==================== API 引用 ====================
    let SillyTavern_API_ACU, TavernHelper_API_ACU, jQuery_API_ACU, toastr_API_ACU;
    let coreApisAreReady_ACU = false;
    
    // ==================== 数据状态 ====================
    let allChatMessages_ACU = [];
    let currentChatFileIdentifier_ACU = 'unknown_chat_init';
    let currentJsonTableData_ACU = null;
    let $popupInstance_ACU = null;
    let isAutoUpdatingCard_ACU = false;
    let wasStoppedByUser_ACU = false;
    let newMessageDebounceTimer_ACU = null;
    let currentAbortController_ACU = null;

    // ==================== UI jQuery 对象占位符 ====================
    let $apiConfigSectionToggle_ACU,
        $apiConfigAreaDiv_ACU,
        $customApiUrlInput_ACU,
        $customApiKeyInput_ACU,
        $customApiModelSelect_ACU,
        $maxTokensInput_ACU,
        $temperatureInput_ACU,
        $loadModelsButton_ACU,
        $saveApiConfigButton_ACU,
        $clearApiConfigButton_ACU,
        $apiStatusDisplay_ACU,
        $charCardPromptToggle_ACU,
        $charCardPromptAreaDiv_ACU,
        $charCardPromptSegmentsContainer_ACU,
        $saveCharCardPromptButton_ACU,
        $resetCharCardPromptButton_ACU,
        $autoUpdateTokenThresholdInput_ACU,
        $saveAutoUpdateTokenThresholdButton_ACU,
        $autoUpdateFrequencyInput_ACU,
        $saveAutoUpdateFrequencyButton_ACU,
        $updateBatchSizeInput_ACU,
        $saveUpdateBatchSizeButton_ACU,
        $autoUpdateEnabledCheckbox_ACU,
        $manualUpdateCardButton_ACU,
        $floorRangeStartInput_ACU,
        $floorRangeEndInput_ACU,
        $autoHideMessagesCheckbox_ACU,
        $statusMessageSpan_ACU,
        $cardUpdateStatusDisplay_ACU,
        $useMainApiCheckbox_ACU;

    // ==================== 全局设置对象 ====================
    let settings_ACU = {
        apiConfig: { url: '', apiKey: '', model: '', useMainApi: true, max_tokens: 120000, temperature: 0.9 },
        apiMode: 'custom', // 'custom' or 'tavern'
        tavernProfile: '', // ID of the selected tavern profile
        charCardPrompt: DEFAULT_CHAR_CARD_PROMPT_ACU,
        autoUpdateFrequency: DEFAULT_AUTO_UPDATE_FREQUENCY_ACU,
        autoUpdateTokenThreshold: DEFAULT_AUTO_UPDATE_TOKEN_THRESHOLD_ACU,
        updateBatchSize: 1, // 批处理大小，默认为1
        autoUpdateEnabled: true,
        removeTags: '', // 自定义删除标签
        worldbookConfig: {
            source: 'character', // 'character' or 'manual'
            manualSelection: [], // array of worldbook filenames
            enabledEntries: {}, // {'worldbook_filename': ['entry_uid1', 'entry_uid2']}
            injectionTarget: 'character', // 'character' 或世界书文件名
        },
    };

    // ==================== 回调函数管理器 ====================
    const tableUpdateCallbacks_ACU = [];
    const tableFillStartCallbacks_ACU = [];

    // ==================== 工具函数 ====================
    function logDebug_ACU(...args) {
        if (DEBUG_MODE_ACU) console.log(`[${SCRIPT_ID_PREFIX_ACU}]`, ...args);
    }

    function logError_ACU(...args) {
        console.error(`[${SCRIPT_ID_PREFIX_ACU}]`, ...args);
    }

    function logWarn_ACU(...args) {
        console.warn(`[${SCRIPT_ID_PREFIX_ACU}]`, ...args);
    }

    function showToastr_ACU(type, message, options = {}) {
        if (toastr_API_ACU) {
            const finalOptions = { escapeHtml: false, ...options };
            return toastr_API_ACU[type](message, `数据库更新器`, finalOptions);
        } else {
            logDebug_ACU(`Toastr (${type}): ${message}`);
            return null;
        }
    }

    function escapeHtml_ACU(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function cleanChatName_ACU(fileName) {
        if (!fileName || typeof fileName !== 'string') return 'unknown_chat_source';
        let cleanedName = fileName;
        if (fileName.includes('/') || fileName.includes('\\')) {
            const parts = fileName.split(/[\\/]/);
            cleanedName = parts[parts.length - 1];
        }
        return cleanedName.replace(/\.jsonl$/, '').replace(/\.json$/, '');
    }

    // 深度合并对象（用于加载设置）
    function deepMerge_ACU(target, source) {
        const isObject = (obj) => obj && typeof obj === 'object' && !Array.isArray(obj);
        let output = { ...target };
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(key => {
                if (isObject(source[key])) {
                    if (!(key in target))
                        Object.assign(output, { [key]: source[key] });
                    else
                        output[key] = deepMerge_ACU(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    // 移除标签内容
    function removeTaggedContent_ACU(text) {
        if (!settings_ACU.removeTags || typeof text !== 'string' || text.trim() === '') {
            return text;
        }
        
        const tagsToRemove = settings_ACU.removeTags.split('|')
            .map(tag => tag.trim())
            .filter(tag => tag);
            
        if (tagsToRemove.length === 0) {
            return text;
        }
        
        let cleanedText = text;
        tagsToRemove.forEach(tag => {
            const regex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>|<${tag}\\/>`, 'gi');
            cleanedText = cleanedText.replace(regex, '');
        });
        
        return cleanedText;
    }

    // ==================== API 加载 ====================
    function attemptToLoadCoreApis_ACU() {
        const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
        SillyTavern_API_ACU = typeof SillyTavern !== 'undefined' ? SillyTavern : parentWin.SillyTavern;
        TavernHelper_API_ACU = typeof TavernHelper !== 'undefined' ? TavernHelper : parentWin.TavernHelper;
        jQuery_API_ACU = typeof $ !== 'undefined' ? $ : parentWin.jQuery;
        toastr_API_ACU = parentWin.toastr || (typeof toastr !== 'undefined' ? toastr : null);
        
        coreApisAreReady_ACU = !!(
            SillyTavern_API_ACU &&
            TavernHelper_API_ACU &&
            jQuery_API_ACU &&
            TavernHelper_API_ACU.getChatMessages &&
            TavernHelper_API_ACU.getLastMessageId &&
            TavernHelper_API_ACU.getCurrentCharPrimaryLorebook &&
            TavernHelper_API_ACU.getLorebookEntries &&
            typeof TavernHelper_API_ACU.triggerSlash === 'function'
        );
        
        if (!toastr_API_ACU) logWarn_ACU('toastr_API_ACU is MISSING.');
        if (coreApisAreReady_ACU) {
            logDebug_ACU('Core APIs successfully loaded/verified for AutoCardUpdater.');
        } else {
            logError_ACU('Failed to load one or more critical APIs for AutoCardUpdater.');
        }
        return coreApisAreReady_ACU;
    }

    // ==================== 菜单项添加 ====================
    function addAutoCardMenuItem_ACU() {
        const parentDoc = SillyTavern_API_ACU?.Chat?.document
            ? SillyTavern_API_ACU.Chat.document
            : (window.parent || window).document;
            
        if (!parentDoc || !jQuery_API_ACU) {
            logError_ACU('Cannot find parent document or jQuery for ACU menu.');
            return false;
        }
        
        const extensionsMenu = jQuery_API_ACU('#extensionsMenu', parentDoc);
        if (!extensionsMenu.length) {
            setTimeout(addAutoCardMenuItem_ACU, 2000);
            return false;
        }
        
        let $menuItemContainer = jQuery_API_ACU(`#${MENU_ITEM_CONTAINER_ID_ACU}`, extensionsMenu);
        if ($menuItemContainer.length > 0) {
            $menuItemContainer
                .find(`#${MENU_ITEM_ID_ACU}`)
                .off(`click.${SCRIPT_ID_PREFIX_ACU}`)
                .on(`click.${SCRIPT_ID_PREFIX_ACU}`, async function (e) {
                    e.stopPropagation();
                    const exMenuBtn = jQuery_API_ACU('#extensionsMenuButton', parentDoc);
                    if (exMenuBtn.length && extensionsMenu.is(':visible')) {
                        exMenuBtn.trigger('click');
                        await new Promise(r => setTimeout(r, 150));
                    }
                    await openAutoCardPopup_ACU();
                });
            return true;
        }
        
        $menuItemContainer = jQuery_API_ACU(
            `<div class="extension_container interactable" id="${MENU_ITEM_CONTAINER_ID_ACU}" tabindex="0"></div>`,
        );
        const menuItemHTML = `<div class="list-group-item flex-container flexGap5 interactable" id="${MENU_ITEM_ID_ACU}" title="打开数据库自动更新工具"><div class="fa-fw fa-solid fa-database extensionsMenuExtensionButton"></div><span>数据库更新</span></div>`;
        const $menuItem = jQuery_API_ACU(menuItemHTML);
        $menuItem.on(`click.${SCRIPT_ID_PREFIX_ACU}`, async function (e) {
            e.stopPropagation();
            const exMenuBtn = jQuery_API_ACU('#extensionsMenuButton', parentDoc);
            if (exMenuBtn.length && extensionsMenu.is(':visible')) {
                exMenuBtn.trigger('click');
                await new Promise(r => setTimeout(r, 150));
            }
            await openAutoCardPopup_ACU();
        });
        $menuItemContainer.append($menuItem);
        extensionsMenu.append($menuItemContainer);
        logDebug_ACU('ACU Menu item added.');
        return true;
    }

    // ==================== 设置管理函数 ====================
    function saveSettings_ACU() {
        try {
            storage_ACU.setItem(STORAGE_KEY_ALL_SETTINGS_ACU, JSON.stringify(settings_ACU));
            logDebug_ACU('All settings saved to localStorage:', settings_ACU);
        } catch (error) {
            logError_ACU('Failed to save settings to localStorage:', error);
            showToastr_ACU('error', '保存设置时发生浏览器存储错误。');
        }
    }

    function loadTemplateFromStorage_ACU() {
        try {
            const savedTemplate = storage_ACU.getItem(STORAGE_KEY_CUSTOM_TEMPLATE_ACU);
            if (savedTemplate) {
                const parsedTemplate = JSON.parse(savedTemplate);
                if (parsedTemplate.mate && Object.keys(parsedTemplate).some(k => k.startsWith('sheet_'))) {
                    TABLE_TEMPLATE_ACU = savedTemplate;
                    logDebug_ACU('Custom table template loaded and set.');
                    return;
                } else {
                    logWarn_ACU('Custom template from localStorage is invalid. Removing it.');
                    storage_ACU.removeItem(STORAGE_KEY_CUSTOM_TEMPLATE_ACU);
                    showToastr_ACU('warning', '自定义模板格式不正确，已重置为默认模板。', { timeOut: 10000 });
                }
            }
        } catch (error) {
            logError_ACU('Failed to load or parse custom template. It might be corrupted.', error);
            storage_ACU.removeItem(STORAGE_KEY_CUSTOM_TEMPLATE_ACU);
            showToastr_ACU('error', '自定义模板文件已损坏，无法解析。已重置为默认模板。', { timeOut: 10000 });
        }
        TABLE_TEMPLATE_ACU = DEFAULT_TABLE_TEMPLATE_ACU;
        logDebug_ACU('No valid custom template found, set to default.');
    }

    function loadSettings_ACU() {
        // 1. Load the custom template from localStorage
        loadTemplateFromStorage_ACU();

        // 2. Load all other settings
        const defaultSettings = {
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

        try {
            const savedSettingsJson = storage_ACU.getItem(STORAGE_KEY_ALL_SETTINGS_ACU);
            if (savedSettingsJson) {
                const savedSettings = JSON.parse(savedSettingsJson);
                settings_ACU = deepMerge_ACU(defaultSettings, savedSettings);
            } else {
                settings_ACU = defaultSettings;
            }
        } catch (error) {
            logError_ACU('Failed to load or parse settings, using defaults:', error);
            settings_ACU = defaultSettings;
        }

        logDebug_ACU('Settings loaded:', settings_ACU);

        // Update UI if it's open (会在 openAutoCardPopup 中实现)
        // 这里暂时不更新UI，因为弹出窗口可能还没有打开
    }

    // ==================== 弹出窗口函数（占位符）====================
    async function openAutoCardPopup_ACU() {
        logDebug_ACU('打开数据库更新器弹出窗口');
        showToastr_ACU('info', '功能开发中，请参考原始脚本文件实现完整功能');
        // TODO: 在这里实现完整的弹出窗口逻辑
        // 参考原始脚本中的 openAutoCardPopup_ACU 函数
        // 在实现时，需要调用 loadSettings_ACU() 来更新UI
    }

    // ==================== 主初始化函数 ====================
    function mainInitialize_ACU() {
        console.log('[数据库自动更新器] mainInitialize_ACU 被调用');
        
        if (attemptToLoadCoreApis_ACU()) {
            logDebug_ACU('数据库自动更新器初始化成功！核心 API 已加载');
            showToastr_ACU('success', '数据库自动更新脚本已加载!', '脚本启动');

            addAutoCardMenuItem_ACU();
            loadSettings_ACU(); // 加载设置
            // loadOrCreateJsonTableFromChatHistory_ACU(); // 需要实现（等待聊天加载）
            
            // 注册事件监听器
            if (
                SillyTavern_API_ACU &&
                SillyTavern_API_ACU.eventSource &&
                typeof SillyTavern_API_ACU.eventSource.on === 'function' &&
                SillyTavern_API_ACU.eventTypes
            ) {
                SillyTavern_API_ACU.eventSource.on(SillyTavern_API_ACU.eventTypes.CHAT_CHANGED, async chatFileName => {
                    logDebug_ACU(`ACU CHAT_CHANGED event: ${chatFileName}`);
                    // await resetScriptStateForNewChat_ACU(chatFileName); // 需要实现
                });
                
                if (SillyTavern_API_ACU.eventTypes.GENERATION_ENDED) {
                    SillyTavern_API_ACU.eventSource.on(SillyTavern_API_ACU.eventTypes.GENERATION_ENDED, (message_id) => {
                        logDebug_ACU(`ACU GENERATION_ENDED event for message_id: ${message_id}`);
                        // handleNewMessageDebounced_ACU('GENERATION_ENDED'); // 需要实现
                    });
                }
                
                logDebug_ACU('ACU: 所有事件监听器已注册');
            } else {
                logWarn_ACU('ACU: 无法注册事件监听器，因为 eventSource 或 eventTypes 缺失');
            }
        } else {
            logError_ACU('数据库自动更新脚本初始化失败：核心 API 加载失败');
            console.error('[数据库自动更新器] 初始化失败：核心 API 加载失败');
        }
    }

    // ==================== 导出 API ====================
    // 创建全局 API 对象供外部访问
    topLevelWindow.AutoCardUpdaterAPI = {
        exportTableAsJson: function() {
            return currentJsonTableData_ACU || {};
        },
        importTableAsJson: async function(jsonString) {
            // TODO: 实现导入功能
            logDebug_ACU('导入表格数据功能待实现');
            return false;
        },
        triggerUpdate: async function() {
            // TODO: 实现手动触发更新
            logDebug_ACU('手动触发更新功能待实现');
            return false;
        },
        registerTableUpdateCallback: function(callback) {
            if (typeof callback === 'function' && !tableUpdateCallbacks_ACU.includes(callback)) {
                tableUpdateCallbacks_ACU.push(callback);
                logDebug_ACU('A new table update callback has been registered.');
            }
        },
        unregisterTableUpdateCallback: function(callback) {
            const index = tableUpdateCallbacks_ACU.indexOf(callback);
            if (index > -1) {
                tableUpdateCallbacks_ACU.splice(index, 1);
                logDebug_ACU('A table update callback has been unregistered.');
            }
        },
        registerTableFillStartCallback: function(callback) {
            if (typeof callback === 'function' && !tableFillStartCallbacks_ACU.includes(callback)) {
                tableFillStartCallbacks_ACU.push(callback);
                logDebug_ACU('A new table fill start callback has been registered.');
            }
        },
        // 内部使用：通知更新
        _notifyTableUpdate: function() {
            logDebug_ACU(`Notifying ${tableUpdateCallbacks_ACU.length} callbacks about table update.`);
            const dataToSend = currentJsonTableData_ACU || {};
            tableUpdateCallbacks_ACU.forEach(callback => {
                try {
                    callback(dataToSend);
                } catch (e) {
                    logError_ACU('Error executing a table update callback:', e);
                }
            });
        },
        // 内部使用：通知填表开始
        _notifyTableFillStart: function() {
            logDebug_ACU(`Notifying ${tableFillStartCallbacks_ACU.length} callbacks about table fill start.`);
            tableFillStartCallbacks_ACU.forEach(callback => {
                try {
                    callback();
                } catch (e) {
                    logError_ACU('Error executing a table fill start callback:', e);
                }
            });
        }
    };

    console.log('[数据库自动更新器] 扩展脚本已加载，等待初始化...');

})();

