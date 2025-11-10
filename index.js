/* global SillyTavern */

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
                                <input type="number" id="data-manage-floor-start" placeholder="开始楼层" min="1" style="width: 100px;">
                            </div>
                            <div class="data-manage-input-group">
                                <label for="data-manage-floor-end">结束楼层:</label>
                                <input type="number" id="data-manage-floor-end" placeholder="结束楼层" min="1" style="width: 100px;">
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
                                <input type="text" id="data-manage-remove-tags" placeholder="e.g., plot,status">
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
                        <div style="display: flex; gap: 20px; margin-top: 10px;">
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="radio" name="data-manage-api-mode" value="custom" checked>
                                <span>自定义API</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px;">
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
                            <div class="data-manage-button-group" style="margin-top: 15px;">
                                <button id="data-manage-save-api" class="primary">保存API配置</button>
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
                        <label>数据源:</label>
                        <div style="display: flex; gap: 20px; margin-top: 10px;">
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="radio" name="data-manage-worldbook-source" value="auto" checked>
                                <span>自动选择</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="radio" name="data-manage-worldbook-source" value="manual">
                                <span>手动选择</span>
                            </label>
                        </div>
                    </div>
                    <div id="data-manage-worldbook-manual-block" style="display: none; margin-top: 15px;">
                        <label for="data-manage-worldbook-select">选择世界书:</label>
                        <select id="data-manage-worldbook-select"></select>
                        <label for="data-manage-injection-target" style="margin-top: 15px;">注入目标:</label>
                        <select id="data-manage-injection-target">
                            <option value="system">系统提示</option>
                            <option value="user">用户消息</option>
                            <option value="assistant">助手消息</option>
                        </select>
                    </div>
                    <div class="data-manage-button-group" style="margin-top: 15px;">
                        <button id="data-manage-save-worldbook" class="primary">保存世界书配置</button>
                    </div>
                </div>
            </div>
            
            <div id="data-manage-tab-data" class="data-manage-tab-content">
                <div class="data-manage-card">
                    <h3>数据管理</h3>
                    <div class="data-manage-button-group">
                        <button id="data-manage-show-overview" class="primary">显示数据概览</button>
                        <button id="data-manage-refresh-data" class="secondary">刷新数据</button>
                        <button id="data-manage-export-data" class="secondary">导出数据</button>
                    </div>
                    <div id="data-manage-overview-area" style="display: none; margin-top: 20px;">
                        <div class="data-manage-status-display">
                            数据概览内容将显示在这里
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 使用 SillyTavern 的弹窗API
    if (context && context.callGenericPopup) {
        context.callGenericPopup(popupHtml, context.POPUP_TYPE?.DISPLAY || 'display', '数据管理', {
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
}

/**
 * 设置状态Tab的事件监听器
 */
function setupStatusTabListeners(parentDoc) {
    // 更新数据库按钮
    const updateBtn = parentDoc.getElementById('data-manage-update-card');
    if (updateBtn) {
        updateBtn.addEventListener('click', function() {
            console.log('按楼层范围更新数据库');
            alert('更新数据库功能待实现');
        });
    }
    
    // 保存配置按钮
    const saveButtons = [
        'data-manage-save-frequency',
        'data-manage-save-batch-size',
        'data-manage-save-max-entries',
        'data-manage-save-remove-tags',
        'data-manage-save-remove-markers',
        'data-manage-save-user-tags'
    ];
    
    saveButtons.forEach(btnId => {
        const btn = parentDoc.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', function() {
                console.log(`保存配置: ${btnId}`);
                alert('保存配置功能待实现');
            });
        }
    });
}

/**
 * 设置AI指令预设Tab的事件监听器
 */
function setupPromptTabListeners(parentDoc) {
    const saveBtn = parentDoc.getElementById('data-manage-save-prompt');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            console.log('保存AI指令预设');
            alert('保存AI指令预设功能待实现');
        });
    }
    
    const loadBtn = parentDoc.getElementById('data-manage-load-prompt-json');
    if (loadBtn) {
        loadBtn.addEventListener('click', function() {
            console.log('读取JSON模板');
            alert('读取JSON模板功能待实现');
        });
    }
    
    const resetBtn = parentDoc.getElementById('data-manage-reset-prompt');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            console.log('恢复默认');
            alert('恢复默认功能待实现');
        });
    }
    
    // 添加对话轮次按钮
    const addSegmentBtns = parentDoc.querySelectorAll('.data-manage-add-segment-btn');
    addSegmentBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const position = this.getAttribute('data-position');
            console.log(`添加对话轮次: ${position}`);
            alert('添加对话轮次功能待实现');
        });
    });
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
            
            if (mode === 'tavern') {
                if (tavernBlock) tavernBlock.style.display = 'block';
                if (customBlock) customBlock.style.display = 'none';
            } else {
                if (tavernBlock) tavernBlock.style.display = 'none';
                if (customBlock) customBlock.style.display = 'block';
            }
        });
    });
    
    // 保存API配置
    const saveApiBtn = parentDoc.getElementById('data-manage-save-api');
    if (saveApiBtn) {
        saveApiBtn.addEventListener('click', function() {
            console.log('保存API配置');
            alert('保存API配置功能待实现');
        });
    }
    
    // 测试连接
    const testApiBtn = parentDoc.getElementById('data-manage-test-api');
    if (testApiBtn) {
        testApiBtn.addEventListener('click', function() {
            console.log('测试API连接');
            alert('测试API连接功能待实现');
        });
    }
    
    // 刷新酒馆预设
    const refreshBtn = parentDoc.getElementById('data-manage-refresh-tavern');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            console.log('刷新酒馆预设列表');
            alert('刷新预设列表功能待实现');
        });
    }
}

/**
 * 设置世界书Tab的事件监听器
 */
function setupWorldbookTabListeners(parentDoc) {
    // 数据源切换
    const sourceRadios = parentDoc.querySelectorAll('input[name="data-manage-worldbook-source"]');
    sourceRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const source = this.value;
            const manualBlock = parentDoc.getElementById('data-manage-worldbook-manual-block');
            
            if (source === 'manual') {
                if (manualBlock) manualBlock.style.display = 'block';
            } else {
                if (manualBlock) manualBlock.style.display = 'none';
            }
        });
    });
    
    // 保存世界书配置
    const saveBtn = parentDoc.getElementById('data-manage-save-worldbook');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            console.log('保存世界书配置');
            alert('保存世界书配置功能待实现');
        });
    }
}

/**
 * 设置数据管理Tab的事件监听器
 */
function setupDataTabListeners(parentDoc) {
    // 显示数据概览
    const showOverviewBtn = parentDoc.getElementById('data-manage-show-overview');
    if (showOverviewBtn) {
        showOverviewBtn.addEventListener('click', function() {
            const overviewArea = parentDoc.getElementById('data-manage-overview-area');
            if (overviewArea) {
                if (overviewArea.style.display === 'none') {
                    overviewArea.style.display = 'block';
                    console.log('显示数据概览');
                } else {
                    overviewArea.style.display = 'none';
                }
            }
        });
    }
    
    // 刷新数据
    const refreshBtn = parentDoc.getElementById('data-manage-refresh-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            console.log('刷新数据');
            alert('刷新数据功能待实现');
        });
    }
    
    // 导出数据
    const exportBtn = parentDoc.getElementById('data-manage-export-data');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            console.log('导出数据');
            alert('导出数据功能待实现');
        });
    }
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

