/* global SillyTavern */
/* global jQuery */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { importFromUrl } from './util.js';

const { registerSlashCommand } = SillyTavern.getContext();

// Constants
const MENU_ITEM_CONTAINER_ID = 'notebook-extensions-menu-container';
const PREVIEW_BUTTON_ID = 'notebook-preview-button';
const MANAGE_BUTTON_ID = 'notebook-manage-button';

// Function to get jQuery and parent document
function getJQueryAndParentDoc() {
    const parentWin = typeof window.parent !== 'undefined' ? window.parent : window;
    const $ = typeof jQuery !== 'undefined' ? jQuery : parentWin.jQuery;
    const parentDoc = SillyTavern?.Chat?.document
        ? SillyTavern.Chat.document
        : (window.parent || window).document;
    return { $, parentDoc };
}

// Function to add buttons to the menu
function addButtonsToMenu() {
    const { $, parentDoc } = getJQueryAndParentDoc();
    
    if (!$ || !parentDoc) {
        console.error('Notebook: Cannot find jQuery or parent document.');
        setTimeout(addButtonsToMenu, 500);
        return false;
    }

    const extensionsMenu = $('#extensionsMenu', parentDoc);
    if (!extensionsMenu.length) {
        setTimeout(addButtonsToMenu, 2000);
        return false;
    }

    // Check if container already exists
    let $menuItemContainer = $(`#${MENU_ITEM_CONTAINER_ID}`, extensionsMenu);
    
    if ($menuItemContainer.length > 0) {
        // Container exists, check if buttons exist
        const $previewBtn = $menuItemContainer.find(`#${PREVIEW_BUTTON_ID}`);
        const $manageBtn = $menuItemContainer.find(`#${MANAGE_BUTTON_ID}`);
        
        if ($previewBtn.length === 0 || $manageBtn.length === 0) {
            // Buttons missing, recreate them
            $menuItemContainer.empty();
            createButtons($menuItemContainer);
        } else {
            // Rebind events
            setupButtonListeners($previewBtn, $manageBtn);
        }
        return true;
    }

    // Create new container
    $menuItemContainer = $(
        `<div class="extension_container interactable" id="${MENU_ITEM_CONTAINER_ID}" tabindex="0"></div>`
    );
    
    createButtons($menuItemContainer);
    extensionsMenu.append($menuItemContainer);
    
    console.log('Notebook: Menu items added.');
    return true;
}

// Function to create buttons
function createButtons($container) {
    const { $ } = getJQueryAndParentDoc();
    
    // Create "数据预览" button
    const previewButtonHTML = `<div class="list-group-item flex-container flexGap5 interactable" id="${PREVIEW_BUTTON_ID}" title="数据预览"><div class="fa-fw fa-solid fa-eye extensionsMenuExtensionButton"></div><span>数据预览</span></div>`;
    const $previewButton = $(previewButtonHTML);
    $container.append($previewButton);

    // Create "数据管理" button
    const manageButtonHTML = `<div class="list-group-item flex-container flexGap5 interactable" id="${MANAGE_BUTTON_ID}" title="数据管理"><div class="fa-fw fa-solid fa-database extensionsMenuExtensionButton"></div><span>数据管理</span></div>`;
    const $manageButton = $(manageButtonHTML);
    $container.append($manageButton);

    // Setup event listeners
    setupButtonListeners($previewButton, $manageButton);
}

// Store button elements for later use
let $previewButtonElement = null;
let $manageButtonElement = null;

// Setup root container for the panel
const rootElement = document.getElementById('movingDivs');
const rootContainer = document.createElement('div');
if (rootElement) {
    rootElement.appendChild(rootContainer);
}
rootContainer.id = 'notebookPanel';
rootContainer.classList.add('drawer-content', 'flexGap5');

async function getAnimationSettings() {
    const animation_duration = await importFromUrl('/script.js', 'animation_duration', 125);
    const animation_easing = await importFromUrl('/script.js', 'animation_easing', 'ease-in-out');
    return { animation_duration, animation_easing };
}

