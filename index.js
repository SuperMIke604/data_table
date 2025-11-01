/**
 * 数据库自动更新器 - SillyTavern 扩展
 * 基于原始脚本 https://github.com/city-unit/st-extension-example
 */

(function() {
    'use strict';

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
    
    // 默认表格模板（完整版本）
    const DEFAULT_TABLE_TEMPLATE_ACU = `{"sheet_dCudvUnH":{"uid":"sheet_dCudvUnH","name":"全局数据表","domain":"chat","type":"dynamic","enable":true,"required":false,"triggerSend":false,"triggerSendDeep":1,"config":{"toChat":true,"useCustomStyle":false,"triggerSendToChat":false,"alternateTable":false,"insertTable":false,"alternateLevel":0,"skipTop":false,"selectedCustomStyleKey":"","customStyles":{"自定义样式":{"mode":"regex","basedOn":"html","regex":"/(^[\\\\s\\\\S]*$)/g","replace":"$1","replaceDivide":""}}},"sourceData":{"note":"记录当前主角所在地点及时间相关参数","initNode":"故事开始时，插入初始世界状态。","deleteNode":"禁止删除。","updateNode":"当主角从当前所在区域离开时，更新所在地点。每轮必须更新时间。","insertNode":"禁止操作。"},"content":[[null,"主角当前所在地点","当前时间","上轮场景时间","经过的时间"]]},"sheet_DpKcVGqg":{"uid":"sheet_DpKcVGqg","name":"主角信息","domain":"chat","type":"dynamic","enable":true,"required":false,"triggerSend":false,"triggerSendDeep":1,"config":{"toChat":true,"useCustomStyle":false,"triggerSendToChat":false,"alternateTable":false,"insertTable":false,"alternateLevel":0,"skipTop":false,"selectedCustomStyleKey":"","customStyles":{"自定义样式":{"mode":"regex","basedOn":"html","regex":"/(^[\\\\s\\\\S]*$)/g","replace":"$1","replaceDivide":""}}},"sourceData":{"note":"记录主角的核心身份信息。'过往经历'列会根据剧情发展持续增量更新，最高不超过300字，超过300字会进行精炼压缩到300字以下。新增的四个选项列用于记录当前剧情主角可以做出的动作。'主角当前所在地点'必须是'主要地点表'中的一个有效地点。","initNode":"游戏初始化时，插入主角的唯一条目。","deleteNode":"禁止删除。","updateNode":"'过往经历'列会根据剧情发展持续增量更新，每轮必须更新四个选项，当主角各项状态发生改变时更新。","insertNode":"禁止操作。"},"content":[[null,"人物名称","性别/年龄","外貌特征","职业/身份","过往经历","性格特点","选项一","选项二","选项三","选项四","主角当前所在地点"]]},"sheet_NcBlYRH5":{"uid":"sheet_NcBlYRH5","name":"重要角色表","domain":"chat","type":"dynamic","enable":true,"required":false,"triggerSend":false,"triggerSendDeep":1,"config":{"toChat":true,"useCustomStyle":false,"triggerSendToChat":false,"alternateTable":false,"insertTable":false,"alternateLevel":0,"skipTop":false,"selectedCustomStyleKey":"","customStyles":{"自定义样式":{"mode":"regex","basedOn":"html","regex":"/(^[\\\\s\\\\S]*$)/g","replace":"$1","replaceDivide":""}}},"sourceData":{"note":"记录所有关键NPC的详细信息和动态状态。'过往经历'列会根据剧情发展持续增量更新，最高不超过300字，超过300字会进行精炼压缩到300字以下","initNode":"游戏初始化时为当前在场的重要人物分别插入一个条目","deleteNode":"禁止删除","updateNode":"条目中已有角色的状态、关系、想法或经历等动态信息变化时更新，如果该角色在剧情中死亡则必须在其姓名旁用小括号备注（已死亡）。","insertNode":"剧情中有未记录的重要人物登场时添加。"},"content":[[null,"姓名","性别/年龄","外貌特征","性格特点","持有的重要物品","好感度","是否离场","过往经历"]]},"sheet_lEARaBa8":{"uid":"sheet_lEARaBa8","name":"主角技能表","domain":"chat","type":"dynamic","enable":true,"required":false,"triggerSend":false,"triggerSendDeep":1,"config":{"toChat":true,"useCustomStyle":false,"triggerSendToChat":false,"alternateTable":false,"insertTable":false,"alternateLevel":0,"skipTop":false,"selectedCustomStyleKey":"","customStyles":{"自定义样式":{"mode":"regex","basedOn":"html","regex":"/(^[\\\\s\\\\S]*$)/g","replace":"$1","replaceDivide":""}}},"sourceData":{"note":"记录主角获得的所有技能项目。","initNode":"游戏初始化时，根据设定为主角添加初始技能。","deleteNode":"技能因剧情被剥夺或替换时删除。","updateNode":"已有技能被升级时，更新其等级/阶段和效果描述。","insertNode":"主角获得新的技能时添加。"},"content":[[null,"技能名称","技能类型","等级/阶段","效果描述"]]},"sheet_in05z9vz":{"uid":"sheet_in05z9vz","name":"背包物品表","domain":"chat","type":"dynamic","enable":true,"required":false,"triggerSend":false,"triggerSendDeep":1,"config":{"toChat":true,"useCustomStyle":false,"triggerSendToChat":false,"alternateTable":false,"insertTable":false,"alternateLevel":0,"skipTop":false,"selectedCustomStyleKey":"","customStyles":{"自定义样式":{"mode":"regex","basedOn":"html","regex":"/(^[\\\\s\\\\S]*$)/g","replace":"$1","replaceDivide":""}}},"sourceData":{"note":"记录主角拥有的所有物品、装备。","initNode":"游戏初始化时，根据剧情与设定添加主角的初始携带物品。","deleteNode":"物品被完全消耗、丢弃或摧毁时删除。","updateNode":"获得已有的物品，使其数量增加时更新，已有物品状态变化时更新。","insertNode":"主角获得背包中没有的全新物品时添加。"},"content":[[null,"物品名称","数量","描述/效果","类别"]]},"sheet_etak47Ve":{"uid":"sheet_etak47Ve","name":"任务与事件表","domain":"chat","type":"dynamic","enable":true,"required":false,"triggerSend":false,"triggerSendDeep":1,"config":{"toChat":true,"useCustomStyle":false,"triggerSendToChat":false,"alternateTable":false,"insertTable":false,"alternateLevel":0,"skipTop":false,"selectedCustomStyleKey":"","customStyles":{"自定义样式":{"mode":"regex","basedOn":"html","regex":"/(^[\\\\s\\\\S]*$)/g","replace":"$1","replaceDivide":""}}},"sourceData":{"note":"记录所有当前正在进行的任务。","initNode":"游戏初始化时，根据剧情与设定添加一条主线剧情","deleteNode":"任务完成、失败或过期时删除。","updateNode":"任务取得关键进展时进行更新","insertNode":"主角接取或触发新的主线或支线任务时添加。"},"content":[[null,"任务名称","任务类型","发布者","详细描述","当前进度","任务时限","奖励","惩罚"]]},"sheet_3NoMc1wI":{"uid":"sheet_3NoMc1wI","name":"总结表","domain":"chat","type":"dynamic","enable":true,"required":false,"triggerSend":false,"triggerSendDeep":1,"config":{"toChat":true,"useCustomStyle":false,"triggerSendToChat":false,"alternateTable":false,"insertTable":false,"alternateLevel":0,"skipTop":false,"selectedCustomStyleKey":"","customStyles":{"自定义样式":{"mode":"regex","basedOn":"html","regex":"/(^[\\\\s\\\\S]*$)/g","replace":"$1","replaceDivide":""}}},"sourceData":{"note":"轮次日志，每轮交互后必须立即插入一条新记录。纪要部分要求移除记录正文里的所有修辞、对话，以第三方的视角中立客观地记录本轮发生的事情，不加任何评论，内容不低于300字。","initNode":"故事初始化时，插入一条新记录用作记录初始化剧情。","deleteNode":"禁止删除。","updateNode":"禁止操作。","insertNode":"每轮交互结束后，插入一条新记录。"},"content":[[null,"时间跨度","纪要","编码索引"]]},"sheet_PfzcX5v2":{"uid":"sheet_PfzcX5v2","name":"故事主线","domain":"chat","type":"dynamic","enable":true,"required":false,"triggerSend":false,"triggerSendDeep":1,"config":{"toChat":true,"useCustomStyle":false,"triggerSendToChat":false,"alternateTable":false,"insertTable":false,"alternateLevel":0,"skipTop":false,"selectedCustomStyleKey":"","customStyles":{"自定义样式":{"mode":"regex","basedOn":"html","regex":"/(^[\\\\s\\\\S]*$)/g","replace":"$1","replaceDivide":""}}},"sourceData":{"note":"对每轮的'总结表'进行精炼，形成故事主干。'编码索引'必须与对应'总结表'表的编码索引完全一致。","initNode":"故事初始化时，插入一条新记录用作记录初始化剧情。","deleteNode":"禁止删除。","updateNode":"禁止操作。","insertNode":"每轮交互结束后，插入一条新记录。"},"content":[[null,"大纲","编码索引"]]},"mate":{"type":"chatSheets","version":1}}`;
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

    // ==================== 表格数据管理函数 ====================
    
    // 加载所有聊天消息
    async function loadAllChatMessages_ACU() {
        if (!coreApisAreReady_ACU || !TavernHelper_API_ACU) return;
        try {
            const lastMessageId = TavernHelper_API_ACU.getLastMessageId
                ? TavernHelper_API_ACU.getLastMessageId()
                : SillyTavern_API_ACU.chat?.length
                ? SillyTavern_API_ACU.chat.length - 1
                : -1;
            if (lastMessageId < 0) {
                allChatMessages_ACU = [];
                logDebug_ACU('No chat messages (ACU).');
                return;
            }
            const messagesFromApi = await TavernHelper_API_ACU.getChatMessages(`0-${lastMessageId}`, {
                include_swipes: false,
            });
            if (messagesFromApi && messagesFromApi.length > 0) {
                allChatMessages_ACU = messagesFromApi.map((msg, idx) => ({ ...msg, id: idx }));
                logDebug_ACU(`ACU Loaded ${allChatMessages_ACU.length} messages for: ${currentChatFileIdentifier_ACU}.`);
            } else {
                allChatMessages_ACU = [];
            }
        } catch (error) {
            logError_ACU('ACU获取聊天记录失败: ' + error.message);
            allChatMessages_ACU = [];
        }
    }

    // 初始化表格数据
    async function initializeJsonTableInChatHistory_ACU() {
        logDebug_ACU('No database found in chat history. Initializing a new one from template.');
        
        try {
            let cleanTemplate = TABLE_TEMPLATE_ACU.trim();
            cleanTemplate = cleanTemplate.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
            currentJsonTableData_ACU = JSON.parse(cleanTemplate);
            logDebug_ACU('Successfully initialized database in memory.');
        } catch (error) {
            logError_ACU('Failed to parse template and initialize database in memory:', error);
            showToastr_ACU('error', '从模板解析数据库失败，请检查模板格式。');
            currentJsonTableData_ACU = null;
            return false;
        }

        logDebug_ACU('Database initialized in memory. It will be saved to chat history on the first update.');

        // 删除所有由本插件生成的旧世界书条目
        try {
            await deleteAllGeneratedEntries_ACU();
        } catch (deleteError) {
            logWarn_ACU('Failed to delete generated lorebook entries during initialization:', deleteError);
        }
        
        return true;
    }

    // 从聊天历史加载或创建表格
    async function loadOrCreateJsonTableFromChatHistory_ACU() {
        currentJsonTableData_ACU = null; // Reset before loading
        logDebug_ACU('Attempting to load database from chat history...');

        const chat = SillyTavern_API_ACU.chat;
        if (!chat || chat.length === 0) {
            logDebug_ACU('Chat history is empty. Initializing new database.');
            await initializeJsonTableInChatHistory_ACU();
            // 通知UI更新
            if (topLevelWindow.AutoCardUpdaterAPI) {
                topLevelWindow.AutoCardUpdaterAPI._notifyTableUpdate();
            }
            return;
        }

        // 从后往前查找最新的包含数据的消息
        for (let i = chat.length - 1; i >= 0; i--) {
            const message = chat[i];
            if (!message.is_user && message.TavernDB_ACU_Data) {
                logDebug_ACU(`Found database data at message index ${i}.`);
                try {
                    // 使用深拷贝来加载数据，防止对内存中数据的修改影响到历史记录
                    currentJsonTableData_ACU = JSON.parse(JSON.stringify(message.TavernDB_ACU_Data));
                    logDebug_ACU('Database content successfully loaded from chat history into memory.');
                    // 同步到世界书（不创建新条目，只更新已存在的）
                    await updateReadableLorebookEntry_ACU(false);
                    // 通知UI更新
                    if (topLevelWindow.AutoCardUpdaterAPI) {
                        topLevelWindow.AutoCardUpdaterAPI._notifyTableUpdate();
                    }
                    return;
                } catch (error) {
                    logError_ACU(`Failed to process database content from message at index ${i}.`, error);
                }
            }
        }

        // 如果找不到数据，初始化新的数据库
        logDebug_ACU('No database found in chat history. Initializing a new one.');
        await initializeJsonTableInChatHistory_ACU();
        // 通知UI更新
        if (topLevelWindow.AutoCardUpdaterAPI) {
            topLevelWindow.AutoCardUpdaterAPI._notifyTableUpdate();
        }
    }

    // 保存表格数据到聊天历史
    async function saveJsonTableToChatHistory_ACU(targetMessageIndex = -1) {
        if (!currentJsonTableData_ACU) {
            logError_ACU('Save to chat history aborted: currentJsonTableData_ACU is null.');
            return false;
        }

        const chat = SillyTavern_API_ACU.chat;
        if (!chat || chat.length === 0) {
            logError_ACU('Save failed: Chat history is empty.');
            return false;
        }

        let targetMessage = null;
        let finalIndex = -1;

        // 优先使用传入的目标索引
        if (targetMessageIndex !== -1 && chat[targetMessageIndex] && !chat[targetMessageIndex].is_user) {
            targetMessage = chat[targetMessageIndex];
            finalIndex = targetMessageIndex;
        } else {
            // 作为备用，查找最新的AI消息
            logDebug_ACU('No valid target index provided. Finding last AI message to save database.');
            for (let i = chat.length - 1; i >= 0; i--) {
                if (!chat[i].is_user) {
                    targetMessage = chat[i];
                    finalIndex = i;
                    break;
                }
            }
        }

        if (!targetMessage) {
            logWarn_ACU('Save failed: No AI message found in chat history to attach data to.');
            return false;
        }

        // 使用深拷贝来存储数据快照，防止所有消息引用同一个对象
        targetMessage.TavernDB_ACU_Data = JSON.parse(JSON.stringify(currentJsonTableData_ACU));
        logDebug_ACU(`Attached database to message at index ${finalIndex}. Saving chat...`);
        await SillyTavern_API_ACU.saveChat(); // Persist the change
        showToastr_ACU('success', '数据库已成功保存到当前聊天记录。');

        return true;
    }

    // 格式化表格数据为可读格式
    function formatJsonToReadable_ACU(jsonData) {
        if (!jsonData) return { readableText: "数据库为空。", importantPersonsTable: null, summaryTable: null, outlineTable: null };

        let readableText = '';
        let importantPersonsTable = null;
        let summaryTable = null;
        let outlineTable = null;

        const tableIndexes = Object.keys(jsonData).filter(k => k.startsWith('sheet_'));
        
        tableIndexes.forEach((sheetKey, tableIndex) => {
            const table = jsonData[sheetKey];
            if (!table || !table.name || !table.content) return;

            // 提取特殊表格 - 这些不应该包含在 ReadableDataTable 中
            switch (table.name.trim()) {
                case '重要角色表':
                    importantPersonsTable = table;
                    return; // Skip from main output
                case '总结表':
                    summaryTable = table;
                    return; // Skip from main output
                case '故事主线':
                    outlineTable = table;
                    return; // Skip from main output
                default:
                    // 处理所有其他表格，使用自定义格式
                    formatTableToCustomFormat(table, tableIndex);
                    break;
            }
        });
        
        // 辅助函数：将表格格式化为用户指定的自定义格式
        function formatTableToCustomFormat(table, tableIndex) {
            // 添加表格标题 [索引:表名]
            readableText += `[${tableIndex}:${table.name}]\n`;
            
            // 添加列信息 Columns: [0:列名1], [1:列名2], ...
            const headers = table.content[0] ? table.content[0].slice(1) : [];
            if (headers.length > 0) {
                const headerInfo = headers.map((h, i) => `[${i}:${h}]`).join('|');
                readableText += `Columns: ${headerInfo}\n`;
            }
            
            // 添加行数据 [行索引] 值1, 值2, ...
            const rows = table.content.slice(1);
            if (rows.length > 0) {
                rows.forEach((row, rowIndex) => {
                    const rowData = row.slice(1);
                    readableText += `[${rowIndex}] ${rowData.join('|')}\n`;
                });
            }
            readableText += '\n';
        }
        
        return { readableText, importantPersonsTable, summaryTable, outlineTable };
    }

    // ==================== 表格操作函数 ====================
    
    // 解析并应用表格编辑指令
    function parseAndApplyTableEdits_ACU(aiResponse) {
        if (!currentJsonTableData_ACU) {
            logError_ACU('Cannot apply edits, currentJsonTableData_ACU is not loaded.');
            return false;
        }

        // 针对AI可能返回的JS字符串格式进行清理
        let cleanedResponse = aiResponse.trim();
        // 移除JS风格的字符串拼接和转义
        cleanedResponse = cleanedResponse.replace(/'\s*\+\s*'/g, '');
        // 移除可能包裹整个响应的单引号
        if (cleanedResponse.startsWith("'") && cleanedResponse.endsWith("'")) {
            cleanedResponse = cleanedResponse.slice(1, -1);
        }
        // 将 "\\n" 转换为真实的换行符
        cleanedResponse = cleanedResponse.replace(/\\n/g, '\n');
        // 修复由JS字符串转义符（\\）导致的解析失败
        cleanedResponse = cleanedResponse.replace(/\\\\"/g, '\\"');

        const editBlockMatch = cleanedResponse.match(/<tableEdit>([\s\S]*?)<\/tableEdit>/);
        if (!editBlockMatch || !editBlockMatch[1]) {
            logWarn_ACU('No valid <tableEdit> block found in AI response.');
            return true; // Not a failure, just no edits to apply.
        }

        const editsString = editBlockMatch[1].replace(/<!--|-->/g, '').trim();
        if (!editsString) {
            logDebug_ACU('Empty <tableEdit> block. No edits to apply.');
            return true;
        }
        
        // 增加指令重组步骤，处理AI生成的多行指令
        const originalLines = editsString.split('\n');
        const commandLines = [];
        let commandReconstructor = '';

        originalLines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine === '') return;

            // 如果一行以指令开头，就处理之前缓存的指令，并开始缓存新指令
            if (trimmedLine.startsWith('insertRow') || trimmedLine.startsWith('deleteRow') || trimmedLine.startsWith('updateRow')) {
                if (commandReconstructor) {
                    commandLines.push(commandReconstructor);
                }
                commandReconstructor = trimmedLine;
            } else {
                // 如果不是指令开头，说明是上一条指令的延续，拼接到缓存
                commandReconstructor += trimmedLine;
            }
        });

        // 将最后一条缓存的指令推入
        if (commandReconstructor) {
            commandLines.push(commandReconstructor);
        }
        
        let appliedEdits = 0;

        const sheets = Object.keys(currentJsonTableData_ACU)
                             .filter(k => k.startsWith('sheet_'))
                             .map(k => currentJsonTableData_ACU[k]);

        commandLines.forEach(line => {
            // 移除行尾的注释
            const commandLineWithoutComment = line.split('//')[0].trim();
            if (!commandLineWithoutComment) {
                return; // 跳过空行或只有注释的行
            }

            // 使用正则表达式来解析指令
            const match = commandLineWithoutComment.match(/^(insertRow|deleteRow|updateRow)\s*\((.*)\);?$/);
            if (!match) {
                logWarn_ACU(`Skipping malformed or truncated command line: "${commandLineWithoutComment}"`);
                return; // continue to next line
            }

            const command = match[1];
            const argsString = match[2];
            
            try {
                // 更稳健的参数分割和JSON解析
                const firstBracket = argsString.indexOf('{');
                let args;

                if (firstBracket === -1) {
                    // 没有JSON对象，是简单的deleteRow指令
                    args = JSON.parse(`[${argsString}]`);
                } else {
                    // 包含JSON对象的指令 (insertRow, updateRow)
                    const paramsPart = argsString.substring(0, firstBracket).trim();
                    const jsonPart = argsString.substring(firstBracket);

                    // 解析前面的参数（tableIndex, rowIndex等），移除尾部逗号
                    const initialArgs = JSON.parse(`[${paramsPart.replace(/,$/, '')}]`);
                    
                    // 对JSON部分进行单独、安全的解析
                    try {
                        const jsonData = JSON.parse(jsonPart);
                        args = [...initialArgs, jsonData];
                    } catch (jsonError) {
                        logError_ACU(`Primary JSON parse failed for: "${jsonPart}". Attempting sanitization...`, jsonError);
                        let sanitizedJson = jsonPart;

                        // 清理常见的JSON错误
                        // 1. 移除尾随逗号
                        sanitizedJson = sanitizedJson.replace(/,\s*([}\]])/g, '$1');
                        // 2. 修复悬空的键（没有值的键）
                        sanitizedJson = sanitizedJson.replace(/,\s*("[^"]*"\s*)}/g, '}');
                        // 3. 修复字符串值中未转义的双引号
                        sanitizedJson = sanitizedJson.replace(/(:\s*)"((?:\\.|[^"\\])*)"/g, (match, prefix, content) => {
                            return `${prefix}"${content.replace(/(?<!\\)"/g, '\\"')}"`;
                        });

                        try {
                            const jsonData = JSON.parse(sanitizedJson);
                            args = [...initialArgs, jsonData];
                            logDebug_ACU(`Successfully parsed JSON after sanitization: "${sanitizedJson}"`);
                        } catch (finalError) {
                            logError_ACU(`Sanitization failed. Could not parse: "${sanitizedJson}"`, finalError);
                            throw jsonError; // Re-throw original error if sanitization fails
                        }
                    }
                }

                // 执行表格操作
                switch (command) {
                    case 'insertRow': {
                        const [tableIndex, data] = args;
                        const table = sheets[tableIndex];
                        if (table && table.content && typeof data === 'object') {
                            const newRow = [null];
                            const headers = table.content[0].slice(1);
                            headers.forEach((_, colIndex) => {
                                newRow.push(data[colIndex] !== undefined ? data[colIndex] : (data[String(colIndex)] || ""));
                            });
                            table.content.push(newRow);
                            logDebug_ACU(`Applied insertRow to table ${tableIndex} (${table.name}) with data:`, data);
                            appliedEdits++;
                        }
                        break;
                    }
                    case 'deleteRow': {
                        const [tableIndex, rowIndex] = args;
                        const table = sheets[tableIndex];
                        if (table && table.content && table.content.length > rowIndex + 1) {
                            table.content.splice(rowIndex + 1, 1);
                            logDebug_ACU(`Applied deleteRow to table ${tableIndex} (${table.name}) at index ${rowIndex}`);
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
                            logDebug_ACU(`Applied updateRow to table ${tableIndex} (${table.name}) at index ${rowIndex} with data:`, data);
                            appliedEdits++;
                        }
                        break;
                    }
                }
            } catch (e) {
                logError_ACU(`Failed to parse or apply command: "${line}"`, e);
            }
        });
        
        if (appliedEdits > 0) {
            showToastr_ACU('info', `从AI响应中成功应用了 ${appliedEdits} 个数据库更新。`);
        }
        return true;
    }

    // ==================== 世界书内容获取函数（简化版）====================
    // TODO: 将在世界书同步阶段完善此函数
    async function getCombinedWorldbookContent_ACU() {
        logDebug_ACU('Starting to get combined worldbook content...');
        const worldbookConfig = settings_ACU.worldbookConfig;

        if (!TavernHelper_API_ACU || !SillyTavern_API_ACU) {
            logWarn_ACU('[ACU] TavernHelper or SillyTavern API not available, cannot get worldbook content.');
            return '';
        }

        try {
            let bookNames = [];
            
            if (worldbookConfig.source === 'manual') {
                bookNames = worldbookConfig.manualSelection || [];
            } else { // 'character' mode
                try {
                    const charLorebooks = await TavernHelper_API_ACU.getCharLorebooks({ type: 'all' });
                    if (charLorebooks.primary) bookNames.push(charLorebooks.primary);
                    if (charLorebooks.additional?.length) bookNames.push(...charLorebooks.additional);
                } catch (e) {
                    logWarn_ACU('Failed to get character lorebooks:', e);
                }
            }

            if (bookNames.length === 0) {
                logDebug_ACU('No worldbooks selected or available for the character.');
                return '';
            }

            let allEntries = [];
            for (const bookName of bookNames) {
                if (bookName) {
                    try {
                        const entries = await TavernHelper_API_ACU.getLorebookEntries(bookName);
                        if (entries?.length) {
                            entries.forEach(entry => allEntries.push({ ...entry, bookName }));
                        }
                    } catch (e) {
                        logWarn_ACU(`Failed to get entries for worldbook ${bookName}:`, e);
                    }
                }
            }

            // 过滤掉由插件生成的世界书条目
            const prefixesToExclude_ACU = [
                'TavernDB-ACU-ReadableDataTable',
                '重要人物条目',
                'TavernDB-ACU-ImportantPersonsIndex',
                '总结条目',
                'TavernDB-ACU-OutlineTable'
            ];
            allEntries = allEntries.filter(entry =>
                !entry.comment || !prefixesToExclude_ACU.some(prefix => entry.comment.startsWith(prefix))
            );

            if (allEntries.length === 0) {
                logDebug_ACU('Selected worldbooks contain no entries after filtering.');
                return '';
            }
            
            // 根据用户设置的启用条目进行过滤
            const enabledEntriesMap = worldbookConfig.enabledEntries || {};
            const userEnabledEntries = allEntries.filter(entry => {
                if (!entry.enabled) return false;
                const bookConfig = enabledEntriesMap[entry.bookName];
                return bookConfig ? bookConfig.includes(entry.uid) : false; 
            });

            if (userEnabledEntries.length === 0) {
                logDebug_ACU('No entries are enabled in the plugin settings.');
                return '';
            }
            
            // 简化版：只返回启用的条目内容，不进行递归触发
            const finalContent = userEnabledEntries.map(entry => {
                return `### ${entry.comment || `Entry from ${entry.bookName}`}\n${entry.content}`;
            }).filter(Boolean);

            if (finalContent.length === 0) {
                logDebug_ACU('No worldbook entries available.');
                return '';
            }

            const combinedContent = finalContent.join('\n\n');
            logDebug_ACU(`Combined worldbook content generated, length: ${combinedContent.length}. ${userEnabledEntries.length} entries included.`);
            return combinedContent.trim();

        } catch (error) {
            logError_ACU(`[ACU] An error occurred while processing worldbook logic:`, error);
            return ''; // Return empty string on error to prevent breaking the generation.
        }
    }

    // ==================== AI 调用相关函数 ====================
    
    // 步骤 8.1: 准备 AI 输入内容
    async function prepareAIInput_ACU(messages) {
        // 此函数简化为只准备动态内容部分
        // 主要提示词组装将在 callCustomOpenAI_ACU 中完成
        if (!currentJsonTableData_ACU) {
            logError_ACU('prepareAIInput_ACU: Cannot prepare AI input, currentJsonTableData_ACU is null.');
            return null;
        }

        const worldbookContent = await getCombinedWorldbookContent_ACU();

        // 1. 格式化当前 JSON 表格数据为可读文本块 (用于 $0)
        let tableDataText = '';
        const tableIndexes = Object.keys(currentJsonTableData_ACU).filter(k => k.startsWith('sheet_'));
        tableIndexes.forEach((sheetKey, tableIndex) => {
            const table = currentJsonTableData_ACU[sheetKey];
            if (!table || !table.name || !table.content) return;
            tableDataText += `[${tableIndex}:${table.name}]\n`;
            const headers = table.content[0] ? table.content[0].slice(1).map((h, i) => `[${i}:${h}]`).join('|') : 'No Headers';
            tableDataText += `  Columns: ${headers}\n`;
            const allRows = table.content.slice(1);
            let rowsToProcess = allRows;
            let startIndex = 0;

            // 如果是总结表并且行数超过10，则只提取最新的10条
            if (table.name.trim() === '总结表' && allRows.length > 10) {
                startIndex = allRows.length - 10;
                rowsToProcess = allRows.slice(-10);
                tableDataText += `  - Note: Showing last ${rowsToProcess.length} of ${allRows.length} entries.\n`;
            }

            if (rowsToProcess.length > 0) {
                rowsToProcess.forEach((row, index) => {
                    const originalRowIndex = startIndex + index; // 计算原始行索引
                    const rowData = row.slice(1).join('|');
                    tableDataText += `  [${originalRowIndex}] ${rowData}\n`;
                });
            } else {
                tableDataText += '  (No data rows)\n';
            }
            tableDataText += '\n';
        });
        
        // 2. 格式化消息内容 (用于 $1)
        let messagesText = '当前最新对话内容:\n';
        if (messages && messages.length > 0) {
            messagesText += messages.map(msg => {
                const prefix = msg.is_user ? (SillyTavern_API_ACU?.name1 || '用户') : (msg.name || '角色');
                const content = msg.mes || msg.message || '';
                const cleanedContent = removeTaggedContent_ACU(content);
                return `${prefix}: ${cleanedContent}`;
            }).join('\n');
        } else {
            messagesText += '(无最新对话内容)';
        }

        // 返回动态部分用于插值替换
        return { tableDataText, messagesText, worldbookContent };
    }

    // 步骤 8.2: 调用自定义 OpenAI API
    async function callCustomOpenAI_ACU(dynamicContent) {
        // 创建一个新的 AbortController 用于本次请求
        currentAbortController_ACU = new AbortController();
        const abortSignal = currentAbortController_ACU.signal;

        // 组装最终的消息数组
        const messages = [];
        const charCardPromptSetting = settings_ACU.charCardPrompt;

        let promptSegments = [];
        if (Array.isArray(charCardPromptSetting)) {
            promptSegments = charCardPromptSetting;
        } else if (typeof charCardPromptSetting === 'string') {
            // 处理旧版单字符串格式
            promptSegments = [{ role: 'USER', content: charCardPromptSetting }];
        }

        // 在每个段落中插值替换占位符
        promptSegments.forEach(segment => {
            let finalContent = segment.content;
            finalContent = finalContent.replace('$0', dynamicContent.tableDataText || '');
            finalContent = finalContent.replace('$1', dynamicContent.messagesText || '');
            finalContent = finalContent.replace('$4', dynamicContent.worldbookContent || '');
            
            // 将 role 转换为小写以符合 API 要求
            messages.push({ role: segment.role.toLowerCase(), content: finalContent });
        });

        logDebug_ACU('Final messages array being sent to API:', messages);

        if (settings_ACU.apiMode === 'tavern') {
            // 使用酒馆连接预设模式
            const profileId = settings_ACU.tavernProfile;
            if (!profileId) {
                throw new Error('未选择酒馆连接预设。');
            }

            let originalProfile = '';
            let responsePromise;
            let rawResult;

            try {
                originalProfile = await TavernHelper_API_ACU.triggerSlash('/profile');
                const targetProfile = SillyTavern_API_ACU.extensionSettings?.connectionManager?.profiles?.find(p => p.id === profileId);

                if (!targetProfile) {
                    throw new Error(`无法找到ID为 "${profileId}" 的连接预设。`);
                }
                if (!targetProfile.api) {
                    throw new Error(`预设 "${targetProfile.name || targetProfile.id}" 没有配置API。`);
                }
                if (!targetProfile.preset) {
                    throw new Error(`预设 "${targetProfile.name || targetProfile.id}" 没有选择预设。`);
                }

                const targetProfileName = targetProfile.name;
                const currentProfile = await TavernHelper_API_ACU.triggerSlash('/profile');

                if (currentProfile !== targetProfileName) {
                    const escapedProfileName = targetProfileName.replace(/"/g, '\\"');
                    await TavernHelper_API_ACU.triggerSlash(`/profile await=true "${escapedProfileName}"`);
                }
                
                logDebug_ACU(`ACU: 通过酒馆连接预设 (ID: ${profileId}, Name: ${targetProfileName}) 发送请求...`);

                if (SillyTavern_API_ACU.ConnectionManagerRequestService && typeof SillyTavern_API_ACU.ConnectionManagerRequestService.sendRequest === 'function') {
                    responsePromise = SillyTavern_API_ACU.ConnectionManagerRequestService.sendRequest(
                        profileId, 
                        messages, 
                        settings_ACU.apiConfig.max_tokens || 4096 
                    );
                } else {
                    throw new Error('ConnectionManagerRequestService 不可用。');
                }

            } catch (error) {
                logError_ACU(`ACU: 调用酒馆连接预设时出错:`, error);
                showToastr_ACU('error', `API请求失败 (酒馆预设): ${error.message}`);
                responsePromise = Promise.resolve(null);
            } finally {
                try {
                    const currentProfileAfterCall = await TavernHelper_API_ACU.triggerSlash('/profile');
                    if (originalProfile && originalProfile !== currentProfileAfterCall) {
                        const escapedOriginalProfile = originalProfile.replace(/"/g, '\\"');
                        await TavernHelper_API_ACU.triggerSlash(`/profile await=true "${escapedOriginalProfile}"`);
                        logDebug_ACU(`ACU: 已恢复原酒馆连接预设: "${originalProfile}"`);
                    }
                } catch (e) {
                    logWarn_ACU('Failed to restore original profile:', e);
                }
            }
            
            rawResult = await responsePromise;

            if (rawResult && rawResult.ok && rawResult.result?.choices?.[0]?.message?.content) {
                return rawResult.result.choices[0].message.content.trim();
            } else if (rawResult && typeof rawResult.content === 'string') {
                return rawResult.content.trim();
            } else {
                const errorMsg = rawResult?.error || JSON.stringify(rawResult);
                throw new Error(`酒馆预设API调用返回无效响应: ${errorMsg}`);
            }

        } else { // 'custom' mode
            // 使用自定义API模式
            if (settings_ACU.apiConfig.useMainApi) {
                // 模式A: 使用主API
                logDebug_ACU('ACU: 通过酒馆主API发送请求...');
                if (typeof TavernHelper_API_ACU.generateRaw !== 'function') {
                    throw new Error('TavernHelper.generateRaw 函数不存在。请检查酒馆版本。');
                }
                const response = await TavernHelper_API_ACU.generateRaw({
                    ordered_prompts: messages,
                    should_stream: false, // 数据库更新不需要流式输出
                });
                if (typeof response !== 'string') {
                    throw new Error('主API调用未返回预期的文本响应。');
                }
                return response.trim();

            } else {
                // 模式B: 使用独立配置的API
                if (!settings_ACU.apiConfig.url || !settings_ACU.apiConfig.model) {
                    throw new Error('自定义API的URL或模型未配置。');
                }
                const generateUrl = `/api/backends/chat-completions/generate`;
                
                const headers = { ...SillyTavern_API_ACU.getRequestHeaders(), 'Content-Type': 'application/json' };
                
                const body = JSON.stringify({
                    "messages": messages,
                    "model": settings_ACU.apiConfig.model,
                    "temperature": settings_ACU.apiConfig.temperature,
                    "frequency_penalty": 0,
                    "presence_penalty": 0.12,
                    "top_p": settings_ACU.apiConfig.top_p || 0.9,
                    "max_tokens": settings_ACU.apiConfig.max_tokens,
                    "stream": false,
                    "chat_completion_source": "custom",
                    "group_names": [],
                    "include_reasoning": false,
                    "reasoning_effort": "medium",
                    "enable_web_search": false,
                    "request_images": false,
                    "custom_prompt_post_processing": "strict",
                    "reverse_proxy": settings_ACU.apiConfig.url,
                    "proxy_password": "",
                    "custom_url": settings_ACU.apiConfig.url,
                    "custom_include_headers": settings_ACU.apiConfig.apiKey ? `Authorization: Bearer ${settings_ACU.apiConfig.apiKey}` : ""
                });
                
                logDebug_ACU('ACU: 调用新的后端生成API:', generateUrl, 'Model:', settings_ACU.apiConfig.model);
                const response = await fetch(generateUrl, { method: 'POST', headers, body, signal: abortSignal });
                
                if (!response.ok) {
                    const errTxt = await response.text();
                    throw new Error(`API请求失败: ${response.status} ${errTxt}`);
                }
                
                const data = await response.json();
                // 新的后端 API 直接在响应中返回内容
                if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                    return data.choices[0].message.content.trim();
                }
                throw new Error('API响应格式不正确或内容为空。');
            }
        }
    }

    // 步骤 10.1: 处理批量更新（主入口）
    async function processUpdates_ACU(indicesToUpdate, mode = 'auto') {
        if (!indicesToUpdate || indicesToUpdate.length === 0) {
            return true; 
        }

        isAutoUpdatingCard_ACU = true;

        const batchSize = settings_ACU.updateBatchSize || 1;
        const batches = [];
        for (let i = 0; i < indicesToUpdate.length; i += batchSize) {
            batches.push(indicesToUpdate.slice(i, i + batchSize));
        }

        logDebug_ACU(`[${mode}] Processing ${indicesToUpdate.length} updates in ${batches.length} batches of size ${batchSize}.`);

        let overallSuccess = true;
        const chatHistory = SillyTavern_API_ACU.chat || [];

        for (let i = 0; i < batches.length; i++) {
            const batchIndices = batches[i];
            const batchNumber = i + 1;
            const totalBatches = batches.length;
            const firstMessageIndexOfBatch = batchIndices[0];
            const lastMessageIndexOfBatch = batchIndices[batchIndices.length - 1];

            // 1. 加载基础数据库：从当前批次开始的位置往前找最近的记录
            let foundDb = false;
            for (let j = firstMessageIndexOfBatch - 1; j >= 0; j--) {
                const msg = chatHistory[j];
                if (!msg.is_user && msg.TavernDB_ACU_Data) {
                    currentJsonTableData_ACU = JSON.parse(JSON.stringify(msg.TavernDB_ACU_Data));
                    logDebug_ACU(`[Batch ${batchNumber}] Loaded database state from message index ${j}.`);
                    foundDb = true;
                    break;
                }
            }
            if (!foundDb) {
                logDebug_ACU(`[Batch ${batchNumber}] No previous database found. Initializing from template.`);
                try {
                    currentJsonTableData_ACU = JSON.parse(TABLE_TEMPLATE_ACU);
                } catch (e) {
                    logError_ACU("Failed to parse table template.", e);
                    showToastr_ACU('error', "无法解析数据库模板，操作已终止。");
                    overallSuccess = false;
                    break;
                }
            }

            // 2. 批处理：处理当前批次的所有消息
            const firstMessageIndexOfBatchAdjusted = Math.max(0, firstMessageIndexOfBatch - 1);
            let sliceStartIndex = firstMessageIndexOfBatchAdjusted;
            
            // 确保包含用户消息
            if (sliceStartIndex > 0 && chatHistory[sliceStartIndex] && !chatHistory[sliceStartIndex].is_user && chatHistory[sliceStartIndex - 1]?.is_user) {
                sliceStartIndex--;
                logDebug_ACU(`[Batch ${batchNumber}] Adjusted slice start to ${sliceStartIndex} to include user message.`);
            }

            const messagesForContext = chatHistory.slice(sliceStartIndex, lastMessageIndexOfBatch + 1);
            
            const contextText = messagesForContext.map(msg => msg.mes || msg.message || '').join('\n');
            const contextTokenCount = contextText.length;
            const tokenThreshold = settings_ACU.autoUpdateTokenThreshold || 0;

            if (mode === 'auto' && contextTokenCount < tokenThreshold) {
                logDebug_ACU(`[Auto] Batch ${batchNumber}/${totalBatches} skipped: Context token count (${contextTokenCount}) is below threshold (${tokenThreshold}).`);
                showToastr_ACU('info', `上下文过短 (约 ${contextTokenCount} tokens)，跳过自动更新。`);
                continue; // 跳过此批次，但不算失败
            }

            // 3. 执行更新并保存
            const toastMessage = `正在处理 ${mode === 'manual' ? '手动' : '自动'} 更新 (${batchNumber}/${totalBatches})...`;
            const success = await proceedWithCardUpdate_ACU(messagesForContext, toastMessage, lastMessageIndexOfBatch);

            if (!success) {
                showToastr_ACU('error', `批处理在第 ${batchNumber} 批时失败或被终止。`);
                overallSuccess = false;
                break; 
            }
        }
        
        isAutoUpdatingCard_ACU = false;
        return overallSuccess;
    }

    // 步骤 8.3: 执行数据库更新流程
    async function proceedWithCardUpdate_ACU(messagesToUse, batchToastMessage = '正在填表，请稍候...', saveTargetIndex = -1, isImportMode = false) {
        if (!$statusMessageSpan_ACU && $popupInstance_ACU) {
            $statusMessageSpan_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-status-message`);
        }

        const statusUpdate = (text) => {
            if ($statusMessageSpan_ACU) $statusMessageSpan_ACU.text(text);
        };

        let loadingToast = null;
        let success = false;
        const maxRetries = 3;

        try {
            topLevelWindow.AutoCardUpdaterAPI._notifyTableFillStart();
            
            // 创建终止按钮的HTML
            const stopButtonHtml = `
                <button id="acu-stop-update-btn" 
                        style="border: 1px solid #ffc107; color: #ffc107; background: transparent; padding: 5px 10px; border-radius: 4px; cursor: pointer; float: right; margin-left: 15px; font-size: 0.9em; transition: all 0.2s ease;"
                        onmouseover="this.style.backgroundColor='#ffc107'; this.style.color='#1a1d24';"
                        onmouseout="this.style.backgroundColor='transparent'; this.style.color='#ffc107';">
                    终止
                </button>`;
            const toastMessage = `<div>${batchToastMessage}${stopButtonHtml}</div>`;
            
            loadingToast = showToastr_ACU('info', toastMessage, { 
                timeOut: 0, 
                extendedTimeOut: 0, 
                tapToDismiss: false,
                onShown: function() {
                    const $stopButton = jQuery_API_ACU('#acu-stop-update-btn');
                    if ($stopButton.length) {
                        $stopButton.off('click.acu_stop').on('click.acu_stop', function(e) {
                            e.stopPropagation();
                            e.preventDefault();

                            // 设置标志，告知事件监听器本次更新是用户手动终止的
                            wasStoppedByUser_ACU = true;

                            // 1. 中止网络请求
                            if (currentAbortController_ACU) {
                                currentAbortController_ACU.abort();
                            }
                            if (SillyTavern_API_ACU && typeof SillyTavern_API_ACU.stopGeneration === 'function') {
                                SillyTavern_API_ACU.stopGeneration();
                                logDebug_ACU('Called SillyTavern_API_ACU.stopGeneration()');
                            }
                            
                            // 2. 立即重置UI状态
                            isAutoUpdatingCard_ACU = false;
                            if ($manualUpdateCardButton_ACU) {
                                $manualUpdateCardButton_ACU.prop('disabled', false).text('按楼层范围更新数据库');
                            }
                            if ($statusMessageSpan_ACU) {
                                $statusMessageSpan_ACU.text('操作已终止。');
                            }

                            // 3. 移除toast并显示确认
                            jQuery_API_ACU(this).closest('.toast').remove();
                            showToastr_ACU('warning', '填表操作已由用户终止。');
                        });
                    } else {
                        logError_ACU('Could not find the stop button in the toast.');
                    }
                }
            });

            statusUpdate('准备AI输入...');
            const dynamicContent = await prepareAIInput_ACU(messagesToUse);
            if (!dynamicContent) throw new Error('无法准备AI输入，数据库未加载。');

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                statusUpdate(`第 ${attempt}/${maxRetries} 次调用AI进行增量更新...`);
                const aiResponse = await callCustomOpenAI_ACU(dynamicContent);

                if (currentAbortController_ACU && currentAbortController_ACU.signal.aborted) {
                    throw new DOMException('Aborted by user', 'AbortError');
                }

                if (!aiResponse || !aiResponse.includes('<tableEdit>') || !aiResponse.includes('</tableEdit>')) {
                    logWarn_ACU(`第 ${attempt} 次尝试失败：AI响应中未找到完整有效的 <tableEdit> 标签。`);
                    if (attempt === maxRetries) {
                        throw new Error(`AI在 ${maxRetries} 次尝试后仍未能返回有效指令。`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后重试
                    continue;
                }

                statusUpdate('解析并应用AI返回的更新...');
                const parseSuccess = parseAndApplyTableEdits_ACU(aiResponse);
                if (!parseSuccess) throw new Error('解析或应用AI更新时出错。');
                
                success = true;
                break; 
            }

            if (success) {
                // 在导入模式下，不保存到聊天记录，而是由父函数在最后统一处理
                if (!isImportMode) {
                    statusUpdate('正在将更新后的数据库保存到聊天记录...');
                    const saveSuccess = await saveJsonTableToChatHistory_ACU(saveTargetIndex);
                    if (!saveSuccess) throw new Error('无法将更新后的数据库保存到聊天记录。');
                    
                    await updateReadableLorebookEntry_ACU(true);
                } else {
                    statusUpdate('分块处理成功...');
                    logDebug_ACU("Import mode: skipping save to chat history for this chunk.");
                }

                setTimeout(() => {
                    topLevelWindow.AutoCardUpdaterAPI._notifyTableUpdate();
                    logDebug_ACU('Delayed notification sent after saving.');
                }, 250);
                
                statusUpdate('数据库增量更新成功！');
                // TODO: 将在UI阶段实现
                // if (typeof updateCardUpdateStatusDisplay_ACU === 'function') {
                //     updateCardUpdateStatusDisplay_ACU();
                // }
            }
            return success;

        } catch (error) {
            if (error.name === 'AbortError') {
                logDebug_ACU('Fetch request was aborted by the user.');
                // UI状态已在点击处理器中重置，这里只需要记录并返回
            } else {
                logError_ACU(`数据库增量更新流程失败: ${error.message}`);
                showToastr_ACU('error', `更新失败: ${error.message}`);
                statusUpdate('错误：更新失败。');
            }
            return false;
        } finally {
            // toast在点击处理器中被移除（中止时），这里只在成功/错误时清除
            if (loadingToast && toastr_API_ACU) {
                toastr_API_ACU.clear(loadingToast);
            }
            currentAbortController_ACU = null;
            // 不在此处重置 isAutoUpdatingCard_ACU 和按钮状态，交由上层调用函数管理
        }
    }

    // ==================== 世界书同步相关函数 ====================
    
    // 步骤 9.1: 获取注入目标世界书
    async function getInjectionTargetLorebook_ACU() {
        const target = settings_ACU.worldbookConfig.injectionTarget;
        if (target === 'character') {
            return await TavernHelper_API_ACU.getCurrentCharPrimaryLorebook();
        }
        return target; // 直接返回世界书名称
    }

    // 步骤 9.1: 删除所有生成的世界书条目
    async function deleteAllGeneratedEntries_ACU(targetLorebook = null) {
        const primaryLorebookName = targetLorebook || (await getInjectionTargetLorebook_ACU());
        if (!primaryLorebookName) return;

        try {
            const allEntries = await TavernHelper_API_ACU.getLorebookEntries(primaryLorebookName);
            
            const prefixesToDelete = [
                'TavernDB-ACU-ReadableDataTable',     // 全局可读条目
                'TavernDB-ACU-OutlineTable',          // 故事主线条目
                '重要人物条目',                       // 重要人物条目
                'TavernDB-ACU-ImportantPersonsIndex', // 重要人物索引条目
                '总结条目',                           // 总结条目
                '小总结条目',                         // 小总结条目
                '外部导入-TavernDB-ACU-ReadableDataTable', // 外部导入的全局可读条目
                '外部导入-TavernDB-ACU-OutlineTable',     // 外部导入的故事主线条目
                '外部导入-重要人物条目',                   // 外部导入的重要人物条目
                '外部导入-TavernDB-ACU-ImportantPersonsIndex', // 外部导入的重要人物索引条目
                '外部导入-总结条目',                         // 外部导入的总结条目
                '外部导入-小总结条目'                        // 外部导入的小总结条目
            ];

            const uidsToDelete = allEntries
                .filter(entry => entry.comment && prefixesToDelete.some(prefix => entry.comment.startsWith(prefix)))
                .map(entry => entry.uid);

            if (uidsToDelete.length > 0) {
                await TavernHelper_API_ACU.deleteLorebookEntries(primaryLorebookName, uidsToDelete);
                logDebug_ACU(`Successfully deleted ${uidsToDelete.length} generated database entries.`);
            }
        } catch(error) {
            logError_ACU('Failed to delete generated lorebook entries:', error);
        }
    }

    // 步骤 9.3: 更新故事主线条目
    async function updateOutlineTableEntry_ACU(outlineTable, isImport = false) {
        if (!TavernHelper_API_ACU) return;
        const primaryLorebookName = await getInjectionTargetLorebook_ACU();
        if (!primaryLorebookName) {
            logWarn_ACU('Cannot update outline table entry: No injection target lorebook set.');
            return;
        }

        const IMPORT_PREFIX = '外部导入-';
        const OUTLINE_COMMENT = isImport ? `${IMPORT_PREFIX}TavernDB-ACU-OutlineTable` : 'TavernDB-ACU-OutlineTable';

        try {
            const allEntries = await TavernHelper_API_ACU.getLorebookEntries(primaryLorebookName);
            const existingEntry = allEntries.find(e => e.comment === OUTLINE_COMMENT);

            // 如果没有主线条目数据，删除存在的条目
            if (!outlineTable || outlineTable.content.length < 2) {
                if (existingEntry) {
                    await TavernHelper_API_ACU.deleteLorebookEntries(primaryLorebookName, [existingEntry.uid]);
                    logDebug_ACU('Deleted outline table entry as there is no data.');
                }
                return;
            }

            // 格式化整个表格
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
                    const updatedEntry = { uid: existingEntry.uid, content: finalContent, enabled: true, type: 'constant', prevent_recursion: true };
                    await TavernHelper_API_ACU.setLorebookEntries(primaryLorebookName, [updatedEntry]);
                    logDebug_ACU('Successfully updated the outline table lorebook entry.');
                }
            } else {
                const newEntry = {
                    comment: OUTLINE_COMMENT,
                    content: finalContent,
                    keys: [OUTLINE_COMMENT + '-Key'],
                    enabled: true,
                    type: 'constant',
                    order: 99996, // High priority
                    prevent_recursion: true,
                };
                await TavernHelper_API_ACU.createLorebookEntries(primaryLorebookName, [newEntry]);
                logDebug_ACU('Outline table lorebook entry not found. Created a new one.');
            }
        } catch(error) {
            logError_ACU('Failed to update outline table lorebook entry:', error);
        }
    }

    // 步骤 9.4: 更新总结表条目
    async function updateSummaryTableEntries_ACU(summaryTable, isImport = false) {
        if (!TavernHelper_API_ACU) return;
        const primaryLorebookName = await getInjectionTargetLorebook_ACU();
        if (!primaryLorebookName) {
            logWarn_ACU('Cannot update summary entries: No injection target lorebook set.');
            return;
        }

        const IMPORT_PREFIX = '外部导入-';
        const SUMMARY_ENTRY_PREFIX = isImport ? `${IMPORT_PREFIX}总结条目` : '总结条目';

        try {
            const allEntries = await TavernHelper_API_ACU.getLorebookEntries(primaryLorebookName);
            
            // 1. 删除所有旧的总结条目
            const uidsToDelete = allEntries
                .filter(e => e.comment && (e.comment.startsWith(SUMMARY_ENTRY_PREFIX) || e.comment.startsWith(isImport ? `${IMPORT_PREFIX}小总结条目` : '小总结条目')))
                .map(e => e.uid);

            if (uidsToDelete.length > 0) {
                await TavernHelper_API_ACU.deleteLorebookEntries(primaryLorebookName, uidsToDelete);
                logDebug_ACU(`Deleted ${uidsToDelete.length} old summary lorebook entries.`);
            }

            // 2. 从表格重新创建条目
            const summaryRows = (summaryTable?.content?.length > 1) ? summaryTable.content.slice(1) : [];
            if (summaryRows.length === 0) {
                logDebug_ACU('No summary rows to create entries for.');
                return;
            }

            const headers = summaryTable.content[0].slice(1);
            const keywordColumnIndex = headers.indexOf('检索词');
            if (keywordColumnIndex === -1) {
                logError_ACU('Cannot find "检索词" column in 总结表. Cannot process summary entries.');
                return;
            }

            const entriesToCreate = [];
            summaryRows.forEach((row, i) => {
                const rowData = row.slice(1);
                const keywordsRaw = rowData[keywordColumnIndex];
                if (!keywordsRaw) return; // 跳过没有关键词的行

                const keywords = keywordsRaw.split('|').map(k => k.trim()).filter(Boolean);
                if (keywords.length === 0) return;

                const content = `<summary>\n\n[0:${summaryTable.name}] (条目 ${i + 1})\n\nColumns: ${headers.map((h, idx) => `[${idx}:${h}]`).join('|')}\n\n[0] ${rowData.join('|')}\n\n</summary>`;
                const newEntryData = {
                    comment: `${SUMMARY_ENTRY_PREFIX}${i + 1}`,
                    content: content,
                    keys: keywords,
                    enabled: true,
                    type: 'keyword', // Green light entry
                    order: 9998,
                    prevent_recursion: true
                };
                entriesToCreate.push(newEntryData);
            });
            
            if (entriesToCreate.length > 0) {
                await TavernHelper_API_ACU.createLorebookEntries(primaryLorebookName, entriesToCreate);
                logDebug_ACU(`Successfully created ${entriesToCreate.length} new summary entries.`);
            }

        } catch(error) {
            logError_ACU('Failed to update summary lorebook entries:', error);
        }
    }

    // 步骤 9.5: 更新重要人物条目
    async function updateImportantPersonsRelatedEntries_ACU(importantPersonsTable, isImport = false) {
        if (!TavernHelper_API_ACU) return;
        const primaryLorebookName = await getInjectionTargetLorebook_ACU();
        if (!primaryLorebookName) {
            logWarn_ACU('Cannot update important persons entries: No injection target lorebook set.');
            return;
        }

        const IMPORT_PREFIX = '外部导入-';
        const PERSON_ENTRY_PREFIX = isImport ? `${IMPORT_PREFIX}重要人物条目` : '重要人物条目';
        const PERSON_INDEX_COMMENT = isImport ? `${IMPORT_PREFIX}TavernDB-ACU-ImportantPersonsIndex` : 'TavernDB-ACU-ImportantPersonsIndex';

        try {
            const allEntries = await TavernHelper_API_ACU.getLorebookEntries(primaryLorebookName);
            
            // 1. 全量删除
            const uidsToDelete = allEntries
                .filter(e => e.comment && (e.comment.startsWith(PERSON_ENTRY_PREFIX) || e.comment === PERSON_INDEX_COMMENT))
                .map(e => e.uid);

            if (uidsToDelete.length > 0) {
                await TavernHelper_API_ACU.deleteLorebookEntries(primaryLorebookName, uidsToDelete);
                logDebug_ACU(`Deleted ${uidsToDelete.length} old person-related lorebook entries.`);
            }

            // 2. 全量重建
            const personRows = (importantPersonsTable?.content?.length > 1) ? importantPersonsTable.content.slice(1) : [];
            if (personRows.length === 0) {
                logDebug_ACU('No important persons to create entries for.');
                return; // 如果没有人物，删除后直接返回
            }

            const headers = importantPersonsTable.content[0].slice(1);
            const nameColumnIndex = headers.indexOf('姓名') !== -1 ? headers.indexOf('姓名') : headers.indexOf('角色名');
            if (nameColumnIndex === -1) {
                logError_ACU('Cannot find "姓名" or "角色名" column in 重要角色表. Cannot process person entries.');
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
                    order: 9999, 
                    prevent_recursion: true
                };
                personEntriesToCreate.push(newEntryData);
            });

            // 2.2 准备要创建的索引条目
            let indexContent = "以下是已经在之前的剧情中登场过的角色：\n\n";
            indexContent += `| ${headers[nameColumnIndex]} |\n|---|\n` + personNames.map(name => `| ${name} |`).join('\n');
            indexContent = `<existing_characters>\n\n${indexContent}\n\n</existing_characters>`;

            const indexEntryData = {
                comment: PERSON_INDEX_COMMENT,
                content: indexContent,
                keys: [PERSON_INDEX_COMMENT + "-Key"],
                enabled: true, 
                type: 'constant', 
                order: 99998, 
                prevent_recursion: true
            };
            
            // 3. 执行创建
            const allCreates = [...personEntriesToCreate, indexEntryData];
            if (allCreates.length > 0) {
                await TavernHelper_API_ACU.createLorebookEntries(primaryLorebookName, allCreates);
                logDebug_ACU(`Successfully created ${allCreates.length} new person-related entries.`);
            }

        } catch(error) {
            logError_ACU('Failed to update important persons related lorebook entries:', error);
        }
    }

    // 步骤 9.2: 更新可读世界书条目（主函数）
    async function updateReadableLorebookEntry_ACU(createIfNeeded = false, isImport = false) {
        if (!currentJsonTableData_ACU) {
            logWarn_ACU('Update readable lorebook aborted: currentJsonTableData_ACU is null.');
            return;
        }
        
        const { readableText, importantPersonsTable, summaryTable, outlineTable } = formatJsonToReadable_ACU(currentJsonTableData_ACU);
        
        // 调用所有单独的条目更新函数
        await updateImportantPersonsRelatedEntries_ACU(importantPersonsTable, isImport);
        await updateSummaryTableEntries_ACU(summaryTable, isImport);
        await updateOutlineTableEntry_ACU(outlineTable, isImport);

        const primaryLorebookName = await getInjectionTargetLorebook_ACU();
        if (primaryLorebookName) {
            try {
                const IMPORT_PREFIX = '外部导入-';
                const READABLE_LOREBOOK_COMMENT = isImport ? `${IMPORT_PREFIX}TavernDB-ACU-ReadableDataTable` : 'TavernDB-ACU-ReadableDataTable';
                const entries = await TavernHelper_API_ACU.getLorebookEntries(primaryLorebookName);
                const db2Entry = entries.find(e => e.comment === READABLE_LOREBOOK_COMMENT);

                if (db2Entry) {
                    const newContent = `<main_story_info>\n\n${readableText}\n\n</main_story_info>`;
                    if (db2Entry.content !== newContent) {
                        const updatedDb2Entry = { uid: db2Entry.uid, content: newContent };
                        await TavernHelper_API_ACU.setLorebookEntries(primaryLorebookName, [updatedDb2Entry]);
                        logDebug_ACU('Successfully updated the global readable lorebook entry.');
                    } else {
                        logDebug_ACU('Global readable lorebook entry is already up-to-date.');
                    }
                } else if (createIfNeeded) {
                    const newDb2Entry = {
                        comment: READABLE_LOREBOOK_COMMENT,
                        content: `<main_story_info>\n\n${readableText}\n\n</main_story_info>`,
                        keys: ['TavernDB-ACU-ReadableDataTable-Key'],
                        enabled: true,
                        type: 'constant',
                        order: 99999,
                        prevent_recursion: true,
                    };
                    await TavernHelper_API_ACU.createLorebookEntries(primaryLorebookName, [newDb2Entry]);
                    logDebug_ACU('Global readable lorebook entry not found. Created a new one.');
                    showToastr_ACU('success', `已创建全局可读数据库条目。`);
                }
            } catch(error) {
                logError_ACU('Failed to get or update readable lorebook entry:', error);
            }
        }
    }

    // ==================== 自动更新相关函数 ====================
    
    // 步骤 10.3: 处理新消息（防抖）
    async function handleNewMessageDebounced_ACU(eventType = 'unknown_acu') {
        logDebug_ACU(
            `New message event (${eventType}) detected for ACU, debouncing for ${NEW_MESSAGE_DEBOUNCE_DELAY_ACU}ms...`,
        );
        clearTimeout(newMessageDebounceTimer_ACU);
        newMessageDebounceTimer_ACU = setTimeout(async () => {
            // 检查更新是否被用户手动终止，如果是，则跳过本次因终止操作而触发的更新检查
            if (wasStoppedByUser_ACU) {
                wasStoppedByUser_ACU = false; // 重置标志，以允许下一次正常的消息触发更新
                logDebug_ACU('ACU: Skipping update check after user abort.');
                return;
            }
            logDebug_ACU('Debounced new message processing triggered for ACU.');
            if (isAutoUpdatingCard_ACU) {
                logDebug_ACU('ACU: Auto-update already in progress. Skipping.');
                return;
            }
            if (!coreApisAreReady_ACU) {
                logDebug_ACU('ACU: Core APIs not ready. Skipping.');
                return;
            }
            await loadAllChatMessages_ACU();
            await triggerAutomaticUpdateIfNeeded_ACU();
        }, NEW_MESSAGE_DEBOUNCE_DELAY_ACU);
    }

    // 步骤 10.2: 触发自动更新
    async function triggerAutomaticUpdateIfNeeded_ACU() {
        logDebug_ACU('ACU Auto-Trigger: Starting check...');
        console.log('ACU Auto-Trigger: 开始检查自动更新条件...');

        if (!settings_ACU.autoUpdateEnabled) {
            logDebug_ACU('ACU Auto-Trigger: Auto update is disabled via settings. Skipping.');
            console.log('ACU Auto-Trigger: 自动更新已禁用');
            return;
        }

        const apiIsConfigured = (settings_ACU.apiMode === 'custom' && (settings_ACU.apiConfig.useMainApi || (settings_ACU.apiConfig.url && settings_ACU.apiConfig.model))) || (settings_ACU.apiMode === 'tavern' && settings_ACU.tavernProfile);

        if (!coreApisAreReady_ACU || isAutoUpdatingCard_ACU || !apiIsConfigured || !currentJsonTableData_ACU) {
            logDebug_ACU('ACU Auto-Trigger: Pre-flight checks failed.', {
                coreApis: coreApisAreReady_ACU,
                isUpdating: isAutoUpdatingCard_ACU,
                apiConfigured: apiIsConfigured,
                dbLoaded: !!currentJsonTableData_ACU,
            });
            console.log('ACU Auto-Trigger: 预检查失败', {
                coreApis: coreApisAreReady_ACU,
                isUpdating: isAutoUpdatingCard_ACU,
                apiConfigured: apiIsConfigured,
                dbLoaded: !!currentJsonTableData_ACU,
            });
            return;
        }
        // 修复：单条问候语不应触发更新。至少需要一次用户输入和一次AI回复才有意义。
        if (allChatMessages_ACU.length < 2) {
            logDebug_ACU('ACU Auto-Trigger: Chat history is too short for a meaningful update cycle (< 2 messages). Skipping.');
            return;
        }

        // 关键修复：直接检查 SillyTavern.chat，因为 TavernHelper.getChatMessages 可能会剥离自定义属性
        const liveChat = SillyTavern_API_ACU.chat;
        if (!liveChat || liveChat.length === 0) {
            logDebug_ACU('ACU Auto-Trigger: Live chat array is empty. Skipping.');
            return;
        }
        const lastLiveMessage = liveChat[liveChat.length - 1];

        // 需求 1: 仅在AI有新回复时触发
        if (lastLiveMessage.is_user) {
            logDebug_ACU('ACU Auto-Trigger: Last message is from user. Skipping update.');
            return;
        }

        // 需求 1.1: 如果最新的AI消息已经包含数据，则跳过
        if (lastLiveMessage.TavernDB_ACU_Data) {
            logDebug_ACU('ACU Auto-Trigger: Last AI message in live chat already contains database data. Skipping update.');
            return;
        }

        // 计算尚未记录层数（包括所有消息，不限于AI回复，但排除楼层0）
        let unrecordedMessages = 0;
        let foundLastUpdate = false;
        for (let i = liveChat.length - 1; i > 0; i--) {
            const message = liveChat[i];
            if (message.TavernDB_ACU_Data) {
                // 找到了上一个更新点，停止计数。
                foundLastUpdate = true;
                break;
            } else {
                // 这是一个未更新的消息，计入。
                unrecordedMessages++;
            }
        }
        // 如果从未找到更新点 (例如新聊天)，则计数等于总消息数（排除楼层0）。
        if (!foundLastUpdate) {
            unrecordedMessages = liveChat.filter((_, index) => index > 0).length;
        }

        const skipLatestN = settings_ACU.autoUpdateFrequency || DEFAULT_AUTO_UPDATE_FREQUENCY_ACU; // 最新N层不更新
        const updateBatchSize = settings_ACU.updateBatchSize || 1; // 每次更新楼层数
        const requiredUnrecorded = skipLatestN + updateBatchSize; // 需要的未记录层数
        
        console.log('ACU Auto-Trigger: 参数检查', {
            skipLatestN,
            updateBatchSize,
            requiredUnrecorded,
            unrecordedMessages
        });

        if (unrecordedMessages < requiredUnrecorded) {
            logDebug_ACU(`ACU Auto-Trigger:尚未记录层数 (${unrecordedMessages}) 未达到触发条件 (${requiredUnrecorded} = 最新${skipLatestN}层不更新 + 每次更新${updateBatchSize}层)。跳过。`);
            return;
        }
        
        // 当未记录层数达到或超过所需层数时触发更新
        logDebug_ACU(`ACU Auto-Trigger:尚未记录层数 (${unrecordedMessages}) 达到触发条件 (${requiredUnrecorded} = 最新${skipLatestN}层不更新 + 每次更新${updateBatchSize}层)。开始更新。`);
        showToastr_ACU('info', `触发自动更新：未记录层数 ${unrecordedMessages} >= 触发条件 ${requiredUnrecorded}`);
        
        // 新的处理逻辑：只处理需要更新的楼层
        // 跳过最新N层，只处理接下来的updateBatchSize层
        // 排除楼层0，只处理实际楼层
        const actualMessages = liveChat.filter((_, index) => index > 0);
        const totalActualMessages = actualMessages.length;
        const startIndex = Math.max(0, totalActualMessages - skipLatestN - updateBatchSize);
        const endIndex = startIndex + updateBatchSize;
        
        const indicesToActuallyUpdate = [];
        for (let i = startIndex; i < endIndex; i++) {
            if (i < totalActualMessages) {
                // 转换为原始索引（加上1，因为排除了楼层0）
                indicesToActuallyUpdate.push(i + 1);
            }
        }

        if (indicesToActuallyUpdate.length === 0) {
            logDebug_ACU('ACU Auto-Trigger: No messages to update in the specified range. Skipping.');
            return;
        }
        
        logDebug_ACU(`ACU Auto-Trigger: 将处理楼层 ${startIndex + 1} 到 ${endIndex}，共 ${indicesToActuallyUpdate.length} 层`);
        console.log('ACU Auto-Trigger: 楼层计算详情', {
            totalActualMessages,
            skipLatestN,
            updateBatchSize,
            startIndex: startIndex + 1, // 转换为1-based楼层号
            endIndex: endIndex, // 转换为1-based楼层号
            actualIndices: indicesToActuallyUpdate // 已经是1-based楼层号
        });

        // 检查Token阈值
        const messagesForTokenCheck = indicesToActuallyUpdate.map(index => liveChat[index]);
        const contextText = messagesForTokenCheck.map(msg => msg.mes || msg.message || '').join('\n');
        const contextTokenCount = contextText.length;
        const tokenThreshold = settings_ACU.autoUpdateTokenThreshold || DEFAULT_AUTO_UPDATE_TOKEN_THRESHOLD_ACU;

        if (contextTokenCount < tokenThreshold) {
            logDebug_ACU(`ACU Auto-Trigger: Context token count (${contextTokenCount}) is below the threshold (${tokenThreshold}). Skipping.`);
            showToastr_ACU('info', `上下文过短 (约 ${contextTokenCount} tokens)，跳过自动更新。`);
            return;
        }

        if (indicesToActuallyUpdate.length > 1) {
            showToastr_ACU('info', `检测到 ${indicesToActuallyUpdate.length} 条未更新记录，将开始批量处理。`);
        } else {
            showToastr_ACU('info', `检测到新消息，将触发数据库增量更新。`);
        }

        console.log('ACU Auto-Trigger: 开始执行更新，处理楼层:', indicesToActuallyUpdate);
        isAutoUpdatingCard_ACU = true;
        const success = await processUpdates_ACU(indicesToActuallyUpdate, 'auto');
        isAutoUpdatingCard_ACU = false;
        console.log('ACU Auto-Trigger: 更新完成，结果:', success);

        if (success) {
            logDebug_ACU(`ACU: Automatic update process completed successfully.`);
            await loadAllChatMessages_ACU();
            
            // 隐藏更新使用的楼层
            try {
                const firstFloor = indicesToActuallyUpdate[0];
                const lastFloor = indicesToActuallyUpdate[indicesToActuallyUpdate.length - 1];
                const floorRange = `${firstFloor}-${lastFloor}`;
                await hideMessagesByFloorRange_ACU(firstFloor, lastFloor);
                logDebug_ACU(`ACU: 已隐藏楼层 ${floorRange}`);
            } catch (error) {
                logDebug_ACU(`ACU: 隐藏楼层失败: ${error.message}`);
            }
        } else {
            logError_ACU(`ACU: Automatic update process failed or was aborted.`);
        }
    }

    // 步骤 10.1: 重置脚本状态（新聊天）
    async function resetScriptStateForNewChat_ACU(chatFileName) {
        // 重新加载所有设置以确保模板不会过时
        loadSettings_ACU();

        // 修复：当增量更新失败时，chatFileName 可能会暂时变为 null。
        // 之前的逻辑会清除数据库状态，导致"初始化失败"的错误。
        // 新逻辑：如果收到的 chatFileName 无效，则记录一个警告并忽略此事件，
        // 以保留当前的数据库状态，等待一个有效的 CHAT_CHANGED 事件。
        if (!chatFileName || typeof chatFileName !== 'string' || chatFileName.trim() === '' || chatFileName.trim() === 'null') {
            logWarn_ACU(`ACU: Received invalid chat file name: "${chatFileName}". This can happen after an update error. Ignoring event to preserve current state.`);
            // 保持当前状态不变，防止数据库被意外清除
            return;
        }

        logDebug_ACU(`ACU: Resetting script state for new chat: "${chatFileName}"`);
        
        // 直接使用有效的 chatFileName
        currentChatFileIdentifier_ACU = cleanChatName_ACU(chatFileName);
        allChatMessages_ACU = [];

        logDebug_ACU(`ACU: currentChatFileIdentifier FINAL set to: "${currentChatFileIdentifier_ACU}" (Source: CHAT_CHANGED event)`);

        await loadAllChatMessages_ACU();
        
        if ($popupInstance_ACU) {
            const $titleElement = $popupInstance_ACU.find('h2#updater-main-title-acu');
            if ($titleElement.length)
                $titleElement.html(`数据库自动更新 (当前聊天: ${escapeHtml_ACU(currentChatFileIdentifier_ACU || '未知')})`);
            if ($statusMessageSpan_ACU) $statusMessageSpan_ACU.text('准备就绪');
        }
        
        // TODO: 将在UI阶段实现
        // if (typeof updateCardUpdateStatusDisplay_ACU === 'function') updateCardUpdateStatusDisplay_ACU();
        
        await loadOrCreateJsonTableFromChatHistory_ACU();
    }

    // 根据楼层范围隐藏消息的辅助函数
    async function hideMessagesByFloorRange_ACU(startFloor, endFloor) {
        try {
            // 构建楼层范围字符串
            let rangeText;
            let hideCommand;
            
            if (endFloor === null) {
                // 只指定起始楼层，隐藏从该楼层到最新的所有楼层
                rangeText = `楼层 ${startFloor} 及以后`;
                hideCommand = `/hide ${startFloor}-`;
            } else {
                // 指定了楼层范围
                rangeText = `楼层 ${startFloor}-${endFloor}`;
                hideCommand = `/hide ${startFloor}-${endFloor}`;
            }

            console.log(`准备隐藏楼层范围: ${hideCommand}`);

            // 调用/hide命令
            await triggerSlash_ACU(hideCommand);

            return { 
                success: true, 
                rangeText: rangeText,
                hideCommand: hideCommand
            };
        } catch (error) {
            console.error('隐藏楼层时发生错误:', error);
            return { 
                success: false, 
                rangeText: endFloor ? `楼层 ${startFloor}-${endFloor}` : `楼层 ${startFloor} 及以后`,
                errorMessage: error.message || '未知错误'
            };
        }
    }

    // 触发斜杠命令的辅助函数
    async function triggerSlash_ACU(command) {
        return new Promise((resolve, reject) => {
            try {
                // 检查是否存在SillyTavern的API
                if (typeof SillyTavern_API_ACU !== 'undefined' && SillyTavern_API_ACU.triggerSlash) {
                    SillyTavern_API_ACU.triggerSlash(command);
                    resolve();
                } else {
                    // 如果SillyTavern API不可用，尝试直接调用
                    if (typeof window !== 'undefined' && window.triggerSlash) {
                        window.triggerSlash(command);
                        resolve();
                    } else {
                        reject(new Error('无法找到triggerSlash函数'));
                    }
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    // ==================== UI 辅助函数 ====================
    
    // 渲染提示词段落
    function renderPromptSegments_ACU(segments) {
        if (!$charCardPromptSegmentsContainer_ACU) return;
        $charCardPromptSegmentsContainer_ACU.empty();
        
        // 确保 segments 是一个数组
        if (!Array.isArray(segments)) {
            let parsedSegments;
            try {
                if (typeof segments === 'string' && segments.trim()) {
                    parsedSegments = JSON.parse(segments);
                }
            } catch (e) {
                logWarn_ACU('Could not parse charCardPrompt as JSON. Treating as a single text block.', segments);
            }
            
            if (!Array.isArray(parsedSegments) || parsedSegments.length === 0) {
                const content = (typeof segments === 'string' && segments.trim()) ? segments : DEFAULT_CHAR_CARD_PROMPT_ACU;
                parsedSegments = [{ role: 'assistant', content: content, deletable: false }];
            }
            segments = parsedSegments;
        }
        
        if (segments.length === 0) {
            segments.push({ role: 'assistant', content: DEFAULT_CHAR_CARD_PROMPT_ACU, deletable: false });
        }

        segments.forEach((segment, index) => {
            const isDeletable = segment.deletable !== false;
            const segmentId = `${SCRIPT_ID_PREFIX_ACU}-prompt-segment-${index}`;
            const segmentHtml = `
                <div class="prompt-segment" id="${segmentId}">
                    <div class="prompt-segment-toolbar">
                        <select class="prompt-segment-role">
                            <option value="assistant" ${segment.role === 'AI' || segment.role === 'assistant' ? 'selected' : ''}>AI</option>
                            <option value="SYSTEM" ${segment.role === 'SYSTEM' ? 'selected' : ''}>系统</option>
                            <option value="USER" ${segment.role === 'USER' ? 'selected' : ''}>用户</option>
                        </select>
                        ${isDeletable ? `<button class="prompt-segment-delete-btn" data-index="${index}">-</button>` : ''}
                    </div>
                    <textarea class="prompt-segment-content" rows="4">${escapeHtml_ACU(segment.content)}</textarea>
                </div>
            `;
            $charCardPromptSegmentsContainer_ACU.append(segmentHtml);
        });
    }

    // 从 UI 获取提示词
    function getCharCardPromptFromUI_ACU() {
        if (!$charCardPromptSegmentsContainer_ACU) return [];
        const segments = [];
        $charCardPromptSegmentsContainer_ACU.find('.prompt-segment').each(function() {
            const $segment = $(this);
            const role = $segment.find('.prompt-segment-role').val();
            const content = $segment.find('.prompt-segment-content').val();
            const isDeletable = $segment.find('.prompt-segment-delete-btn').length > 0;
            segments.push({ role: role, content: content, deletable: isDeletable });
        });
        return segments;
    }

    // 更新 API 状态显示
    function updateApiStatusDisplay_ACU() {
        if (!$popupInstance_ACU || !$apiStatusDisplay_ACU) return;
        if (settings_ACU.apiConfig.url && settings_ACU.apiConfig.model) {
            $apiStatusDisplay_ACU.html(
                `当前URL: <span style="color:lightgreen;word-break:break-all;">${escapeHtml_ACU(
                    settings_ACU.apiConfig.url,
                )}</span><br>已选模型: <span style="color:lightgreen;">${escapeHtml_ACU(settings_ACU.apiConfig.model)}</span>`,
            );
        } else if (settings_ACU.apiConfig.url) {
            $apiStatusDisplay_ACU.html(
                `当前URL: ${escapeHtml_ACU(settings_ACU.apiConfig.url)} - <span style="color:orange;">请加载并选择模型</span>`,
            );
        } else {
            $apiStatusDisplay_ACU.html(`<span style="color:#ffcc80;">未配置自定义API。数据库更新功能可能不可用。</span>`);
        }
    }

    // 更新 API 模式视图
    function updateApiModeView_ACU(apiMode) {
        if (!$popupInstance_ACU) return;
        const $customApiBlock = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-custom-api-settings-block`);
        const $tavernApiBlock = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-tavern-api-profile-block`);

        if (apiMode === 'tavern') {
            $customApiBlock.hide();
            $tavernApiBlock.show();
            loadTavernApiProfiles_ACU();
        } else {
            $customApiBlock.show();
            $tavernApiBlock.hide();
        }
    }

    // 更新自定义 API 输入状态
    function updateCustomApiInputsState_ACU() {
        if (!$popupInstance_ACU) return;
        const useMainApi = settings_ACU.apiConfig.useMainApi;
        const $customApiFields = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-custom-api-fields`);
        if (useMainApi) {
            $customApiFields.css('opacity', '0.5');
            $customApiFields.find('input, select, button').prop('disabled', true);
        } else {
            $customApiFields.css('opacity', '1.0');
            $customApiFields.find('input, select, button').prop('disabled', false);
        }
    }

    // 加载 Tavern API 预设
    async function loadTavernApiProfiles_ACU() {
        if (!$popupInstance_ACU) return;
        const $select = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-tavern-api-profile-select`);
        const currentProfileId = settings_ACU.tavernProfile;
        
        $select.empty().append('<option value="">-- 请选择一个酒馆预设 --</option>');

        try {
            const tavernProfiles = SillyTavern_API_ACU.extensionSettings?.connectionManager?.profiles || [];
            if (!tavernProfiles || tavernProfiles.length === 0) {
                $select.append($('<option>', { value: '', text: '未找到酒馆预设', disabled: true }));
                return;
            }

            let foundCurrentProfile = false;
            tavernProfiles.forEach(profile => {
                if (profile.api && profile.preset) {
                    const option = $('<option>', {
                        value: profile.id,
                        text: profile.name || profile.id,
                        selected: profile.id === currentProfileId
                    });
                    $select.append(option);
                    if (profile.id === currentProfileId) {
                        foundCurrentProfile = true;
                    }
                }
            });

            if (currentProfileId && foundCurrentProfile) {
                $select.val(currentProfileId);
            }
        } catch (error) {
            logError_ACU('加载酒馆API预设失败:', error);
            showToastr_ACU('error', '无法加载酒馆API预设列表。');
        }
    }

    // 保存 API 配置
    function saveApiConfig_ACU() {
        if (!$popupInstance_ACU || !$customApiUrlInput_ACU || !$customApiKeyInput_ACU || !$customApiModelSelect_ACU) {
            logError_ACU('保存API配置失败：UI元素未初始化。');
            return;
        }
        const url = $customApiUrlInput_ACU.val().trim();
        const apiKey = $customApiKeyInput_ACU.val();
        const model = $customApiModelSelect_ACU.val();
        const max_tokens = parseInt($maxTokensInput_ACU.val(), 10);
        const temperature = parseFloat($temperatureInput_ACU.val());

        if (!url) {
            showToastr_ACU('warning', 'API URL 不能为空。');
            return;
        }
        if (!model && $customApiModelSelect_ACU.children('option').length > 1 && $customApiModelSelect_ACU.children('option:selected').val() === '') {
            showToastr_ACU('warning', '请选择一个模型，或先加载模型列表。');
        }

        Object.assign(settings_ACU.apiConfig, {
            url,
            apiKey,
            model,
            max_tokens: isNaN(max_tokens) ? 120000 : max_tokens,
            temperature: isNaN(temperature) ? 0.9 : temperature,
        });
        saveSettings_ACU();
        showToastr_ACU('success', 'API配置已保存！');
        loadSettings_ACU();
    }

    // 清除 API 配置
    function clearApiConfig_ACU() {
        Object.assign(settings_ACU.apiConfig, { url: '', apiKey: '', model: '', max_tokens: 120000, temperature: 0.9 });
        saveSettings_ACU();
        showToastr_ACU('info', 'API配置已清除！');
        loadSettings_ACU();
    }

    // 加载模型列表并连接
    async function fetchModelsAndConnect_ACU() {
        if (
            !$popupInstance_ACU ||
            !$customApiUrlInput_ACU ||
            !$customApiKeyInput_ACU ||
            !$customApiModelSelect_ACU ||
            !$apiStatusDisplay_ACU
        ) {
            logError_ACU('加载模型列表失败：UI元素未初始化。');
            showToastr_ACU('error', 'UI未就绪。');
            return;
        }
        const apiUrl = $customApiUrlInput_ACU.val().trim();
        const apiKey = $customApiKeyInput_ACU.val();
        if (!apiUrl) {
            showToastr_ACU('warning', '请输入API基础URL。');
            $apiStatusDisplay_ACU.text('状态:请输入API基础URL').css('color', 'orange');
            return;
        }
        const statusUrl = `/api/backends/chat-completions/status`;
        $apiStatusDisplay_ACU.text('状态: 正在检查API端点状态...').css('color', '#61afef');
        showToastr_ACU('info', '正在检查自定义API端点状态...');

        try {
            const body = {
                "reverse_proxy": apiUrl,
                "proxy_password": "",
                "chat_completion_source": "custom",
                "custom_url": apiUrl,
                "custom_include_headers": apiKey ? `Authorization: Bearer ${apiKey}` : ""
            };

            const response = await fetch(statusUrl, {
                method: 'POST',
                headers: { ...SillyTavern_API_ACU.getRequestHeaders(), 'Content-Type': 'application/json' },
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
            logDebug_ACU('获取到的模型数据:', data);
            $customApiModelSelect_ACU.empty();
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
                        $customApiModelSelect_ACU.append(jQuery_API_ACU('<option>', { value: modelName, text: modelName }));
                    }
                });
            }

            if (modelsFound) {
                if (
                    settings_ACU.apiConfig.model &&
                    $customApiModelSelect_ACU.find(`option[value="${settings_ACU.apiConfig.model}"]`).length > 0
                ) {
                    $customApiModelSelect_ACU.val(settings_ACU.apiConfig.model);
                } else {
                    $customApiModelSelect_ACU.prepend('<option value="" selected disabled>请选择一个模型</option>');
                }
                showToastr_ACU('success', '模型列表加载成功！');
            } else {
                $customApiModelSelect_ACU.append('<option value="">未能解析模型数据或列表为空</option>');
                showToastr_ACU('warning', '未能解析模型数据或列表为空。');
                $apiStatusDisplay_ACU.text('状态: 未能解析模型数据或列表为空。').css('color', 'orange');
            }
        } catch (error) {
            logError_ACU('加载模型列表时出错:', error);
            showToastr_ACU('error', `加载模型列表失败: ${error.message}`);
            $customApiModelSelect_ACU.empty().append('<option value="">加载模型失败</option>');
            $apiStatusDisplay_ACU.text(`状态: 加载模型失败 - ${error.message}`).css('color', '#ff6b6b');
        }
        updateApiStatusDisplay_ACU();
    }

    // 保存自定义提示词
    function saveCustomCharCardPrompt_ACU() {
        if (!$popupInstance_ACU || !$charCardPromptSegmentsContainer_ACU) {
            logError_ACU('保存更新预设失败：UI元素未初始化。');
            return;
        }
        const newPromptSegments = getCharCardPromptFromUI_ACU();
        if (!newPromptSegments || newPromptSegments.length === 0 || (newPromptSegments.length === 1 && !newPromptSegments[0].content.trim())) {
            showToastr_ACU('warning', '更新预设不能为空。');
            return;
        }
        settings_ACU.charCardPrompt = newPromptSegments;
        saveSettings_ACU();
        showToastr_ACU('success', '更新预设已保存！');
        loadSettings_ACU();
    }

    // 恢复默认提示词
    function resetDefaultCharCardPrompt_ACU() {
        settings_ACU.charCardPrompt = DEFAULT_CHAR_CARD_PROMPT_ACU;
        saveSettings_ACU();
        showToastr_ACU('info', '更新预设已恢复为默认值！');
        loadSettings_ACU();
    }

    // 从 JSON 加载提示词
    function loadCharCardPromptFromJson_ACU() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = readerEvent => {
                const content = readerEvent.target.result;
                let jsonData;

                try {
                    jsonData = JSON.parse(content);
                } catch (error) {
                    logError_ACU('导入提示词模板失败：JSON解析错误。', error);
                    showToastr_ACU('error', '文件不是有效的JSON格式。', { timeOut: 5000 });
                    return;
                }
                
                try {
                    if (!Array.isArray(jsonData) || jsonData.some(item => typeof item.role === 'undefined' || typeof item.content === 'undefined')) {
                        throw new Error('JSON格式不正确。它必须是一个包含 "role" 和 "content" 键的对象的数组。');
                    }
                    
                    const segments = jsonData.map(item => {
                        let normalizedRole = 'USER';
                        if (item.role) {
                            const roleLower = item.role.toLowerCase();
                            if (roleLower === 'system') {
                                normalizedRole = 'SYSTEM';
                            } else if (roleLower === 'assistant' || roleLower === 'ai') {
                                normalizedRole = 'assistant';
                            }
                        }
                        return {
                            ...item,
                            role: normalizedRole,
                            deletable: item.deletable !== false,
                        };
                    });

                    renderPromptSegments_ACU(segments);
                    showToastr_ACU('success', '提示词模板已成功加载！');
                    logDebug_ACU('New prompt template loaded from JSON file.');

                } catch (error) {
                    logError_ACU('导入提示词模板失败：结构验证失败。', error);
                    showToastr_ACU('error', `导入失败: ${error.message}`, { timeOut: 10000 });
                }
            };
            reader.readAsText(file, 'UTF-8');
        };
        input.click();
    }

    // 保存自动更新 Token 阈值
    function saveAutoUpdateTokenThreshold_ACU() {
        if (!$popupInstance_ACU || !$autoUpdateTokenThresholdInput_ACU) {
            logError_ACU('保存Token阈值失败：UI元素未初始化。');
            return;
        }
        const valStr = $autoUpdateTokenThresholdInput_ACU.val();
        const newT = parseInt(valStr, 10);

        if (!isNaN(newT) && newT >= 0) {
            settings_ACU.autoUpdateTokenThreshold = newT;
            saveSettings_ACU();
            showToastr_ACU('success', '自动更新Token阈值已保存！');
            loadSettings_ACU();
        } else {
            showToastr_ACU('warning', `Token阈值 "${valStr}" 无效。请输入一个大于等于0的整数。恢复为: ${settings_ACU.autoUpdateTokenThreshold}`);
            $autoUpdateTokenThresholdInput_ACU.val(settings_ACU.autoUpdateTokenThreshold);
        }
    }

    // 保存自动更新频率
    function saveAutoUpdateFrequency_ACU() {
        if (!$popupInstance_ACU || !$autoUpdateFrequencyInput_ACU) {
            logError_ACU('保存更新频率失败：UI元素未初始化。');
            return;
        }
        const valStr = $autoUpdateFrequencyInput_ACU.val();
        const newF = parseInt(valStr, 10);

        if (!isNaN(newF) && newF >= 1) {
            settings_ACU.autoUpdateFrequency = newF;
            saveSettings_ACU();
            showToastr_ACU('success', '自动更新频率已保存！');
            loadSettings_ACU();
        } else {
            showToastr_ACU('warning', `更新频率 "${valStr}" 无效。请输入一个大于0的整数。恢复为: ${settings_ACU.autoUpdateFrequency}`);
            $autoUpdateFrequencyInput_ACU.val(settings_ACU.autoUpdateFrequency);
        }
    }

    // 保存批处理大小
    function saveUpdateBatchSize_ACU() {
        if (!$popupInstance_ACU || !$updateBatchSizeInput_ACU) {
            logError_ACU('保存批处理大小失败：UI元素未初始化。');
            return;
        }
        const valStr = $updateBatchSizeInput_ACU.val();
        const newBatchSize = parseInt(valStr, 10);

        if (!isNaN(newBatchSize) && newBatchSize >= 1) {
            settings_ACU.updateBatchSize = newBatchSize;
            saveSettings_ACU();
            showToastr_ACU('success', '批处理大小已保存！');
            loadSettings_ACU();
        } else {
            showToastr_ACU('warning', `批处理大小 "${valStr}" 无效。请输入一个大于0的整数。恢复为: ${settings_ACU.updateBatchSize}`);
            $updateBatchSizeInput_ACU.val(settings_ACU.updateBatchSize);
        }
    }

    // 保存自定义删除标签
    function saveRemoveTags_ACU() {
        if (!$popupInstance_ACU) return;
        const $input = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-remove-tags-input`);
        if (!$input.length) {
            logError_ACU('保存删除标签失败：UI元素未初始化。');
            return;
        }
        const tags = $input.val().trim();
        settings_ACU.removeTags = tags;
        saveSettings_ACU();
        showToastr_ACU('success', '自定义删除标签已保存！');
        loadSettings_ACU();
    }

    // ==================== 世界书管理 UI 函数 ====================
    
    // 填充世界书列表
    async function populateWorldbookList_ACU() {
        if (!$popupInstance_ACU) return;
        const $listContainer = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-worldbook-select`);
        $listContainer.empty().html('<em>正在加载...</em>');
        try {
            const books = await getWorldBooks_ACU();
            $listContainer.empty();
            if (books.length === 0) {
                $listContainer.html('<em>未找到世界书</em>');
                return;
            }
            books.forEach(book => {
                const isSelected = settings_ACU.worldbookConfig.manualSelection.includes(book.name);
                const itemHtml = `
                    <div class="qrf_worldbook_list_item ${isSelected ? 'selected' : ''}" data-book-name="${escapeHtml_ACU(book.name)}">
                        ${escapeHtml_ACU(book.name)}
                    </div>`;
                $listContainer.append(itemHtml);
            });
        } catch (error) {
            logError_ACU('Failed to populate worldbook list:', error);
            $listContainer.html('<em>加载失败</em>');
        }
    }
    
    // 填充世界书条目列表
    async function populateWorldbookEntryList_ACU() {
        if (!$popupInstance_ACU) return;
        const $list = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-worldbook-entry-list`);
        $list.empty().html('<em>正在加载条目...</em>');

        const source = settings_ACU.worldbookConfig.source;
        let bookNames = [];

        if (source === 'character') {
            const charLorebooks = await TavernHelper_API_ACU.getCharLorebooks({ type: 'all' });
            if (charLorebooks.primary) bookNames.push(charLorebooks.primary);
            if (charLorebooks.additional?.length) bookNames.push(...charLorebooks.additional);
        } else if (source === 'manual') {
            bookNames = settings_ACU.worldbookConfig.manualSelection;
        }

        if (bookNames.length === 0) {
            $list.html('<em>请先选择世界书或为角色绑定世界书。</em>');
            return;
        }

        try {
            const allBooks = await getWorldBooks_ACU();
            let html = '';
            let settingsChanged = false;
            for (const bookName of bookNames) {
                const bookData = allBooks.find(b => b.name === bookName);
                if (bookData && bookData.entries) {
                    if (typeof settings_ACU.worldbookConfig.enabledEntries[bookName] === 'undefined') {
                        settings_ACU.worldbookConfig.enabledEntries[bookName] = bookData.entries.map(entry => entry.uid);
                        settingsChanged = true;
                    }
                    const enabledEntries = settings_ACU.worldbookConfig.enabledEntries[bookName] || [];
                    html += `<div style="margin-bottom: 5px; font-weight: bold; border-bottom: 1px solid;">${escapeHtml_ACU(bookName)}</div>`;
                    bookData.entries.forEach(entry => {
                        const isChecked = enabledEntries.includes(entry.uid);
                        const isDisabled = !entry.enabled;
                        html += `
                            <div class="qrf_worldbook_entry_item">
                                <input type="checkbox" id="wb-entry-${entry.uid}" data-book="${escapeHtml_ACU(bookName)}" data-uid="${entry.uid}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
                                <label for="wb-entry-${entry.uid}" ${isDisabled ? 'style="opacity:0.6; text-decoration: line-through;"' : ''}>${escapeHtml_ACU(entry.comment || `条目 ${entry.uid}`)}</label>
                            </div>`;
                    });
                }
            }
            
            if (settingsChanged) {
                saveSettings_ACU();
            }

            $list.html(html || '<em>所选世界书中无条目。</em>');
        } catch (error) {
            logError_ACU('Failed to populate worldbook entry list:', error);
            $list.html('<em>加载条目失败。</em>');
        }
    }
    
    // 更新世界书源视图
    async function updateWorldbookSourceView_ACU() {
        if (!$popupInstance_ACU) return;
        const source = settings_ACU.worldbookConfig.source;
        const $manualBlock = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-worldbook-manual-select-block`);
        if (source === 'manual') {
            $manualBlock.slideDown();
            await populateWorldbookList_ACU();
        } else {
            $manualBlock.slideUp();
        }
        await populateWorldbookEntryList_ACU();
    }
    
    // 填充注入目标选择器
    async function populateInjectionTargetSelector_ACU() {
        if (!$popupInstance_ACU) return;
        const $select = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-worldbook-injection-target`);
        $select.empty();
        try {
            const books = await getWorldBooks_ACU();
            $select.append(`<option value="character">角色卡绑定世界书</option>`);
            books.forEach(book => {
                $select.append(`<option value="${escapeHtml_ACU(book.name)}">${escapeHtml_ACU(book.name)}</option>`);
            });
            $select.val(settings_ACU.worldbookConfig.injectionTarget || 'character');
        } catch (error) {
            logError_ACU('Failed to populate injection target selector:', error);
            $select.append('<option value="character">加载列表失败</option>');
        }
    }

    // ==================== 数据展示UI函数 ====================
    
    // 显示编辑模态框（临时实现使用prompt）
    function showEditModal_ACU(title, message, initialValue, callback, isTextarea = false) {
        if (isTextarea) {
            const editedData = prompt(message, initialValue);
            if (editedData !== null) {
                callback(editedData);
            } else {
                callback(null);
            }
        } else {
            const editedData = prompt(message, initialValue);
            if (editedData !== null) {
                callback(editedData);
            } else {
                callback(null);
            }
        }
    }
    
    // 展示所有数据的功能
    function displayAllData_ACU() {
        if (!currentJsonTableData_ACU) {
            showToastr_ACU('warning', '没有可展示的数据，请先更新数据库');
            return;
        }

        try {
            let html = '<div class="data-display-content">';
            
            const tableIndexes = Object.keys(currentJsonTableData_ACU).filter(k => k.startsWith('sheet_'));
            
            if (tableIndexes.length === 0) {
                html += '<p class="no-data">暂无数据表格</p>';
            } else {
                tableIndexes.forEach((sheetKey, index) => {
                    const table = currentJsonTableData_ACU[sheetKey];
                    if (!table || !table.name || !table.content) return;
                    
                    html += `<div class="table-section" data-sheet-key="${sheetKey}">`;
                    html += `<h3 class="table-title">${table.name} <span class="table-actions">`;
                    html += `<button class="edit-table-btn" data-sheet-key="${sheetKey}">编辑</button> `;
                    html += `<button class="delete-table-btn" data-sheet-key="${sheetKey}">删除</button>`;
                    html += `</span></h3>`;
                    
                    if (table.sourceData) {
                        html += `<div class="table-metadata">`;
                        html += `<p><strong>备注:</strong> ${table.sourceData.note || '无'}</p>`;
                        html += `<p><strong>插入触发:</strong> ${table.sourceData.insertNode || table.sourceData.initNode || '无'}</p>`;
                        html += `<p><strong>更新触发:</strong> ${table.sourceData.updateNode || '无'}</p>`;
                        html += `<p><strong>删除触发:</strong> ${table.sourceData.deleteNode || '无'}</p>`;
                        html += `</div>`;
                    }
                    
                    html += `<div class="table-content">`;
                    if (table.content && table.content.length > 0) {
                        const headers = table.content[0] ? table.content[0].slice(1) : [];
                        const rows = table.content.slice(1);
                        
                        html += `<table class="data-table">`;
                        
                        if (headers.length > 0) {
                            html += `<thead><tr>`;
                            headers.forEach(header => {
                                html += `<th>${header}</th>`;
                            });
                            html += `<th>操作</th>`;
                            html += `</tr></thead>`;
                        }
                        
                        if (rows.length > 0) {
                            html += `<tbody>`;
                            rows.forEach((row, rowIndex) => {
                                const rowData = row.slice(1);
                                html += `<tr data-row-index="${rowIndex}">`;
                                rowData.forEach(cell => {
                                    html += `<td>${cell || ''}</td>`;
                                });
                                html += `<td class="row-actions">`;
                                html += `<button class="edit-row-btn" data-sheet-key="${sheetKey}" data-row-index="${rowIndex}">编辑</button> `;
                                html += `<button class="delete-row-btn" data-sheet-key="${sheetKey}" data-row-index="${rowIndex}">删除</button>`;
                                html += `</td>`;
                                html += `</tr>`;
                            });
                            html += `</tbody>`;
                        } else {
                            html += `<tbody><tr><td colspan="${headers.length + 1}" class="no-data">暂无数据</td></tr></tbody>`;
                        }
                        
                        html += `</table>`;
                    } else {
                        html += `<p class="no-data">表格内容为空</p>`;
                    }
                    
                    html += `</div></div>`;
                });
            }
            
            html += '</div>';
            html += `
                <style>
                    .data-display-content { font-family: Arial, sans-serif; color: #e0e0e0; }
                    .table-section { margin-bottom: 20px; border: 1px solid #444; border-radius: 5px; padding: 15px; background: #1a1a1a; }
                    .table-title { margin: 0 0 10px 0; color: #fff; display: flex; justify-content: space-between; align-items: center; }
                    .table-actions button { margin-left: 5px; padding: 5px 10px; font-size: 12px; }
                    .table-metadata { background: #2a2a2a; padding: 10px; margin: 10px 0; border-radius: 3px; font-size: 12px; color: #ccc; }
                    .table-metadata p { margin: 5px 0; }
                    .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    .data-table th, .data-table td { border: 1px solid #444; padding: 8px; text-align: left; color: #e0e0e0; }
                    .data-table th { background-color: #333; font-weight: bold; color: #fff; }
                    .data-table tr:nth-child(even) { background-color: #222; }
                    .data-table tr:hover { background-color: #333; }
                    .row-actions button { margin-right: 5px; padding: 3px 8px; font-size: 11px; }
                    .no-data { text-align: center; color: #888; font-style: italic; }
                    .edit-table-btn, .delete-table-btn, .edit-row-btn, .delete-row-btn { 
                        background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; 
                    }
                    .delete-table-btn, .delete-row-btn { background: #dc3545; }
                    .edit-table-btn:hover, .edit-row-btn:hover { background: #0056b3; }
                    .delete-table-btn:hover, .delete-row-btn:hover { background: #c82333; }
                </style>
            `;
            
            const $container = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-data-tables-container`);
            $container.html(html);
            
            bindDataDisplayEvents_ACU();
            
            showToastr_ACU('success', `已加载 ${tableIndexes.length} 个数据表格`);
            
        } catch (error) {
            console.error('展示数据失败:', error);
            showToastr_ACU('error', `展示数据失败: ${error.message}`);
        }
    }
    
    // 绑定数据展示区域的事件
    function bindDataDisplayEvents_ACU() {
        const $container = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-data-tables-container`);
        
        $container.off('click', '.edit-table-btn').on('click', '.edit-table-btn', function() {
            const sheetKey = $(this).data('sheet-key');
            editTable_ACU(sheetKey);
        });
        
        $container.off('click', '.delete-table-btn').on('click', '.delete-table-btn', function() {
            const sheetKey = $(this).data('sheet-key');
            deleteTable_ACU(sheetKey);
        });
        
        $container.off('click', '.edit-row-btn').on('click', '.edit-row-btn', function() {
            const sheetKey = $(this).data('sheet-key');
            const rowIndex = $(this).data('row-index');
            editRow_ACU(sheetKey, rowIndex);
        });
        
        $container.off('click', '.delete-row-btn').on('click', '.delete-row-btn', function() {
            const sheetKey = $(this).data('sheet-key');
            const rowIndex = $(this).data('row-index');
            deleteRow_ACU(sheetKey, rowIndex);
        });
    }
    
    // 编辑表格
    function editTable_ACU(sheetKey) {
        const table = currentJsonTableData_ACU[sheetKey];
        if (!table) return;
        
        showEditModal_ACU('编辑表格名称', '请输入新的表格名称:', table.name, (newName) => {
            if (newName && newName.trim() !== table.name) {
                table.name = newName.trim();
                saveJsonTableToChatHistory_ACU();
                updateReadableLorebookEntry_ACU(false);
                displayAllData_ACU();
                showToastr_ACU('success', '表格名称已更新');
            }
        });
    }
    
    // 删除表格
    function deleteTable_ACU(sheetKey) {
        const table = currentJsonTableData_ACU[sheetKey];
        if (!table) return;
        
        if (confirm(`确定要删除表格 "${table.name}" 吗？此操作不可撤销。`)) {
            delete currentJsonTableData_ACU[sheetKey];
            saveJsonTableToChatHistory_ACU();
            updateReadableLorebookEntry_ACU(false);
            displayAllData_ACU();
            showToastr_ACU('success', '表格已删除');
        }
    }
    
    // 编辑行
    function editRow_ACU(sheetKey, rowIndex) {
        const table = currentJsonTableData_ACU[sheetKey];
        if (!table || !table.content || !table.content[rowIndex + 1]) return;
        
        const row = table.content[rowIndex + 1];
        const headers = table.content[0] ? table.content[0].slice(1) : [];
        const rowData = row.slice(1);
        
        let newData = '';
        headers.forEach((header, index) => {
            newData += `${header}: ${rowData[index] || ''}\n`;
        });
        
        showEditModal_ACU('编辑行数据', '编辑行数据 (每行格式: 列名: 值):', newData, (editedData) => {
            if (editedData !== null) {
                try {
                    const lines = editedData.split('\n');
                    const newRowData = [];
                    
                    headers.forEach((header, index) => {
                        const line = lines.find(l => l.startsWith(header + ':'));
                        if (line) {
                            newRowData[index] = line.substring(header.length + 1).trim();
                        } else {
                            newRowData[index] = rowData[index] || '';
                        }
                    });
                    
                    table.content[rowIndex + 1] = [null, ...newRowData];
                    saveJsonTableToChatHistory_ACU();
                    updateReadableLorebookEntry_ACU(false);
                    displayAllData_ACU();
                    showToastr_ACU('success', '行数据已更新');
                } catch (error) {
                    showToastr_ACU('error', '编辑失败，请检查数据格式');
                }
            }
        }, true);
    }
    
    // 删除行
    function deleteRow_ACU(sheetKey, rowIndex) {
        const table = currentJsonTableData_ACU[sheetKey];
        if (!table || !table.content || !table.content[rowIndex + 1]) return;
        
        if (confirm('确定要删除这一行吗？此操作不可撤销。')) {
            table.content.splice(rowIndex + 1, 1);
            saveJsonTableToChatHistory_ACU();
            updateReadableLorebookEntry_ACU(false);
            displayAllData_ACU();
            showToastr_ACU('success', '行已删除');
        }
    }
    
    // 导出显示的数据
    function exportDisplayData_ACU() {
        if (!currentJsonTableData_ACU) {
            showToastr_ACU('warning', '没有可导出的数据');
            return;
        }
        
        try {
            const dataStr = JSON.stringify(currentJsonTableData_ACU, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `database_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToastr_ACU('success', '数据已导出');
        } catch (error) {
            console.error('导出数据失败:', error);
            showToastr_ACU('error', `导出数据失败: ${error.message}`);
        }
    }
    
    // 显示数据概览
    function showDataOverview_ACU() {
        if (!SillyTavern_API_ACU.chat || SillyTavern_API_ACU.chat.length === 0) {
            showToastr_ACU('warning', '没有聊天记录可查看');
            return;
        }

        try {
            let html = '<div class="overview-content">';
            html += '<h3 style="color: #fff; margin-bottom: 20px;">聊天记录数据概览</h3>';
            
            const chat = SillyTavern_API_ACU.chat;
            let dataCount = 0;
            
            for (let i = chat.length - 1; i >= 0; i--) {
                const message = chat[i];
                if (!message.is_user && message.TavernDB_ACU_Data) {
                    dataCount++;
                    const messageIndex = i + 1;
                    const timestamp = new Date(message.timestamp || Date.now()).toLocaleString();
                    
                    html += `<div class="message-data-card" data-message-index="${i}" style="
                        background: #1a1a1a; border: 1px solid #444; border-radius: 5px; 
                        padding: 15px; margin-bottom: 15px; color: #e0e0e0;
                    ">`;
                    html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">`;
                    html += `<h4 style="margin: 0; color: #fff;">楼层 ${messageIndex} - 数据库记录</h4>`;
                    html += `<span style="font-size: 12px; color: #888;">${timestamp}</span>`;
                    html += `</div>`;
                    
                    const data = message.TavernDB_ACU_Data;
                    const tableKeys = Object.keys(data).filter(k => k.startsWith('sheet_'));
                    html += `<div style="margin-bottom: 10px;">`;
                    html += `<p style="margin: 5px 0; color: #ccc;">包含 ${tableKeys.length} 个数据表格</p>`;
                    
                    tableKeys.forEach(sheetKey => {
                        const table = data[sheetKey];
                        if (table && table.name && table.content) {
                            const rowCount = table.content.length - 1;
                            html += `<div style="background: #2a2a2a; padding: 8px; margin: 5px 0; border-radius: 3px; font-size: 12px;">`;
                            html += `<strong>${table.name}</strong>: ${rowCount} 条记录`;
                            if (table.sourceData && table.sourceData.note) {
                                html += ` - ${table.sourceData.note}`;
                            }
                            html += `</div>`;
                        }
                    });
                    
                    html += `</div>`;
                    
                    html += `<div style="text-align: right;">`;
                    html += `<button class="toggle-details-btn" data-message-index="${i}" style="
                        background: #007bff; color: white; border: none; padding: 5px 10px; 
                        border-radius: 3px; cursor: pointer; margin-right: 5px; font-size: 12px;
                    ">展开详情</button>`;
                    html += `<button class="delete-message-btn" data-message-index="${i}" style="
                        background: #dc3545; color: white; border: none; padding: 5px 10px; 
                        border-radius: 3px; cursor: pointer; font-size: 12px;
                    ">删除记录</button>`;
                    html += `</div>`;
                    
                    html += `<div class="message-details" data-message-index="${i}" style="
                        display: none; margin-top: 15px; padding-top: 15px; 
                        border-top: 1px solid #444; background: #0f0f0f; 
                        border-radius: 3px; padding: 15px;
                    ">`;
                    html += `<div class="details-content">`;
                    html += `<!-- 详情内容将在这里动态加载 -->`;
                    html += `</div>`;
                    html += `</div>`;
                    html += `</div>`;
                }
            }
            
            if (dataCount === 0) {
                html += '<p style="text-align: center; color: #888; font-style: italic;">暂无数据库记录</p>';
            } else {
                html += `<div style="margin-top: 20px; padding: 10px; background: #2a2a2a; border-radius: 5px; text-align: center;">`;
                html += `<p style="margin: 0; color: #ccc;">共找到 ${dataCount} 条数据库记录</p>`;
                html += `</div>`;
            }
            
            html += '</div>';
            
            html += `
                <style>
                    .overview-content { font-family: Arial, sans-serif; }
                    .message-data-card:hover { border-color: #555; }
                    .view-details-btn:hover { background: #0056b3 !important; }
                    .delete-message-btn:hover { background: #c82333 !important; }
                </style>
            `;
            
            const $container = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-overview-container`);
            $container.html(html);
            
            bindOverviewEvents_ACU();
            
            showToastr_ACU('success', `已加载 ${dataCount} 条数据库记录`);
            
        } catch (error) {
            console.error('显示数据概览失败:', error);
            showToastr_ACU('error', `显示数据概览失败: ${error.message}`);
        }
    }
    
    // 绑定概览事件
    function bindOverviewEvents_ACU() {
        const $overviewArea = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-data-overview-area`);
        
        if ($overviewArea.length === 0) {
            console.error('概览区域未找到');
            return;
        }
        
        console.log('绑定概览事件，概览区域元素数量:', $overviewArea.length);
        
        $overviewArea.off('click.overview');
        
        $overviewArea.on('click.overview', '.toggle-details-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const messageIndex = $(this).data('message-index');
            console.log('点击展开/收起详情，消息索引:', messageIndex);
            toggleMessageDetails_ACU(messageIndex);
        });
        
        $overviewArea.on('click.overview', '.delete-message-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const messageIndex = $(this).data('message-index');
            console.log('点击删除记录，消息索引:', messageIndex);
            deleteMessageData_ACU(messageIndex);
        });
    }
    
    // 展开/收起消息详情
    function toggleMessageDetails_ACU(messageIndex) {
        const message = SillyTavern_API_ACU.chat[messageIndex];
        if (!message || !message.TavernDB_ACU_Data) {
            showToastr_ACU('error', '该消息没有数据库数据');
            return;
        }
        
        const $overviewArea = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-data-overview-area`);
        const $detailsArea = $overviewArea.find(`.message-details[data-message-index="${messageIndex}"]`);
        const $toggleBtn = $overviewArea.find(`.toggle-details-btn[data-message-index="${messageIndex}"]`);
        
        if ($detailsArea.length === 0) {
            console.error('详情区域未找到');
            return;
        }
        
        if ($detailsArea.is(':visible')) {
            $detailsArea.slideUp(300);
            $toggleBtn.text('展开详情');
        } else {
            loadMessageDetails_ACU(messageIndex, $detailsArea);
            $detailsArea.slideDown(300);
            $toggleBtn.text('收起详情');
        }
    }
    
    // 加载消息详情内容
    function loadMessageDetails_ACU(messageIndex, $detailsArea) {
        const message = SillyTavern_API_ACU.chat[messageIndex];
        if (!message || !message.TavernDB_ACU_Data) return;
        
        const data = message.TavernDB_ACU_Data;
        const $content = $detailsArea.find('.details-content');
        
        let html = '<div class="expanded-details-content">';
        
        const tableIndexes = Object.keys(data).filter(k => k.startsWith('sheet_'));
        
        if (tableIndexes.length === 0) {
            html += '<p class="no-data">暂无数据表格</p>';
        } else {
            tableIndexes.forEach((sheetKey, index) => {
                const table = data[sheetKey];
                if (!table || !table.name || !table.content) return;
                
                html += `<div class="table-section" data-sheet-key="${sheetKey}">`;
                html += `<h4 class="table-title">${table.name} <span class="table-actions">`;
                html += `<button class="delete-table-btn" data-sheet-key="${sheetKey}" data-message-index="${messageIndex}">删除表格</button>`;
                html += `</span></h4>`;
                
                if (table.sourceData) {
                    html += `<div class="table-metadata">`;
                    html += `<p><strong>备注:</strong> ${table.sourceData.note || '无'}</p>`;
                    html += `<p><strong>插入触发:</strong> ${table.sourceData.insertNode || table.sourceData.initNode || '无'}</p>`;
                    html += `<p><strong>更新触发:</strong> ${table.sourceData.updateNode || '无'}</p>`;
                    html += `<p><strong>删除触发:</strong> ${table.sourceData.deleteNode || '无'}</p>`;
                    html += `</div>`;
                }
                
                html += `<div class="table-content">`;
                if (table.content && table.content.length > 0) {
                    const headers = table.content[0] ? table.content[0].slice(1) : [];
                    const rows = table.content.slice(1);
                    
                    html += `<div class="table-scroll-container">`;
                    html += `<table class="data-table">`;
                    
                    if (headers.length > 0) {
                        html += `<thead><tr>`;
                        headers.forEach(header => {
                            html += `<th>${header}</th>`;
                        });
                        html += `<th>操作</th>`;
                        html += `</tr></thead>`;
                    }
                    
                    if (rows.length > 0) {
                        html += `<tbody>`;
                        rows.forEach((row, rowIndex) => {
                            const rowData = row.slice(1);
                            html += `<tr data-row-index="${rowIndex}">`;
                            rowData.forEach((cell, cellIndex) => {
                                const header = headers[cellIndex] || `列${cellIndex + 1}`;
                                html += `<td class="editable-cell" data-sheet-key="${sheetKey}" data-row-index="${rowIndex}" data-cell-index="${cellIndex}" data-message-index="${messageIndex}">`;
                                html += `<textarea placeholder="${header}" class="cell-input">${cell || ''}</textarea>`;
                                html += `</td>`;
                            });
                            html += `<td class="row-actions">`;
                            html += `<button class="save-row-btn" data-sheet-key="${sheetKey}" data-row-index="${rowIndex}" data-message-index="${messageIndex}">保存</button> `;
                            html += `<button class="delete-row-btn" data-sheet-key="${sheetKey}" data-row-index="${rowIndex}" data-message-index="${messageIndex}">删除</button>`;
                            html += `</td>`;
                            html += `</tr>`;
                        });
                        html += `</tbody>`;
                    } else {
                        html += `<tbody><tr><td colspan="${headers.length + 1}" class="no-data">暂无数据</td></tr></tbody>`;
                    }
                    
                    html += `</table>`;
                    html += `</div>`;
                } else {
                    html += `<p class="no-data">表格内容为空</p>`;
                }
                
                html += `</div></div>`;
            });
        }
        
        html += '</div>';
        
        $content.html(html);
        
        bindDetailsEvents_ACU($detailsArea, messageIndex);
        
        setTimeout(() => {
            optimizeForMobile();
        }, 100);
    }
    
    // 绑定详情区域事件
    function bindDetailsEvents_ACU($detailsArea, messageIndex) {
        $detailsArea.on('click', '.delete-table-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const sheetKey = $(this).data('sheet-key');
            deleteTableInDetails(sheetKey, messageIndex);
        });
        
        $detailsArea.on('click', '.save-row-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const sheetKey = $(this).data('sheet-key');
            const rowIndex = parseInt($(this).data('row-index'));
            saveRowInDetails(sheetKey, rowIndex, messageIndex);
        });
        
        $detailsArea.on('input', '.cell-input', function(e) {
            e.stopPropagation();
        });
        
        $detailsArea.on('click', '.delete-row-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const sheetKey = $(this).data('sheet-key');
            const rowIndex = parseInt($(this).data('row-index'));
            deleteRowInDetails(sheetKey, rowIndex, messageIndex);
        });
    }
    
    // 删除消息数据
    function deleteMessageData_ACU(messageIndex) {
        const message = SillyTavern_API_ACU.chat[messageIndex];
        if (!message) return;
        
        if (confirm(`确定要删除楼层 ${messageIndex + 1} 的数据库记录吗？此操作不可撤销。`)) {
            try {
                delete message.TavernDB_ACU_Data;
                showDataOverview_ACU();
                showToastr_ACU('success', '数据库记录已删除');
            } catch (error) {
                console.error('删除消息数据失败:', error);
                showToastr_ACU('error', `删除失败: ${error.message}`);
            }
        }
    }
    
    // 保存行数据（详情页面）
    async function saveRowInDetails(sheetKey, rowIndex, messageIndex) {
        const message = SillyTavern_API_ACU.chat[messageIndex];
        if (!message || !message.TavernDB_ACU_Data) return;
        
        const table = message.TavernDB_ACU_Data[sheetKey];
        if (!table || !table.content || !table.content[rowIndex + 1]) return;
        
        const $overviewArea = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-data-overview-area`);
        const $detailsArea = $overviewArea.find(`.message-details[data-message-index="${messageIndex}"]`);
        
        const $rowInputs = $detailsArea.find(`tr[data-row-index="${rowIndex}"] .cell-input`);
        const newRowData = [];
        
        $rowInputs.each(function() {
            const value = $(this).val() || '';
            newRowData.push(value);
        });
        
        table.content[rowIndex + 1] = [null, ...newRowData];
        
        if (!currentJsonTableData_ACU) {
            currentJsonTableData_ACU = {};
        }
        
        if (message.TavernDB_ACU_Data) {
            Object.keys(currentJsonTableData_ACU).forEach(key => {
                if (key.startsWith('sheet_')) {
                    delete currentJsonTableData_ACU[key];
                }
            });
            
            Object.keys(message.TavernDB_ACU_Data).forEach(key => {
                if (key.startsWith('sheet_')) {
                    currentJsonTableData_ACU[key] = JSON.parse(JSON.stringify(message.TavernDB_ACU_Data[key]));
                }
            });
        }
        
        currentJsonTableData_ACU[sheetKey] = table;
        
        await saveJsonTableToChatHistory_ACU();
        
        try {
            await syncDataToWorldbook_ACU(currentJsonTableData_ACU);
            showToastr_ACU('success', '行数据已保存并同步到世界书');
        } catch (error) {
            console.error('同步到世界书失败:', error);
            showToastr_ACU('warning', '行数据已保存，但同步到世界书失败');
        }
        
        loadMessageDetails_ACU(messageIndex, $detailsArea);
    }
    
    // 删除行（详情页面）
    async function deleteRowInDetails(sheetKey, rowIndex, messageIndex) {
        const message = SillyTavern_API_ACU.chat[messageIndex];
        if (!message || !message.TavernDB_ACU_Data) return;
        
        const table = message.TavernDB_ACU_Data[sheetKey];
        if (!table || !table.content || !table.content[rowIndex + 1]) return;
        
        if (confirm('确定要删除这一行吗？此操作不可撤销。')) {
            table.content.splice(rowIndex + 1, 1);
            
            if (!currentJsonTableData_ACU) {
                currentJsonTableData_ACU = {};
            }
            
            if (message.TavernDB_ACU_Data) {
                Object.keys(currentJsonTableData_ACU).forEach(key => {
                    if (key.startsWith('sheet_')) {
                        delete currentJsonTableData_ACU[key];
                    }
                });
                
                Object.keys(message.TavernDB_ACU_Data).forEach(key => {
                    if (key.startsWith('sheet_')) {
                        currentJsonTableData_ACU[key] = JSON.parse(JSON.stringify(message.TavernDB_ACU_Data[key]));
                    }
                });
            }
            
            currentJsonTableData_ACU[sheetKey] = table;
            
            await saveJsonTableToChatHistory_ACU();
            
            try {
                await syncDataToWorldbook_ACU(currentJsonTableData_ACU);
                showToastr_ACU('success', '行已删除并同步到世界书');
            } catch (error) {
                console.error('同步到世界书失败:', error);
                showToastr_ACU('warning', '行已删除，但同步到世界书失败');
            }
            
            const $overviewArea = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-data-overview-area`);
            const $detailsArea = $overviewArea.find(`.message-details[data-message-index="${messageIndex}"]`);
            loadMessageDetails_ACU(messageIndex, $detailsArea);
        }
    }
    
    // 删除表格（详情页面）
    async function deleteTableInDetails(sheetKey, messageIndex) {
        const message = SillyTavern_API_ACU.chat[messageIndex];
        if (!message || !message.TavernDB_ACU_Data) return;
        
        const table = message.TavernDB_ACU_Data[sheetKey];
        if (!table) return;
        
        if (confirm(`确定要删除表格 "${table.name}" 吗？此操作不可撤销。`)) {
            delete message.TavernDB_ACU_Data[sheetKey];
            
            if (!currentJsonTableData_ACU) {
                currentJsonTableData_ACU = {};
            }
            
            if (message.TavernDB_ACU_Data) {
                Object.keys(currentJsonTableData_ACU).forEach(key => {
                    if (key.startsWith('sheet_')) {
                        delete currentJsonTableData_ACU[key];
                    }
                });
                
                Object.keys(message.TavernDB_ACU_Data).forEach(key => {
                    if (key.startsWith('sheet_')) {
                        currentJsonTableData_ACU[key] = JSON.parse(JSON.stringify(message.TavernDB_ACU_Data[key]));
                    }
                });
            }
            
            delete currentJsonTableData_ACU[sheetKey];
            
            await saveJsonTableToChatHistory_ACU();
            
            try {
                await syncDataToWorldbook_ACU(currentJsonTableData_ACU);
                showToastr_ACU('success', '表格已删除并同步到世界书');
            } catch (error) {
                console.error('同步到世界书失败:', error);
                showToastr_ACU('warning', '表格已删除，但同步到世界书失败');
            }
            
            const $overviewArea = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-data-overview-area`);
            const $detailsArea = $overviewArea.find(`.message-details[data-message-index="${messageIndex}"]`);
            loadMessageDetails_ACU(messageIndex, $detailsArea);
        }
    }
    
    // 添加展开详情样式
    function addExpandDetailsStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .expanded-details-content { font-family: Arial, sans-serif; color: #e0e0e0; }
            .expanded-details-content .table-section { margin-bottom: 20px; border: 1px solid #444; border-radius: 5px; padding: 15px; background: #1a1a1a; }
            .expanded-details-content .table-title { margin: 0 0 10px 0; color: #fff; font-size: 16px; }
            .expanded-details-content .table-metadata { background: #2a2a2a; padding: 10px; margin: 10px 0; border-radius: 3px; font-size: 12px; color: #ccc; }
            .expanded-details-content .table-metadata p { margin: 5px 0; }
            .expanded-details-content .table-scroll-container { 
                overflow-x: auto; 
                overflow-y: visible; 
                margin-top: 10px; 
                border: 1px solid #444; 
                border-radius: 3px; 
                max-height: 400px; 
                min-width: 100%;
            }
            .expanded-details-content .data-table { 
                width: max-content; 
                min-width: 100%; 
                border-collapse: collapse; 
                margin: 0; 
            }
            .expanded-details-content .data-table th, .expanded-details-content .data-table td { 
                border: 1px solid #444; 
                padding: 8px 12px; 
                text-align: left; 
                color: #e0e0e0; 
                white-space: nowrap; 
                min-width: 80px; 
                word-wrap: break-word; 
                overflow-wrap: break-word; 
            }
            .expanded-details-content .data-table th { 
                background-color: #333; 
                font-weight: bold; 
                color: #fff; 
                position: sticky; 
                top: 0; 
                z-index: 10; 
            }
            .expanded-details-content .data-table tr:nth-child(even) { background-color: #222; }
            .expanded-details-content .data-table tr:hover { background-color: #333; }
            .expanded-details-content .no-data { text-align: center; color: #888; font-style: italic; }
            .expanded-details-content .table-actions button { margin-left: 5px; padding: 5px 10px; font-size: 12px; }
            .expanded-details-content .row-actions button { margin-right: 5px; padding: 3px 8px; font-size: 11px; }
            .expanded-details-content .delete-table-btn, .expanded-details-content .save-row-btn, .expanded-details-content .delete-row-btn { 
                background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; 
            }
            .expanded-details-content .delete-table-btn, .expanded-details-content .delete-row-btn { background: #dc3545; }
            .expanded-details-content .save-row-btn { background: #28a745; }
            .expanded-details-content .save-row-btn:hover { background: #218838; }
            .expanded-details-content .delete-table-btn:hover, .expanded-details-content .delete-row-btn:hover { background: #c82333; }
            
            .expanded-details-content .editable-cell { 
                padding: 2px !important; 
                vertical-align: top !important; 
            }
            .expanded-details-content .cell-input {
                background: #1a1a1a !important;
                color: #e0e0e0 !important;
                border: 1px solid #444 !important;
                width: 100% !important;
                min-width: 80px !important;
                padding: 6px 8px !important;
                border-radius: 3px !important;
                font-size: 12px !important;
                transition: border-color 0.2s ease !important;
                resize: vertical !important;
                min-height: 32px !important;
                max-height: 120px !important;
                overflow-y: auto !important;
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                line-height: 1.4 !important;
                font-family: inherit !important;
            }
            .expanded-details-content .cell-input:focus {
                border-color: #007bff !important;
                outline: none !important;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25) !important;
            }
            .expanded-details-content .cell-input:hover {
                border-color: #666 !important;
            }
            
            .expanded-details-content .table-scroll-container::-webkit-scrollbar {
                height: 8px;
                width: 8px;
            }
            .expanded-details-content .table-scroll-container::-webkit-scrollbar-track {
                background: #2a2a2a;
                border-radius: 4px;
            }
            .expanded-details-content .table-scroll-container::-webkit-scrollbar-thumb {
                background: #555;
                border-radius: 4px;
            }
            .expanded-details-content .table-scroll-container::-webkit-scrollbar-thumb:hover {
                background: #777;
            }
            
            .expanded-details-content .table-section {
                overflow: hidden;
            }
            
            .expanded-details-content .row-actions {
                white-space: nowrap;
                min-width: 120px;
            }
            
            .expanded-details-content .data-table th {
                min-width: max-content;
                width: auto;
            }
            
            @media (max-width: 768px) {
                .expanded-details-content {
                    padding: 5px;
                }
                .expanded-details-content .table-section {
                    margin-bottom: 15px;
                    padding: 10px;
                    border-radius: 8px;
                }
                .expanded-details-content .table-title {
                    font-size: 14px;
                    margin-bottom: 8px;
                }
                .expanded-details-content .table-metadata {
                    padding: 8px;
                    font-size: 11px;
                }
                .expanded-details-content .table-scroll-container {
                    max-height: 300px;
                    margin-top: 8px;
                }
                .expanded-details-content .data-table th, 
                .expanded-details-content .data-table td {
                    padding: 6px 8px;
                    font-size: 11px;
                    min-width: 60px;
                }
                .expanded-details-content .cell-input {
                    padding: 4px 6px !important;
                    font-size: 11px !important;
                    min-height: 28px !important;
                    min-width: 60px !important;
                }
                .expanded-details-content .table-actions button,
                .expanded-details-content .row-actions button {
                    padding: 4px 8px;
                    font-size: 10px;
                    margin: 2px;
                }
                .expanded-details-content .row-actions {
                    min-width: 100px;
                }
                .expanded-details-content .table-scroll-container::-webkit-scrollbar {
                    height: 6px;
                    width: 6px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // 初始化展开详情样式
    addExpandDetailsStyles();
    
    // 移动端优化
    function optimizeForMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
        
        if (isMobile) {
            document.body.classList.add('mobile-device');
            
            const scrollContainers = document.querySelectorAll('.table-scroll-container');
            scrollContainers.forEach(container => {
                container.style.webkitOverflowScrolling = 'touch';
                container.style.overflowScrolling = 'touch';
            });
            
            const inputs = document.querySelectorAll('.cell-input');
            inputs.forEach(input => {
                input.setAttribute('autocomplete', 'off');
                input.setAttribute('autocorrect', 'off');
                input.setAttribute('autocapitalize', 'off');
                input.setAttribute('spellcheck', 'false');
            });
        }
    }
    
    // ==================== 数据导入导出 UI 函数 ====================
    
    // 导出JSON数据
    function exportCurrentJsonData_ACU() {
        if (!currentJsonTableData_ACU) {
            showToastr_ACU('warning', '没有可导出的数据库。请先开始一个对话。');
            return;
        }
        try {
            const chatName = currentChatFileIdentifier_ACU || 'current_chat';
            const fileName = `TavernDB_data_${chatName}.json`;
            const jsonString = JSON.stringify(currentJsonTableData_ACU, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToastr_ACU('success', '数据库JSON文件已成功导出！');
        } catch (error) {
            logError_ACU('导出JSON数据失败:', error);
            showToastr_ACU('error', '导出JSON失败，请检查控制台获取详情。');
        }
    }
    
    // 导出表格模板
    function exportTableTemplate_ACU() {
        try {
            const jsonData = JSON.parse(TABLE_TEMPLATE_ACU);
            const jsonString = JSON.stringify(jsonData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'TavernDB_template.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToastr_ACU('success', '表格模板已成功导出！');
        } catch (error) {
            logError_ACU('导出模板失败:', error);
            showToastr_ACU('error', '导出模板失败，请检查控制台获取详情。');
        }
    }
    
    // 恢复默认表格模板
    async function resetTableTemplate_ACU() {
        try {
            storage_ACU.setItem(STORAGE_KEY_CUSTOM_TEMPLATE_ACU, DEFAULT_TABLE_TEMPLATE_ACU);
            TABLE_TEMPLATE_ACU = DEFAULT_TABLE_TEMPLATE_ACU;
            showToastr_ACU('success', '模板已恢复为默认值！正在重新初始化数据库...');
            logDebug_ACU('Table template has been reset to default and saved to localStorage and memory.');
            
            if (SillyTavern_API_ACU.chatId) {
                await initializeJsonTableInChatHistory_ACU();
                topLevelWindow_ACU.AutoCardUpdaterAPI._notifyTableUpdate();
                if (typeof updateCardUpdateStatusDisplay_ACU === 'function') {
                    updateCardUpdateStatusDisplay_ACU();
                }
            }
        } catch (error) {
            logError_ACU('恢复默认模板失败:', error);
            showToastr_ACU('error', '恢复默认模板失败，请检查控制台获取详情。');
        }
    }
    
    // 导入表格模板
    function importTableTemplate_ACU() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (readerEvent) => {
                const content = readerEvent.target.result;
                let jsonData;

                try {
                    jsonData = JSON.parse(content);
                } catch (error) {
                    logError_ACU('导入模板失败：JSON解析错误。', error);
                    let errorMessage = '文件不是有效的JSON格式。请检查是否存在多余的逗号、缺失的括号或不正确的引号。';
                    if (error.message) {
                        errorMessage += ` (错误详情: ${error.message})`;
                    }
                    showToastr_ACU('error', errorMessage, { timeOut: 10000 });
                    return;
                }
                
                try {
                    if (!jsonData.mate || !jsonData.mate.type || jsonData.mate.type !== 'chatSheets') {
                        throw new Error('缺少 "mate" 对象或 "type" 属性不正确。模板必须包含 `"mate": {"type": "chatSheets", ...}`。');
                    }

                    const sheetKeys = Object.keys(jsonData).filter(k => k.startsWith('sheet_'));
                    if (sheetKeys.length === 0) {
                        throw new Error('模板中未找到任何表格数据 (缺少 "sheet_..." 键)。');
                    }

                    for (const key of sheetKeys) {
                        const sheet = jsonData[key];
                        if (!sheet.name || !sheet.content || !sheet.sourceData || !Array.isArray(sheet.content)) {
                            throw new Error(`表格 "${key}" 结构不完整，缺少 "name"、"content" 或 "sourceData" 关键属性。`);
                        }
                    }

                    storage_ACU.setItem(STORAGE_KEY_CUSTOM_TEMPLATE_ACU, content);
                    TABLE_TEMPLATE_ACU = content;
                    showToastr_ACU('success', '模板已成功导入！正在重新初始化数据库...');
                    logDebug_ACU('New table template loaded and saved to localStorage and memory.');

                    if (SillyTavern_API_ACU.chatId) {
                        await initializeJsonTableInChatHistory_ACU();
                        topLevelWindow_ACU.AutoCardUpdaterAPI._notifyTableUpdate();
                        if (typeof updateCardUpdateStatusDisplay_ACU === 'function') {
                            updateCardUpdateStatusDisplay_ACU();
                        }
                    }

                } catch (error) {
                    logError_ACU('导入模板失败：结构验证失败。', error);
                    showToastr_ACU('error', `导入失败: ${error.message}`, { timeOut: 10000 });
                }
            };
            reader.readAsText(file, 'UTF-8');
        };
        input.click();
    }
    
    // 导出合并设置
    function exportCombinedSettings_ACU() {
        const promptSegments = getCharCardPromptFromUI_ACU();
        if (!promptSegments || promptSegments.length === 0) {
            showToastr_ACU('warning', '没有可导出的提示词。');
            return;
        }

        try {
            const templateData = JSON.parse(TABLE_TEMPLATE_ACU);
            const combinedData = {
                prompt: promptSegments,
                template: templateData,
            };
            const jsonString = JSON.stringify(combinedData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'TavernDB_Combined_Settings.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToastr_ACU('success', '合并配置已成功导出！');
        } catch (error) {
            logError_ACU('导出合并配置失败:', error);
            showToastr_ACU('error', '导出合并配置失败，请检查控制台获取详情。');
        }
    }
    
    // 导入合并设置
    function importCombinedSettings_ACU() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (readerEvent) => {
                const content = readerEvent.target.result;
                let combinedData;

                try {
                    combinedData = JSON.parse(content);
                } catch (error) {
                    logError_ACU('导入合并配置失败：JSON解析错误。', error);
                    showToastr_ACU('error', '文件不是有效的JSON格式。', { timeOut: 5000 });
                    return;
                }
                
                try {
                    if (!combinedData.prompt || !combinedData.template) {
                        throw new Error('JSON文件缺少 "prompt" 或 "template" 键。');
                    }
                    if (!Array.isArray(combinedData.prompt)) {
                        throw new Error('"prompt" 的值必须是一个数组。');
                    }
                    if (typeof combinedData.template !== 'object' || combinedData.template === null) {
                        throw new Error('"template" 的值必须是一个对象。');
                    }

                    settings_ACU.charCardPrompt = combinedData.prompt;
                    saveSettings_ACU();
                    renderPromptSegments_ACU(combinedData.prompt);
                    showToastr_ACU('success', '提示词预设已成功导入并保存！');
                    
                    const templateString = JSON.stringify(combinedData.template);
                    storage_ACU.setItem(STORAGE_KEY_CUSTOM_TEMPLATE_ACU, templateString);
                    TABLE_TEMPLATE_ACU = templateString;
                    showToastr_ACU('success', '表格模板已成功导入！正在重新初始化数据库...');

                    if (SillyTavern_API_ACU.chatId) {
                        await initializeJsonTableInChatHistory_ACU();
                        topLevelWindow_ACU.AutoCardUpdaterAPI._notifyTableUpdate();
                        if (typeof updateCardUpdateStatusDisplay_ACU === 'function') {
                            updateCardUpdateStatusDisplay_ACU();
                        }
                    }
                    showToastr_ACU('success', '合并配置已成功导入！');

                } catch (error) {
                    logError_ACU('导入合并配置失败：结构验证失败。', error);
                    showToastr_ACU('error', `导入失败: ${error.message}`, { timeOut: 10000 });
                }
            };
            reader.readAsText(file, 'UTF-8');
        };
        input.click();
    }

    // 手动更新卡片
    async function handleManualUpdateCard_ACU() {
        if (isAutoUpdatingCard_ACU) {
            showToastr_ACU('info', '已有更新任务在后台进行中。');
            return;
        }
        
        const apiIsConfigured = (settings_ACU.apiMode === 'custom' && (settings_ACU.apiConfig.useMainApi || (settings_ACU.apiConfig.url && settings_ACU.apiConfig.model))) || (settings_ACU.apiMode === 'tavern' && settings_ACU.tavernProfile);

        if (!apiIsConfigured) {
            showToastr_ACU('warning', '请先完成当前API模式的配置。');
            if ($popupInstance_ACU && $apiConfigAreaDiv_ACU && $apiConfigAreaDiv_ACU.is(':hidden')) {
                if ($apiConfigSectionToggle_ACU) $apiConfigSectionToggle_ACU.trigger('click');
            }
            return;
        }

        const startFloor = parseInt($floorRangeStartInput_ACU.val()) || 1;
        const endFloor = parseInt($floorRangeEndInput_ACU.val()) || null;

        if (startFloor < 1) {
            showToastr_ACU('error', '起始楼层必须大于等于1。');
            return;
        }

        if (endFloor !== null && endFloor < startFloor) {
            showToastr_ACU('error', '结束楼层必须大于等于起始楼层。');
            return;
        }

        isAutoUpdatingCard_ACU = true;
        if ($manualUpdateCardButton_ACU) $manualUpdateCardButton_ACU.prop('disabled', true).text('更新中...');
        
        const liveChat = SillyTavern_API_ACU.chat || [];
        
        const allAiMessageIndices = liveChat
            .map((msg, index) => !msg.is_user ? index + 1 : -1)
            .filter(index => index !== -1);

        if (allAiMessageIndices.length === 0) {
            showToastr_ACU('info', '没有找到AI消息可供处理。');
            isAutoUpdatingCard_ACU = false;
            if ($manualUpdateCardButton_ACU) $manualUpdateCardButton_ACU.prop('disabled', false).text('按楼层范围更新数据库');
            return;
        }

        let messagesToProcessIndices = [];
        
        if (endFloor === null) {
            messagesToProcessIndices = allAiMessageIndices.filter(floorNum => floorNum >= startFloor);
        } else {
            messagesToProcessIndices = allAiMessageIndices.filter(floorNum => floorNum >= startFloor && floorNum <= endFloor);
        }

        const messageIndices = messagesToProcessIndices.map(floorNum => floorNum - 1);

        if (messageIndices.length === 0) {
            const rangeText = endFloor ? `楼层 ${startFloor}-${endFloor}` : `楼层 ${startFloor} 及以后`;
            showToastr_ACU('info', `在指定范围 ${rangeText} 内没有找到AI消息可供处理。`);
            isAutoUpdatingCard_ACU = false;
            if ($manualUpdateCardButton_ACU) $manualUpdateCardButton_ACU.prop('disabled', false).text('按楼层范围更新数据库');
            return;
        }
        
        const rangeText = endFloor ? `楼层 ${startFloor}-${endFloor}` : `楼层 ${startFloor} 及以后`;
        showToastr_ACU('info', `手动更新已启动，将处理范围 ${rangeText} 内的 ${messageIndices.length} 条AI消息。`);
        const success = await processUpdates_ACU(messageIndices, 'manual');

        if (success && $autoHideMessagesCheckbox_ACU && $autoHideMessagesCheckbox_ACU.is(':checked')) {
            showToastr_ACU('info', '数据整理完成，正在隐藏相关楼层...');
            
            try {
                const hideResult = await hideMessagesByFloorRange_ACU(startFloor, endFloor);
                
                if (hideResult.success) {
                    showToastr_ACU('success', `数据整理完成！已成功隐藏楼层范围 ${hideResult.rangeText}。`);
                } else {
                    showToastr_ACU('warning', `数据整理完成！但隐藏楼层时出现问题：${hideResult.errorMessage}`);
                }
            } catch (error) {
                console.error('隐藏楼层时发生错误:', error);
                showToastr_ACU('warning', '数据整理完成！但自动隐藏功能出现问题，请手动隐藏相关楼层。');
            }
        } else if (success) {
            showToastr_ACU('success', '按楼层范围更新已成功完成！');
        }

        isAutoUpdatingCard_ACU = false;
        if ($manualUpdateCardButton_ACU) $manualUpdateCardButton_ACU.prop('disabled', false).text('按楼层范围更新数据库');
        
        if (!success) {
            showToastr_ACU('error', '按楼层范围更新失败或被中断。');
        }
    }

    // ==================== 弹出窗口函数 ====================
    async function updateCardUpdateStatusDisplay_ACU() {
        const $totalMessagesDisplay = $popupInstance_ACU
            ? $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-total-messages-display`)
            : null;
        const $unrecordedMessagesDisplay = $popupInstance_ACU
            ? $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-unrecorded-messages-display`)
            : null;

        if (
            !$popupInstance_ACU ||
            !$cardUpdateStatusDisplay_ACU ||
            !$cardUpdateStatusDisplay_ACU.length ||
            !$totalMessagesDisplay ||
            !$totalMessagesDisplay.length ||
            !$unrecordedMessagesDisplay ||
            !$unrecordedMessagesDisplay.length
        ) {
            logDebug_ACU('updateCardUpdateStatusDisplay_ACU: UI elements not ready.');
            return;
        }

        const chatHistory = SillyTavern_API_ACU.chat || [];
        // 排除楼层0，统计实际楼层数
        const totalMessages = chatHistory.filter((_, index) => index > 0).length;
        $totalMessagesDisplay.text(`上下文总层数: ${totalMessages}`);

        let unrecordedMessages = 0;
        let foundLastUpdate = false;
        // 从后往前遍历，排除楼层0
        for (let i = chatHistory.length - 1; i > 0; i--) {
            const message = chatHistory[i];
            if (message.TavernDB_ACU_Data) {
                foundLastUpdate = true;
                break;
            } else {
                unrecordedMessages++;
            }
        }
        if (!foundLastUpdate) {
            unrecordedMessages = totalMessages;
        }
        $unrecordedMessagesDisplay.text(`尚未记录层数: ${unrecordedMessages}`);

        if (!currentJsonTableData_ACU) {
            $cardUpdateStatusDisplay_ACU.text('数据库状态：未加载或初始化失败。');
            return;
        }

        try {
            const sheetKeys = Object.keys(currentJsonTableData_ACU).filter(k => k.startsWith('sheet_'));
            const tableCount = sheetKeys.length;
            let totalRowCount = 0;

            sheetKeys.forEach(key => {
                const sheet = currentJsonTableData_ACU[key];
                if (sheet && sheet.content && Array.isArray(sheet.content)) {
                    totalRowCount += sheet.content.length > 1 ? sheet.content.length - 1 : 0; // Subtract header row
                }
            });

            $cardUpdateStatusDisplay_ACU.html(
                `数据库状态: <b style="color:lightgreen;">已加载</b> (${tableCount}个表格, ${totalRowCount}条记录)`,
            );
        } catch (e) {
            logError_ACU('ACU: Failed to parse database for UI status:', e);
            $cardUpdateStatusDisplay_ACU.text('解析数据库状态时出错。');
        }
    }

    async function openAutoCardPopup_ACU() {
        if (!coreApisAreReady_ACU) {
            showToastr_ACU('error', '核心API未就绪。');
            return;
        }
        showToastr_ACU('info', '正在准备数据库更新工具...', { timeOut: 1000 });
        loadSettings_ACU();

        const popupHtml = `
            <div id="${POPUP_ID_ACU}" class="auto-card-updater-popup">
                <style>
                    #${POPUP_ID_ACU} {
                        --bg-color: #1a1d24;
                        --primary-color: #00aaff;
                        --primary-hover-color: #0088cc;
                        --text-color: #e0e0e0;
                        --text-secondary-color: #a0a0a0;
                        --border-color: #3a3f4b;
                        --surface-color: #252a33;
                        --surface-hover-color: #2f3542;
                        --success-color: #4CAF50;
                        --error-color: #F44336;
                        --warning-color: #FFC107;
                        font-family: 'Segoe UI', 'Roboto', sans-serif;
                        font-size: 14px;
                        color: var(--text-color);
                        background-color: var(--bg-color);
                    }

                    #${POPUP_ID_ACU} h2#updater-main-title-acu {
                        font-size: 1.5em;
                        font-weight: 300;
                        color: var(--primary-color);
                        text-align: center;
                        border-bottom: 1px solid var(--border-color);
                        padding-bottom: 15px;
                        margin-bottom: 15px;
                    }

                    #${POPUP_ID_ACU} .acu-tabs-nav {
                        display: flex;
                        border-bottom: 1px solid var(--border-color);
                        margin-bottom: 20px;
                    }
                    #${POPUP_ID_ACU} .acu-tab-button {
                        padding: 10px 20px;
                        cursor: pointer;
                        border: none;
                        background: none;
                        color: var(--text-secondary-color);
                        font-size: 1em;
                        transition: all 0.2s ease-in-out;
                        border-bottom: 2px solid transparent;
                    }
                    #${POPUP_ID_ACU} .acu-tab-button.active {
                        color: var(--primary-color);
                        border-bottom: 2px solid var(--primary-color);
                    }
                    #${POPUP_ID_ACU} .acu-tab-button:hover {
                        background-color: var(--surface-hover-color);
                        color: var(--text-color);
                    }

                    #${POPUP_ID_ACU} .acu-tab-content {
                        display: none;
                    }
                    #${POPUP_ID_ACU} .acu-tab-content.active {
                        display: block;
                        animation: fadeIn 0.5s;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }

                    #${POPUP_ID_ACU} .acu-card {
                        background-color: var(--surface-color);
                        border: 1px solid var(--border-color);
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    }
                    #${POPUP_ID_ACU} .acu-card h3 {
                        margin-top: 0;
                        color: var(--primary-color);
                        font-size: 1.2em;
                        font-weight: 500;
                        border-bottom: 1px solid var(--border-color);
                        padding-bottom: 10px;
                        margin-bottom: 15px;
                    }
                    #${POPUP_ID_ACU} .acu-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 15px;
                    }
                    
                    #${POPUP_ID_ACU} label {
                        display: block;
                        margin-bottom: 5px;
                        color: var(--text-secondary-color);
                        font-weight: 500;
                    }
                    #${POPUP_ID_ACU} input, #${POPUP_ID_ACU} select, #${POPUP_ID_ACU} textarea {
                        width: 100%;
                        padding: 10px;
                        background-color: var(--bg-color) !important;
                        border: 1px solid var(--border-color) !important;
                        border-radius: 4px;
                        color: var(--text-color) !important;
                        font-size: 0.95em;
                        box-sizing: border-box;
                        transition: border-color 0.2s, box-shadow 0.2s;
                    }
                    #${POPUP_ID_ACU} input:focus, #${POPUP_ID_ACU} select:focus, #${POPUP_ID_ACU} textarea:focus {
                        border-color: var(--primary-color) !important;
                        box-shadow: 0 0 5px rgba(0, 170, 255, 0.5) !important;
                        outline: none !important;
                    }
                    #${POPUP_ID_ACU} textarea {
                        min-height: 100px;
                        resize: vertical;
                    }

                    #${POPUP_ID_ACU} button, #${POPUP_ID_ACU} .button {
                        padding: 10px 15px;
                        border: 1px solid var(--primary-color);
                        border-radius: 4px;
                        background-color: transparent;
                        color: var(--primary-color);
                        cursor: pointer;
                        font-size: 0.95em;
                        transition: all 0.2s ease;
                        text-align: center;
                    }
                    #${POPUP_ID_ACU} button:hover {
                        background-color: var(--primary-color);
                        color: var(--bg-color);
                        box-shadow: 0 0 10px rgba(0, 170, 255, 0.5);
                    }
                    #${POPUP_ID_ACU} button.primary, #${POPUP_ID_ACU} .button.primary {
                         background-color: var(--primary-color);
                         color: var(--bg-color);
                    }
                    #${POPUP_ID_ACU} button.primary:hover {
                        background-color: var(--primary-hover-color);
                        border-color: var(--primary-hover-color);
                    }
                    #${POPUP_ID_ACU} button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    #${POPUP_ID_ACU} .button-group {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 10px;
                        justify-content: center;
                        margin-top: 15px;
                    }

                    #${POPUP_ID_ACU} #${SCRIPT_ID_PREFIX_ACU}-card-update-status-display {
                        text-align: center;
                        padding: 15px;
                        border: 1px dashed var(--border-color);
                        border-radius: 4px;
                        background-color: rgba(0,0,0,0.1);
                        margin-bottom: 10px;
                    }
                     #${POPUP_ID_ACU} #${SCRIPT_ID_PREFIX_ACU}-total-messages-display {
                        text-align: center;
                        color: var(--text-secondary-color);
                        font-size: 0.9em;
                     }
                    #${POPUP_ID_ACU} .input-group {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    #${POPUP_ID_ACU} .input-group input {
                        flex-grow: 1;
                    }
                    #${POPUP_ID_ACU} .checkbox-group {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        padding: 10px;
                    }
                    #${POPUP_ID_ACU} .checkbox-group input[type="checkbox"] {
                        width: auto;
                    }
                    #${POPUP_ID_ACU} .checkbox-group label {
                        margin: 0;
                        color: var(--text-color);
                    }

                    #${POPUP_ID_ACU} .prompt-segment { margin-bottom: 10px; border: 1px solid var(--border-color); padding: 10px; border-radius: 4px; background-color: rgba(0,0,0,0.1); }
                    #${POPUP_ID_ACU} .prompt-segment-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                    #${POPUP_ID_ACU} .prompt-segment-role { width: 100px !important; flex-grow: 0; }
                    #${POPUP_ID_ACU} .prompt-segment-delete-btn { background-color: var(--error-color); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; line-height: 22px; text-align: center; padding: 0; font-size: 14px; flex-shrink: 0; }
                    #${POPUP_ID_ACU} .${SCRIPT_ID_PREFIX_ACU}-add-prompt-segment-btn { font-size: 1.2em; padding: 0 15px; line-height: 25px; height: 25px; min-width: 50px; border-radius: 50%; }

                    #${POPUP_ID_ACU} .qrf_radio_group {
                        display: flex; justify-content: center; align-items: center; gap: 5px; padding: 10px; border-radius: 5px; background-color: rgba(0,0,0,0.1);
                    }
                    #${POPUP_ID_ACU} .qrf_radio_group input[type="radio"] { width: auto !important; margin: 0; }
                    #${POPUP_ID_ACU} .qrf_radio_group label { margin: 0 10px 0 0 !important; }
                    #${POPUP_ID_ACU} .qrf_worldbook_list, #${POPUP_ID_ACU} .qrf_worldbook_entry_list {
                        border: 1px solid var(--border-color); border-radius: 3px; max-height: 120px; overflow-y: auto; background-color: rgba(0,0,0,0.1); padding: 5px;
                    }
                    #${POPUP_ID_ACU} .qrf_worldbook_list_item { padding: 5px 8px; cursor: pointer; user-select: none; border-radius: 3px; }
                    #${POPUP_ID_ACU} .qrf_worldbook_list_item:hover { background-color: var(--surface-hover-color); }
                    #${POPUP_ID_ACU} .qrf_worldbook_list_item.selected { background-color: var(--primary-color); color: var(--bg-color); }
                    #${POPUP_ID_ACU} .qrf_worldbook_entry_item { display: flex; align-items: center; margin-bottom: 5px; }
                    #${POPUP_ID_ACU} .qrf_worldbook_entry_item input[type="checkbox"] { width: auto !important; margin-right: 8px; flex-shrink: 0; }
                    
                    #${POPUP_ID_ACU} .notes {
                        font-size: 0.85em;
                        color: var(--text-secondary-color);
                        text-align: center;
                        display: block;
                        margin-top: 10px;
                    }
                    #${POPUP_ID_ACU} .flex-center { display: flex; justify-content: center; align-items: center; }
                </style>

                <h2 id="updater-main-title-acu">数据库自动更新 (当前聊天: ${escapeHtml_ACU(
                    currentChatFileIdentifier_ACU || '未知',
                )})</h2>

                <div class="acu-tabs-nav">
                    <button class="acu-tab-button active" data-tab="status">状态 & 操作</button>
                    <button class="acu-tab-button" data-tab="prompt">AI指令预设</button>
                    <button class="acu-tab-button" data-tab="api">API & 连接</button>
                    <button class="acu-tab-button" data-tab="worldbook">世界书</button>
                    <button class="acu-tab-button" data-tab="data">数据管理</button>
                </div>

                <div id="acu-tab-status" class="acu-tab-content active">
                    <div class="acu-grid">
                        <div class="acu-card">
                            <h3>数据库状态</h3>
                            <p id="${SCRIPT_ID_PREFIX_ACU}-card-update-status-display">正在获取状态...</p>
                            <p id="${SCRIPT_ID_PREFIX_ACU}-total-messages-display">上下文总层数: N/A</p>
                            <p id="${SCRIPT_ID_PREFIX_ACU}-unrecorded-messages-display">尚未记录层数: N/A</p>
                        </div>
                        <div class="acu-card">
                            <h3>核心操作</h3>
                            <div class="flex-center" style="flex-direction: column; gap: 15px;">
                                <div class="input-group">
                                    <label for="${SCRIPT_ID_PREFIX_ACU}-floor-range-start">起始楼层:</label>
                                    <input type="number" id="${SCRIPT_ID_PREFIX_ACU}-floor-range-start" placeholder="开始楼层" min="1" style="width: 100px;">
                                </div>
                                <div class="input-group">
                                    <label for="${SCRIPT_ID_PREFIX_ACU}-floor-range-end">结束楼层:</label>
                                    <input type="number" id="${SCRIPT_ID_PREFIX_ACU}-floor-range-end" placeholder="结束楼层" min="1" style="width: 100px;">
                                </div>
                                <button id="${SCRIPT_ID_PREFIX_ACU}-manual-update-card" class="primary" style="width:100%;">按楼层范围更新数据库</button>
                                <div class="checkbox-group">
                                    <input type="checkbox" id="${SCRIPT_ID_PREFIX_ACU}-auto-update-enabled-checkbox">
                                    <label for="${SCRIPT_ID_PREFIX_ACU}-auto-update-enabled-checkbox">启用自动更新</label>
                                </div>
                                <div class="checkbox-group">
                                    <input type="checkbox" id="${SCRIPT_ID_PREFIX_ACU}-auto-hide-messages-checkbox" checked>
                                    <label for="${SCRIPT_ID_PREFIX_ACU}-auto-hide-messages-checkbox">数据整理完成后自动隐藏相关楼层</label>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div class="acu-card">
                        <h3>更新配置</h3>
                        <div class="acu-grid">
                            <div>
                                <label for="${SCRIPT_ID_PREFIX_ACU}-auto-update-frequency">最新N层不更新:</label>
                                <div class="input-group">
                                    <input type="number" id="${SCRIPT_ID_PREFIX_ACU}-auto-update-frequency" min="1" step="1" placeholder="${DEFAULT_AUTO_UPDATE_FREQUENCY_ACU}">
                                    <button id="${SCRIPT_ID_PREFIX_ACU}-save-auto-update-frequency">保存</button>
                                </div>
                            </div>
                            <div>
                                <label for="${SCRIPT_ID_PREFIX_ACU}-auto-update-token-threshold">跳过更新Token阈值:</label>
                                <div class="input-group">
                                    <input type="number" id="${SCRIPT_ID_PREFIX_ACU}-auto-update-token-threshold" min="0" step="100" placeholder="${DEFAULT_AUTO_UPDATE_TOKEN_THRESHOLD_ACU}">
                                    <button id="${SCRIPT_ID_PREFIX_ACU}-save-auto-update-token-threshold">保存</button>
                                </div>
                            </div>
                             <div>
                                <label for="${SCRIPT_ID_PREFIX_ACU}-update-batch-size">每次更新楼层数:</label>
                                <div class="input-group">
                                    <input type="number" id="${SCRIPT_ID_PREFIX_ACU}-update-batch-size" min="1" step="1" placeholder="1">
                                    <button id="${SCRIPT_ID_PREFIX_ACU}-save-update-batch-size">保存</button>
                                </div>
                            </div>
                            <div>
                                <label for="${SCRIPT_ID_PREFIX_ACU}-remove-tags-input">自定义删除标签 (竖线分隔):</label>
                                <div class="input-group">
                                    <input type="text" id="${SCRIPT_ID_PREFIX_ACU}-remove-tags-input" placeholder="e.g., plot,status">
                                    <button id="${SCRIPT_ID_PREFIX_ACU}-save-remove-tags">保存</button>
                                </div>
                            </div>
                        </div>
                        <p class="notes">当自动更新时，若上下文Token（约等于字符数）低于此值，则跳过本次更新。</p>
                    </div>
                </div>

                <div id="acu-tab-prompt" class="acu-tab-content">
                    <div class="acu-card">
                        <h3>数据库更新预设 (任务指令)</h3>
                        <div id="${SCRIPT_ID_PREFIX_ACU}-prompt-constructor-area">
                            <div class="button-group" style="margin-bottom: 10px; justify-content: center;"><button class="${SCRIPT_ID_PREFIX_ACU}-add-prompt-segment-btn" data-position="top" title="在上方添加对话轮次">+</button></div>
                            <div id="${SCRIPT_ID_PREFIX_ACU}-prompt-segments-container">
                            </div>
                            <div class="button-group" style="margin-top: 10px; justify-content: center;"><button class="${SCRIPT_ID_PREFIX_ACU}-add-prompt-segment-btn" data-position="bottom" title="在下方添加对话轮次">+</button></div>
                        </div>
                        <div class="button-group">
                            <button id="${SCRIPT_ID_PREFIX_ACU}-save-char-card-prompt" class="primary">保存</button>
                            <button id="${SCRIPT_ID_PREFIX_ACU}-load-char-card-prompt-from-json">读取JSON模板</button>
                            <button id="${SCRIPT_ID_PREFIX_ACU}-reset-char-card-prompt">恢复默认</button>
                        </div>
                    </div>
                </div>

                <div id="acu-tab-api" class="acu-tab-content">
                     <div class="acu-card">
                        <h3>API设置</h3>
                        <div class="qrf_settings_block_radio">
                            <label>API模式:</label>
                            <div class="qrf_radio_group">
                                <input type="radio" id="${SCRIPT_ID_PREFIX_ACU}-api-mode-custom" name="${SCRIPT_ID_PREFIX_ACU}-api-mode" value="custom" checked>
                                <label for="${SCRIPT_ID_PREFIX_ACU}-api-mode-custom">自定义API</label>
                                <input type="radio" id="${SCRIPT_ID_PREFIX_ACU}-api-mode-tavern" name="${SCRIPT_ID_PREFIX_ACU}-api-mode" value="tavern">
                                <label for="${SCRIPT_ID_PREFIX_ACU}-api-mode-tavern">使用酒馆连接预设</label>
                            </div>
                        </div>

                        <div id="${SCRIPT_ID_PREFIX_ACU}-tavern-api-profile-block" style="display: none; margin-top: 15px;">
                            <label for="${SCRIPT_ID_PREFIX_ACU}-tavern-api-profile-select">酒馆连接预设:</label>
                             <div class="input-group">
                                <select id="${SCRIPT_ID_PREFIX_ACU}-tavern-api-profile-select"></select>
                                <button id="${SCRIPT_ID_PREFIX_ACU}-refresh-tavern-api-profiles" title="刷新预设列表">刷新</button>
                            </div>
                            <small class="notes">选择一个你在酒馆主设置中已经配置好的连接预设。</small>
                        </div>

                        <div id="${SCRIPT_ID_PREFIX_ACU}-custom-api-settings-block" style="margin-top: 15px;">
                             <div class="checkbox-group">
                                <input type="checkbox" id="${SCRIPT_ID_PREFIX_ACU}-use-main-api-checkbox">
                                <label for="${SCRIPT_ID_PREFIX_ACU}-use-main-api-checkbox">使用主API (直接使用酒馆当前API和模型)</label>
                            </div>
                            <div id="${SCRIPT_ID_PREFIX_ACU}-custom-api-fields">
                                <p class="notes" style="color:var(--warning-color);"><b>安全提示:</b>API密钥将保存在浏览器本地存储中。</p>
                                <label for="${SCRIPT_ID_PREFIX_ACU}-api-url">API基础URL:</label><input type="text" id="${SCRIPT_ID_PREFIX_ACU}-api-url">
                                <label for="${SCRIPT_ID_PREFIX_ACU}-api-key">API密钥(可选):</label><input type="password" id="${SCRIPT_ID_PREFIX_ACU}-api-key">
                                <div class="acu-grid" style="margin-top: 10px;">
                                    <div>
                                        <label for="${SCRIPT_ID_PREFIX_ACU}-max-tokens">最大Tokens:</label>
                                        <input type="number" id="${SCRIPT_ID_PREFIX_ACU}-max-tokens" min="1" step="1" placeholder="120000">
                                    </div>
                                    <div>
                                        <label for="${SCRIPT_ID_PREFIX_ACU}-temperature">温度:</label>
                                        <input type="number" id="${SCRIPT_ID_PREFIX_ACU}-temperature" min="0" max="2" step="0.05" placeholder="0.9">
                                    </div>
                                </div>
                                <button id="${SCRIPT_ID_PREFIX_ACU}-load-models" style="margin-top: 15px; width: 100%;">加载模型列表</button>
                                <label for="${SCRIPT_ID_PREFIX_ACU}-api-model" style="margin-top: 10px;">选择模型:</label>
                                <select id="${SCRIPT_ID_PREFIX_ACU}-api-model"><option value="">请先加载模型</option></select>
                            </div>
                            <div id="${SCRIPT_ID_PREFIX_ACU}-api-status" class="notes" style="margin-top:15px;">状态: 未配置</div>
                            <div class="button-group">
                                <button id="${SCRIPT_ID_PREFIX_ACU}-save-config" class="primary">保存API</button>
                                <button id="${SCRIPT_ID_PREFIX_ACU}-clear-config">清除API</button>
                            </div>
                        </div>
                     </div>
                </div>

                <div id="acu-tab-worldbook" class="acu-tab-content">
                    <div class="acu-card">
                        <h3>世界书设置</h3>
                        <div>
                            <label for="${SCRIPT_ID_PREFIX_ACU}-worldbook-injection-target">数据注入目标:</label>
                            <div class="input-group">
                                <select id="${SCRIPT_ID_PREFIX_ACU}-worldbook-injection-target" style="width: 100%;"></select>
                            </div>
                            <small class="notes">选择数据库条目（如全局、人物、大纲等）将被创建或更新到哪个世界书里。</small>
                        </div>
                        <hr style="border-color: var(--border-color); margin: 15px 0;">
                         <div class="qrf_settings_block_radio">
                            <label>世界书来源 (用于AI读取上下文):</label>
                            <div class="qrf_radio_group">
                                <input type="radio" id="${SCRIPT_ID_PREFIX_ACU}-worldbook-source-character" name="${SCRIPT_ID_PREFIX_ACU}-worldbook-source" value="character" checked>
                                <label for="${SCRIPT_ID_PREFIX_ACU}-worldbook-source-character">角色卡绑定</label>
                                <input type="radio" id="${SCRIPT_ID_PREFIX_ACU}-worldbook-source-manual" name="${SCRIPT_ID_PREFIX_ACU}-worldbook-source" value="manual">
                                <label for="${SCRIPT_ID_PREFIX_ACU}-worldbook-source-manual">手动选择</label>
                            </div>
                        </div>
                        <div id="${SCRIPT_ID_PREFIX_ACU}-worldbook-manual-select-block" style="display: none; margin-top: 10px;">
                            <label for="${SCRIPT_ID_PREFIX_ACU}-worldbook-select">选择世界书 (可多选):</label>
                            <div class="input-group">
                                <div id="${SCRIPT_ID_PREFIX_ACU}-worldbook-select" class="qrf_worldbook_list"></div>
                                <button id="${SCRIPT_ID_PREFIX_ACU}-refresh-worldbooks" title="刷新世界书列表">刷新</button>
                            </div>
                        </div>
                        <div style="margin-top: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <label style="margin-bottom: 0;">启用的世界书条目:</label>
                                <div class="button-group" style="margin: 0;">
                                    <button id="${SCRIPT_ID_PREFIX_ACU}-worldbook-select-all" class="button" style="padding: 2px 8px; font-size: 0.8em;">全选</button>
                                    <button id="${SCRIPT_ID_PREFIX_ACU}-worldbook-deselect-all" class="button" style="padding: 2px 8px; font-size: 0.8em;">全不选</button>
                                </div>
                            </div>
                            <div id="${SCRIPT_ID_PREFIX_ACU}-worldbook-entry-list" class="qrf_worldbook_entry_list">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="acu-tab-data" class="acu-tab-content">
                    <div class="acu-card">
                        <h3>数据管理</h3>
                        <p class="notes">导入/导出当前对话的数据库，或管理全局模板。</p>
                        <div class="button-group">
                            <button id="${SCRIPT_ID_PREFIX_ACU}-import-combined-settings" class="primary">合并导入(模板+指令)</button>
                            <button id="${SCRIPT_ID_PREFIX_ACU}-export-combined-settings" class="primary">合并导出(模板+指令)</button>
                        </div>
                        <hr style="border-color: var(--border-color); margin: 15px 0;">
                        <div class="button-group">
                            <button id="${SCRIPT_ID_PREFIX_ACU}-export-json-data">导出JSON数据</button>
                            <button id="${SCRIPT_ID_PREFIX_ACU}-import-template">导入新模板</button>
                            <button id="${SCRIPT_ID_PREFIX_ACU}-export-template">导出当前模板</button>
                            <button id="${SCRIPT_ID_PREFIX_ACU}-reset-template">恢复默认模板</button>
                        </div>
                        <div class="button-group">
                            <button id="${SCRIPT_ID_PREFIX_ACU}-visualize-template">可视化当前模板</button>
                            <button id="${SCRIPT_ID_PREFIX_ACU}-show-data-overview">数据概览</button>
                        </div>
                        <div id="${SCRIPT_ID_PREFIX_ACU}-template-visualization-area" style="display:none; margin-top:15px;">
                            <textarea id="${SCRIPT_ID_PREFIX_ACU}-template-visualization-textarea" readonly></textarea>
                        </div>
                        <div id="${SCRIPT_ID_PREFIX_ACU}-data-display-area" style="display:none; margin-top:15px; z-index: 9999; position: relative; background: #1a1a1a; border: 2px solid #007bff; border-radius: 8px; padding: 15px;">
                            <div class="data-controls" style="margin-bottom: 15px;">
                                <button id="${SCRIPT_ID_PREFIX_ACU}-back-to-overview" class="secondary">返回概览</button>
                                <button id="${SCRIPT_ID_PREFIX_ACU}-refresh-data" class="secondary">刷新数据</button>
                                <button id="${SCRIPT_ID_PREFIX_ACU}-export-display-data" class="secondary">导出数据</button>
                                <button id="${SCRIPT_ID_PREFIX_ACU}-close-data-display" class="secondary">关闭</button>
                            </div>
                            <div id="${SCRIPT_ID_PREFIX_ACU}-data-tables-container" style="max-height: 500px; overflow-y: auto; border: 1px solid #444; padding: 10px; background: #2a2a2a; border-radius: 5px;">
                            </div>
                        </div>
                        <div id="${SCRIPT_ID_PREFIX_ACU}-data-overview-area" style="display:none; margin-top:15px;">
                            <div class="overview-controls" style="margin-bottom: 15px;">
                                <button id="${SCRIPT_ID_PREFIX_ACU}-refresh-overview" class="secondary">刷新概览</button>
                                <button id="${SCRIPT_ID_PREFIX_ACU}-close-overview" class="secondary">关闭</button>
                </div>
                            <div id="${SCRIPT_ID_PREFIX_ACU}-overview-container" style="max-height: 600px; overflow-y: auto; border: 1px solid #444; padding: 10px; background: #2a2a2a; border-radius: 5px;">
                                </div>
                            </div>
                        </div>
                        

                <p id="${SCRIPT_ID_PREFIX_ACU}-status-message" class="notes">准备就绪</p>
            </div>`;
        SillyTavern_API_ACU.callGenericPopup(popupHtml, SillyTavern_API_ACU.POPUP_TYPE.DISPLAY, '数据库自动更新工具', {
            wide: true,
            large: true,
            allowVerticalScrolling: true,
            buttons: [],
            callback: function (action, popupJqObj) {
                logDebug_ACU('ACU Popup closed: ' + action);
                $popupInstance_ACU = null;
            },
        });
        setTimeout(async () => {
            const openDlgs = jQuery_API_ACU('dialog[open]');
            let curDlgCnt = null;
            openDlgs.each(function () {
                const f = jQuery_API_ACU(this).find(`#${POPUP_ID_ACU}`);
                if (f.length > 0) {
                    curDlgCnt = f;
                    return false;
                }
            });
            if (!curDlgCnt || curDlgCnt.length === 0) {
                logError_ACU('Cannot find ACU popup DOM');
                showToastr_ACU('error', 'UI初始化失败');
                return;
            }
            $popupInstance_ACU = curDlgCnt;

            $apiConfigSectionToggle_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-api-config-toggle`);
            $apiConfigAreaDiv_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-api-config-area-div`);
            $customApiUrlInput_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-api-url`);
            $customApiKeyInput_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-api-key`);
            $customApiModelSelect_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-api-model`);
            $maxTokensInput_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-max-tokens`);
            $temperatureInput_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-temperature`);
            $loadModelsButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-load-models`);
            $saveApiConfigButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-save-config`);
            $clearApiConfigButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-clear-config`);
            $apiStatusDisplay_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-api-status`);
            $charCardPromptToggle_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-char-card-prompt-toggle`);
            $charCardPromptAreaDiv_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-char-card-prompt-area-div`);
            $charCardPromptSegmentsContainer_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-prompt-segments-container`);
            $saveCharCardPromptButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-save-char-card-prompt`);
            $resetCharCardPromptButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-reset-char-card-prompt`);
            const $loadCharCardPromptFromJsonButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-load-char-card-prompt-from-json`);
            const $advancedConfigToggle_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-advanced-config-toggle`);
            const $advancedConfigArea_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-advanced-config-area-div`);
            $autoUpdateTokenThresholdInput_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-auto-update-token-threshold`);
            $saveAutoUpdateTokenThresholdButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-save-auto-update-token-threshold`);
            $autoUpdateFrequencyInput_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-auto-update-frequency`);
            $saveAutoUpdateFrequencyButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-save-auto-update-frequency`);
            $updateBatchSizeInput_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-update-batch-size`);
            $saveUpdateBatchSizeButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-save-update-batch-size`);
            $autoUpdateEnabledCheckbox_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-auto-update-enabled-checkbox`);
            $manualUpdateCardButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-manual-update-card`);
            $floorRangeStartInput_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-floor-range-start`);
            $floorRangeEndInput_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-floor-range-end`);
            $autoHideMessagesCheckbox_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-auto-hide-messages-checkbox`);
            $statusMessageSpan_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-status-message`);
            $cardUpdateStatusDisplay_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-card-update-status-display`);
            $useMainApiCheckbox_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-use-main-api-checkbox`);
            const $importTemplateButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-import-template`);
            const $exportTemplateButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-export-template`);
            const $resetTemplateButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-reset-template`);
            const $exportJsonDataButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-export-json-data`);
            const $importCombinedSettingsButton = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-import-combined-settings`);
            const $exportCombinedSettingsButton = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-export-combined-settings`);
            const $visualizeTemplateButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-visualize-template`);
            const $showDataOverviewButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-show-data-overview`);
            const $dataDisplayArea_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-data-display-area`);
            const $dataTablesContainer_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-data-tables-container`);
            const $backToOverviewButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-back-to-overview`);
            const $refreshDataButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-refresh-data`);
            const $exportDisplayDataButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-export-display-data`);
            const $closeDataDisplayButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-close-data-display`);
            const $dataOverviewArea_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-data-overview-area`);
            const $overviewContainer_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-overview-container`);
            const $refreshOverviewButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-refresh-overview`);
            const $closeOverviewButton_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-close-overview`);

            const $apiModeRadios = $popupInstance_ACU.find(`input[name="${SCRIPT_ID_PREFIX_ACU}-api-mode"]`);
            const $tavernProfileSelect = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-tavern-api-profile-select`);
            const $refreshTavernProfilesButton = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-refresh-tavern-api-profiles`);
            const $worldbookSourceRadios = $popupInstance_ACU.find(`input[name="${SCRIPT_ID_PREFIX_ACU}-worldbook-source"]`);
            const $refreshWorldbooksButton = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-refresh-worldbooks`);
            const $worldbookSelect = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-worldbook-select`);
            const $worldbookEntryList = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-worldbook-entry-list`);
            const $selectAllButton = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-worldbook-select-all`);
            const $deselectAllButton = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-worldbook-deselect-all`);
            const $saveRemoveTagsButton = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-save-remove-tags`);

            loadSettings_ACU();
            $worldbookSourceRadios.filter(`[value="${settings_ACU.worldbookConfig.source}"]`).prop('checked', true);
            updateWorldbookSourceView_ACU();
            populateInjectionTargetSelector_ACU();

            const $injectionTargetSelect = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-worldbook-injection-target`);
            if ($injectionTargetSelect.length) {
                $injectionTargetSelect.on('change', async function() {
                    const oldTargetSetting = settings_ACU.worldbookConfig.injectionTarget;
                    const newTargetSetting = $(this).val();

                    if (oldTargetSetting === newTargetSetting) return;

                    const getOldLorebookName = async () => {
                        if (oldTargetSetting === 'character') {
                            return await TavernHelper_API_ACU.getCurrentCharPrimaryLorebook();
                        }
                        return oldTargetSetting;
                    };
                    const oldLorebookName = await getOldLorebookName();

                    if (oldLorebookName) {
                        showToastr_ACU('info', `正在从旧目标 [${oldLorebookName}] 中清除条目...`);
                        await deleteAllGeneratedEntries_ACU(oldLorebookName);
                    }

                    settings_ACU.worldbookConfig.injectionTarget = newTargetSetting;
                    saveSettings_ACU();
                    logDebug_ACU(`Injection target changed from "${oldTargetSetting}" to "${newTargetSetting}".`);

                    if (currentJsonTableData_ACU) {
                        showToastr_ACU('info', `正在向新目标注入条目...`);
                        await updateReadableLorebookEntry_ACU(true);
                        showToastr_ACU('success', '数据注入目标已成功切换！');
                    } else {
                        showToastr_ACU('warning', '数据注入目标已更新，但当前无数据可注入。');
                    }
                });
            }

            const $tabButtons = $popupInstance_ACU.find('.acu-tab-button');
            const $tabContents = $popupInstance_ACU.find('.acu-tab-content');
            $tabButtons.on('click', function() {
                const tabId = $(this).data('tab');
                $tabButtons.removeClass('active');
                $(this).addClass('active');
                $tabContents.removeClass('active');
                $popupInstance_ACU.find(`#acu-tab-${tabId}`).addClass('active');
            });
            
            if ($apiModeRadios.length) {
                $apiModeRadios.on('change', function() {
                    const selectedMode = $(this).val();
                    settings_ACU.apiMode = selectedMode;
                    saveSettings_ACU();
                    updateApiModeView_ACU(selectedMode);
                });
            }
            if ($refreshTavernProfilesButton.length) {
                $refreshTavernProfilesButton.on('click', loadTavernApiProfiles_ACU);
            }
            if ($tavernProfileSelect.length) {
                $tavernProfileSelect.on('change', function() {
                    settings_ACU.tavernProfile = $(this).val();
                    saveSettings_ACU();
                });
            }

            if ($worldbookSourceRadios.length) {
                $worldbookSourceRadios.on('change', async function() {
                    settings_ACU.worldbookConfig.source = $(this).val();
                    saveSettings_ACU();
                    await updateWorldbookSourceView_ACU();
                });
            }
            if ($refreshWorldbooksButton.length) {
                $refreshWorldbooksButton.on('click', populateWorldbookList_ACU);
            }
            if ($worldbookSelect.length) {
                $worldbookSelect.on('click', '.qrf_worldbook_list_item', async function() {
                    const $item = $(this);
                    const bookName = $item.data('book-name');
                    let selection = settings_ACU.worldbookConfig.manualSelection || [];

                    if ($item.hasClass('selected')) {
                        selection = selection.filter(name => name !== bookName);
                    } else {
                        selection.push(bookName);
                    }
                    
                    settings_ACU.worldbookConfig.manualSelection = selection;
                    $item.toggleClass('selected');
                    
                    saveSettings_ACU();
                    await populateWorldbookEntryList_ACU();
                });
            }
            if ($worldbookEntryList.length) {
                $worldbookEntryList.on('change', 'input[type="checkbox"]', function() {
                    const $checkbox = $(this);
                    const bookName = $checkbox.data('book');
                    const entryUid = $checkbox.data('uid');
                    if (!settings_ACU.worldbookConfig.enabledEntries[bookName]) {
                        settings_ACU.worldbookConfig.enabledEntries[bookName] = [];
                    }
                    const enabledList = settings_ACU.worldbookConfig.enabledEntries[bookName];
                    const index = enabledList.indexOf(entryUid);

                    if ($checkbox.is(':checked')) {
                        if (index === -1) enabledList.push(entryUid);
                    } else {
                        if (index > -1) enabledList.splice(index, 1);
                    }
                    saveSettings_ACU();
                });
            }

            if ($selectAllButton.length) {
                $selectAllButton.on('click', function() {
                    $worldbookEntryList.find('input[type="checkbox"]:not(:disabled)').prop('checked', true).trigger('change');
                });
            }

            if ($deselectAllButton.length) {
                $deselectAllButton.on('click', function() {
                    $worldbookEntryList.find('input[type="checkbox"]:not(:disabled)').prop('checked', false).trigger('change');
                });
            }

            if ($useMainApiCheckbox_ACU.length) {
                $useMainApiCheckbox_ACU.on('change', function () {
                    settings_ACU.apiConfig.useMainApi = $(this).is(':checked');
                    saveSettings_ACU();
                    updateCustomApiInputsState_ACU();
                    showToastr_ACU('info', `自定义API已切换为 ${settings_ACU.apiConfig.useMainApi ? '使用主API' : '使用独立配置'}`);
                });
            }
            if ($loadModelsButton_ACU.length) $loadModelsButton_ACU.on('click', fetchModelsAndConnect_ACU);
            if ($saveApiConfigButton_ACU.length) $saveApiConfigButton_ACU.on('click', saveApiConfig_ACU);
            if ($clearApiConfigButton_ACU.length) $clearApiConfigButton_ACU.on('click', clearApiConfig_ACU);
            if ($charCardPromptToggle_ACU.length)
                $charCardPromptToggle_ACU.on('click', () => $charCardPromptAreaDiv_ACU.slideToggle());
            if ($saveCharCardPromptButton_ACU.length) $saveCharCardPromptButton_ACU.on('click', saveCustomCharCardPrompt_ACU);
            if ($resetCharCardPromptButton_ACU.length)
                $resetCharCardPromptButton_ACU.on('click', resetDefaultCharCardPrompt_ACU);
            if ($loadCharCardPromptFromJsonButton_ACU.length) $loadCharCardPromptFromJsonButton_ACU.on('click', loadCharCardPromptFromJson_ACU);
            
            $popupInstance_ACU.on('click', `.${SCRIPT_ID_PREFIX_ACU}-add-prompt-segment-btn`, function() {
                const position = $(this).data('position');
                const newSegment = { role: 'USER', content: '', deletable: true };
                let segments = getCharCardPromptFromUI_ACU();
                if (position === 'top') {
                    segments.unshift(newSegment);
                } else {
                    segments.push(newSegment);
                }
                renderPromptSegments_ACU(segments);
            });

            $popupInstance_ACU.on('click', '.prompt-segment-delete-btn', function() {
                const indexToDelete = $(this).data('index');
                let segments = getCharCardPromptFromUI_ACU();
                segments.splice(indexToDelete, 1);
                renderPromptSegments_ACU(segments);
            });

            if ($saveAutoUpdateFrequencyButton_ACU.length)
                $saveAutoUpdateFrequencyButton_ACU.on('click', saveAutoUpdateFrequency_ACU);
            if ($saveAutoUpdateTokenThresholdButton_ACU.length)
                $saveAutoUpdateTokenThresholdButton_ACU.on('click', saveAutoUpdateTokenThreshold_ACU);
            if ($saveUpdateBatchSizeButton_ACU.length)
                $saveUpdateBatchSizeButton_ACU.on('click', saveUpdateBatchSize_ACU);
            if ($saveRemoveTagsButton.length) {
                $saveRemoveTagsButton.on('click', saveRemoveTags_ACU);
            }
            if ($autoUpdateEnabledCheckbox_ACU.length) {
                $autoUpdateEnabledCheckbox_ACU.on('change', function () {
                    settings_ACU.autoUpdateEnabled = jQuery_API_ACU(this).is(':checked');
                    saveSettings_ACU();
                    logDebug_ACU('数据库自动更新启用状态已保存:', settings_ACU.autoUpdateEnabled);
                    showToastr_ACU('info', `数据库自动更新已 ${settings_ACU.autoUpdateEnabled ? '启用' : '禁用'}`);
                });
            }
            if ($manualUpdateCardButton_ACU.length) $manualUpdateCardButton_ACU.on('click', handleManualUpdateCard_ACU);
            if ($importTemplateButton_ACU.length) $importTemplateButton_ACU.on('click', importTableTemplate_ACU);
            if ($exportTemplateButton_ACU.length) $exportTemplateButton_ACU.on('click', exportTableTemplate_ACU);
            if ($resetTemplateButton_ACU.length) $resetTemplateButton_ACU.on('click', resetTableTemplate_ACU);
            if ($exportJsonDataButton_ACU.length) $exportJsonDataButton_ACU.on('click', exportCurrentJsonData_ACU);
            if ($importCombinedSettingsButton.length) $importCombinedSettingsButton.on('click', importCombinedSettings_ACU);
            if ($exportCombinedSettingsButton.length) $exportCombinedSettingsButton.on('click', exportCombinedSettings_ACU);
            if ($visualizeTemplateButton_ACU.length) {
                $visualizeTemplateButton_ACU.on('click', function() {
                    const $visualizationArea = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-template-visualization-area`);
                    const $textarea = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-template-visualization-textarea`);
                    if ($visualizationArea.is(':visible')) {
                        $visualizationArea.slideUp();
                    } else {
                        try {
                            const formattedTemplate = JSON.stringify(JSON.parse(TABLE_TEMPLATE_ACU), null, 2);
                            $textarea.val(formattedTemplate);
                        } catch (e) {
                            $textarea.val('无法解析当前模板，格式可能无效。');
                        }
                        $visualizationArea.slideDown();
                    }
                });
            }

            if ($showDataOverviewButton_ACU.length) {
                $showDataOverviewButton_ACU.on('click', function() {
                    if ($dataOverviewArea_ACU.is(':visible')) {
                        $dataOverviewArea_ACU.slideUp();
                    } else {
                        showDataOverview_ACU();
                        $dataOverviewArea_ACU.slideDown();
                    }
                });
            }

            if ($backToOverviewButton_ACU.length) {
                $backToOverviewButton_ACU.on('click', function() {
                    $dataDisplayArea_ACU.slideUp();
                    showDataOverview_ACU();
                    $dataOverviewArea_ACU.slideDown();
                });
            }

            if ($refreshDataButton_ACU.length) {
                $refreshDataButton_ACU.on('click', function() {
                    displayAllData_ACU();
                });
            }

            if ($exportDisplayDataButton_ACU.length) {
                $exportDisplayDataButton_ACU.on('click', function() {
                    exportDisplayData_ACU();
                });
            }

            if ($closeDataDisplayButton_ACU.length) {
                $closeDataDisplayButton_ACU.on('click', function() {
                    $dataDisplayArea_ACU.slideUp();
                });
            }

            if ($refreshOverviewButton_ACU.length) {
                $refreshOverviewButton_ACU.on('click', function() {
                    showDataOverview_ACU();
                });
            }

            if ($closeOverviewButton_ACU.length) {
                $closeOverviewButton_ACU.on('click', function() {
                    $dataOverviewArea_ACU.slideUp();
                });
            }

            if (typeof updateCardUpdateStatusDisplay_ACU === 'function') updateCardUpdateStatusDisplay_ACU();
            showToastr_ACU('success', '数据库更新工具已加载。');
        }, 350);
    }

    // ==================== 主初始化函数 ====================
    function mainInitialize_ACU() {
        console.log('[数据库自动更新器] mainInitialize_ACU 被调用');
        
        if (attemptToLoadCoreApis_ACU()) {
            logDebug_ACU('数据库自动更新器初始化成功！核心 API 已加载');
            showToastr_ACU('success', '数据库自动更新脚本已加载!', '脚本启动');

            addAutoCardMenuItem_ACU();
            loadSettings_ACU(); // 加载设置
            
            // 如果当前有聊天，立即加载表格数据
            if (SillyTavern_API_ACU && SillyTavern_API_ACU.chatId) {
                logDebug_ACU(`ACU: Initializing with current chat on load: ${SillyTavern_API_ACU.chatId}`);
                setTimeout(async () => {
                    currentChatFileIdentifier_ACU = cleanChatName_ACU(SillyTavern_API_ACU.chatId);
                    await loadAllChatMessages_ACU();
                    await loadOrCreateJsonTableFromChatHistory_ACU();
                }, 0);
            } else {
                logWarn_ACU('ACU: Could not get current chat ID on initial load. Waiting for CHAT_CHANGED event.');
            }
            
            // 注册事件监听器
            if (
                SillyTavern_API_ACU &&
                SillyTavern_API_ACU.eventSource &&
                typeof SillyTavern_API_ACU.eventSource.on === 'function' &&
                SillyTavern_API_ACU.eventTypes
            ) {
                SillyTavern_API_ACU.eventSource.on(SillyTavern_API_ACU.eventTypes.CHAT_CHANGED, async chatFileName => {
                    logDebug_ACU(`ACU CHAT_CHANGED event: ${chatFileName}`);
                    // 使用统一的函数来重置脚本状态
                    await resetScriptStateForNewChat_ACU(chatFileName);
                });
                
                if (SillyTavern_API_ACU.eventTypes.GENERATION_ENDED) {
                    SillyTavern_API_ACU.eventSource.on(SillyTavern_API_ACU.eventTypes.GENERATION_ENDED, (message_id) => {
                        logDebug_ACU(`ACU GENERATION_ENDED event for message_id: ${message_id}`);
                        handleNewMessageDebounced_ACU('GENERATION_ENDED');
                    });
                }
                
                // 消息删除和滑动事件处理
                const chatModificationEvents = ['MESSAGE_DELETED', 'MESSAGE_SWIPED'];
                chatModificationEvents.forEach(evName => {
                    if (SillyTavern_API_ACU.eventTypes[evName]) {
                        SillyTavern_API_ACU.eventSource.on(SillyTavern_API_ACU.eventTypes[evName], async (data) => {
                            logDebug_ACU(`ACU ${evName} event detected. Triggering data reload from chat history.`);
                            clearTimeout(newMessageDebounceTimer_ACU);
                            newMessageDebounceTimer_ACU = setTimeout(async () => {
                                // 重新从聊天记录加载数据库，以防数据不同步
                                await loadOrCreateJsonTableFromChatHistory_ACU();
                            }, 500); // 使用防抖处理快速滑动
                        });
                    }
                });
                
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
            if (typeof jsonString !== 'string' || jsonString.trim() === '') {
                logError_ACU('importTableAsJson received invalid input.');
                showToastr_ACU('error', '导入数据失败：输入为空。');
                return false;
            }
            try {
                const newData = JSON.parse(jsonString);
                // 基本验证
                if (newData && newData.mate && Object.keys(newData).some(k => k.startsWith('sheet_'))) {
                    currentJsonTableData_ACU = newData;
                    logDebug_ACU('Successfully imported new table data into memory.');
                    // 导入后，保存并通知UI更新
                    await saveJsonTableToChatHistory_ACU();
                    await updateReadableLorebookEntry_ACU(true);
                    topLevelWindow.AutoCardUpdaterAPI._notifyTableUpdate();
                    return true;
                } else {
                    throw new Error('导入的JSON缺少关键结构 (mate, sheet_*)。');
                }
            } catch (error) {
                logError_ACU('Failed to import table data from JSON:', error);
                showToastr_ACU('error', `导入数据失败: ${error.message}`);
                return false;
            }
        },
        triggerUpdate: async function() {
            logDebug_ACU('External trigger for database update received.');
            if (isAutoUpdatingCard_ACU) {
                showToastr_ACU('info', '已有更新任务在后台进行中。');
                return false;
            }
            isAutoUpdatingCard_ACU = true;
            try {
                // 使用与手动更新相同的逻辑
                await loadAllChatMessages_ACU(); // 保持用于世界书上下文
                const chatHistory = SillyTavern_API_ACU.chat || [];
                // 手动更新：处理所有消息
                let sliceStartIndex = 0;
                // 确保上下文的起始点包含AI回复前的用户发言
                if (sliceStartIndex > 0 &&
                    chatHistory[sliceStartIndex] &&
                    !chatHistory[sliceStartIndex].is_user &&
                    chatHistory[sliceStartIndex - 1] &&
                    chatHistory[sliceStartIndex - 1].is_user) {
                    sliceStartIndex = sliceStartIndex - 1;
                    logDebug_ACU(`Adjusted slice start index to ${sliceStartIndex} to include preceding user message.`);
                }
                const messagesToProcess = chatHistory.slice(sliceStartIndex);
                const success = await proceedWithCardUpdate_ACU(messagesToProcess);
                return success;
            } finally {
                isAutoUpdatingCard_ACU = false;
            }
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

    console.log('[数据库自动更新器] 扩展脚本已加载，等待初始化...');

    // 如果 DOM 已加载，立即初始化；否则等待
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExtension);
    } else {
        setTimeout(initExtension, 500);
    }

})();

