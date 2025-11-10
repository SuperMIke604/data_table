/* global SillyTavern */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { importFromUrl } from './util.js';

const { registerSlashCommand } = SillyTavern.getContext();

// Function to add buttons to the menu
function addButtonsToMenu() {
    // Choose the root container for the extension's main UI
    const buttonContainer = document.getElementById('notebook_wand_container') ?? document.getElementById('extensionsMenu');
    
    // Check if container exists
    if (!buttonContainer) {
        // Retry after a delay if container is not ready
        setTimeout(addButtonsToMenu, 500);
        return;
    }

    // Check if buttons already exist to avoid duplicates
    if (document.getElementById('dataPreviewButton') || document.getElementById('dataManageButton')) {
        return;
    }

    // Create "数据预览" button
    const previewButtonElement = document.createElement('div');
    const previewIconElement = document.createElement('i');
    const previewTextElement = document.createElement('span');
    previewTextElement.textContent = '数据预览';
    previewIconElement.classList.add('fa-solid', 'fa-eye');
    previewButtonElement.id = 'dataPreviewButton';
    previewButtonElement.classList.add('list-group-item', 'flex-container', 'flexGap5', 'interactable');
    previewButtonElement.tabIndex = 0;
    previewButtonElement.appendChild(previewIconElement);
    previewButtonElement.appendChild(previewTextElement);
    buttonContainer.appendChild(previewButtonElement);

    // Create "数据管理" button
    const manageButtonElement = document.createElement('div');
    const manageIconElement = document.createElement('i');
    const manageTextElement = document.createElement('span');
    manageTextElement.textContent = '数据管理';
    manageIconElement.classList.add('fa-solid', 'fa-database');
    manageButtonElement.id = 'dataManageButton';
    manageButtonElement.classList.add('list-group-item', 'flex-container', 'flexGap5', 'interactable');
    manageButtonElement.tabIndex = 0;
    manageButtonElement.appendChild(manageIconElement);
    manageButtonElement.appendChild(manageTextElement);
    buttonContainer.appendChild(manageButtonElement);

    // Setup event listeners
    setupButtonListeners(previewButtonElement, manageButtonElement);
}

// Store button elements for later use
let previewButtonElement = null;
let manageButtonElement = null;

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
function setupButtonListeners(previewBtn, manageBtn) {
    previewButtonElement = previewBtn;
    manageButtonElement = manageBtn;

    // Add click event listener for "数据预览" button
    previewBtn.addEventListener('click', async () => {
        const alreadyVisible = rootContainer.classList.contains('flex');
        await animateNotebookPanel(alreadyVisible);
    });

    // Add click event listener for "数据管理" button
    manageBtn.addEventListener('click', async () => {
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
            const btn = document.getElementById('dataPreviewButton');
            if (btn) btn.click();
        }, ['dp'], 'Toggle the data preview display.');
        registerSlashCommand('data-manage', () => {
            const btn = document.getElementById('dataManageButton');
            if (btn) btn.click();
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