async function animateNotebookPanel(alreadyVisible) {
    const { animation_duration, animation_easing } = await getAnimationSettings();

    const keyframes = [
        { opacity: alreadyVisible ? 1 : 0 },
        { opacity: alreadyVisible ? 0 : 1 },
    ];
    const options = {
        duration: animation_duration,
        easing: animation_easing,
    };

    const animation = rootContainer.animate(keyframes, options);

    if (alreadyVisible) {
        await animation.finished;
        rootContainer.classList.toggle('flex');
    } else {
        rootContainer.classList.toggle('flex');
        await animation.finished;
    }
}

// Function to setup button event listeners
function setupButtonListeners($previewBtn, $manageBtn) {
    const { $, parentDoc } = getJQueryAndParentDoc();
    
    $previewButtonElement = $previewBtn;
    $manageButtonElement = $manageBtn;

    // Remove existing event listeners to avoid duplicates
    $previewBtn.off('click.notebook');
    $manageBtn.off('click.notebook');

    // Add click event listener for "数据预览" button
    $previewBtn.on('click.notebook', async function(e) {
        e.stopPropagation();
        const exMenuBtn = $('#extensionsMenuButton', parentDoc);
        const extensionsMenu = $('#extensionsMenu', parentDoc);
        if (exMenuBtn.length && extensionsMenu.is(':visible')) {
            exMenuBtn.trigger('click');
            await new Promise(r => setTimeout(r, 150));
        }
        const alreadyVisible = rootContainer.classList.contains('flex');
        await animateNotebookPanel(alreadyVisible);
    });

    // Add click event listener for "数据管理" button
    $manageBtn.on('click.notebook', async function(e) {
        e.stopPropagation();
        const exMenuBtn = $('#extensionsMenuButton', parentDoc);
        const extensionsMenu = $('#extensionsMenu', parentDoc);
        if (exMenuBtn.length && extensionsMenu.is(':visible')) {
            exMenuBtn.trigger('click');
            await new Promise(r => setTimeout(r, 150));
        }
        const alreadyVisible = rootContainer.classList.contains('flex');
        await animateNotebookPanel(alreadyVisible);
    });
}

async function closePanel() {
    await animateNotebookPanel(true);
}

const root = ReactDOM.createRoot(rootContainer);
root.render(
    <React.StrictMode>
        <App onCloseClicked={closePanel} />
    </React.StrictMode>
);

// Initialize buttons
addButtonsToMenu();

// Register slash commands after a delay to ensure buttons are created
setTimeout(() => {
    try {
        registerSlashCommand('data-preview', () => {
            const { $, parentDoc } = getJQueryAndParentDoc();
            const $btn = $(`#${PREVIEW_BUTTON_ID}`, parentDoc);
            if ($btn.length) $btn.trigger('click');
        }, ['dp'], 'Toggle the data preview display.');
        registerSlashCommand('data-manage', () => {
            const { $, parentDoc } = getJQueryAndParentDoc();
            const $btn = $(`#${MANAGE_BUTTON_ID}`, parentDoc);
            if ($btn.length) $btn.trigger('click');
        }, ['dm'], 'Toggle the data management display.');
    } catch (err) {
        console.error('Failed to register commands', err);
    }
}, 1000);

// intercepts clipboard plaintext to remove duplicate newlines caused by usage of <p> for each line
document.addEventListener('copy', e => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (range.commonAncestorContainer.classList?.contains('ql-editor')) {
            e.preventDefault();
            e.clipboardData.setData('text/plain', selection.toString().replace(/\n\n/g, '\n'));
            // clipboard HTML is passed through unaltered; a temporary element is needed to accomplish this
            const temp = document.createElement('div');
            temp.appendChild(range.cloneContents());
            e.clipboardData.setData('text/html', temp.innerHTML);
        }
    }
});
