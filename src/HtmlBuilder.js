import { Util } from './Util.js';
import { managerInstance } from './Manager.js';
import { prompt } from './Prompt.js';
import { draw } from './Draw.js';

class HtmlBuilder {
    constructor() {
        this.prompt = prompt;
        this.jm = managerInstance;
        this.loadSimulatorTab();
        this.initListeners();
    }

    loadSimulatorTab() {
        const simBtn = document.getElementById('simulator-tab');
        const aboutBtn = document.getElementById('about-tab');
        const demoBtn = document.getElementById('text-demo-tab');
        const simEl = document.getElementById('app');
        const aboutEl = document.getElementById('about');
        const demoEl = document.getElementById('text-demo');

        const showOnly = (el) => {
            [simEl, aboutEl, demoEl].forEach((e) => {
                if (e) e.style.display = 'none';
            });
            [simBtn, aboutBtn, demoBtn].forEach((b) => {
                if (b) b.classList.remove('active');
            });
            if (el) el.style.display = 'flex';
        };

        if (simBtn)
            simBtn.addEventListener('click', () => {
                showOnly(simEl);
                simBtn.classList.add('active');
            });
        if (aboutBtn)
            aboutBtn.addEventListener('click', () => {
                showOnly(aboutEl);
                aboutBtn.classList.add('active');
            });
        if (demoBtn)
            demoBtn.addEventListener('click', () => {
                showOnly(demoEl);
                demoBtn.classList.add('active');
                managerInstance.initializeTextDemo();
            });

        if (simBtn) simBtn.click();
    }

    setInfoLabels() {
        managerInstance.updateInfoLabels();
    }

    initListeners() {
        this.initOperationListeners();
        this.initJourneyListeners();
        this.initClearListeners();
        this.setInfoLabels();
    }

    initOperationListeners() {
        const insertBtn = document.getElementById('insert-submit');
        if (insertBtn) {
            insertBtn.addEventListener('click', async () => {
                const textEl = document.getElementById('insert-text-input');
                const posEl = document.getElementById('insert-pos-input');
                const text = textEl?.value?.trim();
                const pos = parseInt(posEl?.value ?? '0', 10);
                if (!text) return;
                const clampedPos = Math.max(
                    0,
                    Math.min(isNaN(pos) ? 0 : pos, managerInstance.rope.length),
                );
                await managerInstance.insertText(text, clampedPos);
            });
        }

        const concatBtn = document.getElementById('concat-submit');
        if (concatBtn) {
            concatBtn.addEventListener('click', async () => {
                const textEl = document.getElementById('concat-text-input');
                const text = textEl?.value?.trim();
                if (!text) return;
                await managerInstance.concatenateText(text);
            });
        }

        const deleteBtn = document.getElementById('delete-submit');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                const fromEl = document.getElementById('delete-from-input');
                const toEl = document.getElementById('delete-to-input');
                const from = parseInt(fromEl?.value ?? '0', 10);
                const to = parseInt(toEl?.value ?? '0', 10);
                if (isNaN(from) || isNaN(to) || from >= to) {
                    try {
                        prompt.print(
                            window.i18next?.t('messages.invalidDeleteRange') ??
                                'Invalid range: "from" must be less than "to".',
                        );
                    } catch {
                        prompt.print('Invalid range.');
                    }
                    return;
                }
                await managerInstance.deleteRange(from, to);
            });
        }

        const indexBtn = document.getElementById('index-submit');
        if (indexBtn) {
            indexBtn.addEventListener('click', async () => {
                const posEl = document.getElementById('index-pos-input');
                const pos = parseInt(posEl?.value ?? '0', 10);
                await managerInstance.indexChar(isNaN(pos) ? 0 : pos);
            });
        }

        const clearBtn = document.getElementById('clear-submit');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                managerInstance.rope.clear();
                draw.renderTree(null);
                this.setInfoLabels();
                try {
                    prompt.print(
                        window.i18next?.t('messages.ropeCleared') ??
                            'Rope cleared.',
                    );
                } catch {
                    prompt.print('Rope cleared.');
                }
            });
        }

        const scrollBtn = document.getElementById('scroll-button');
        if (scrollBtn) {
            scrollBtn.addEventListener('click', () =>
                Util.scrollToPromptTextarea(),
            );
        }

        const leafSizeInput = document.getElementById('leaf-size-input');
        if (leafSizeInput) {
            leafSizeInput.addEventListener('change', () => {
                const v = parseInt(leafSizeInput.value, 10);
                if (!isNaN(v) && v >= 1) {
                    const Rope = managerInstance.rope.constructor;
                    Rope.MAX_LEAF_SIZE = v;
                }
            });
        }
    }

    initClearListeners() {
        const initTextEl = document.getElementById('init-text-input');
        const initBtn = document.getElementById('init-submit');
        if (initBtn) {
            initBtn.addEventListener('click', () => {
                const leafSizeEl = document.getElementById('leaf-size-input');
                if (leafSizeEl) {
                    const v = parseInt(leafSizeEl.value, 10);
                    if (!isNaN(v) && v >= 1)
                        managerInstance.rope.constructor.MAX_LEAF_SIZE = v;
                }
                const text = initTextEl?.value ?? '';
                managerInstance.rope.initialize(text);
                draw.renderTree(managerInstance.rope.root);
                this.setInfoLabels();
                try {
                    prompt.print(
                        window.i18next?.t('messages.ropeInitialized', {
                            text,
                        }) ?? `Rope initialized with "${text}".`,
                    );
                } catch {
                    prompt.print(`Rope initialized with "${text}".`);
                }
            });
        }
    }

    initJourneyListeners() {
        window.addEventListener('journey-started', () => {
            this.disableInputs();
            Util.scrollToElementById('prompt-simulator');
        });

        window.addEventListener('journey-finished', () => {
            this.enableInputs();
            this.setInfoLabels();
            this.prompt.newLine();
            const demoDisplay = document.getElementById('text-demo-display');
            if (demoDisplay)
                demoDisplay.textContent = managerInstance.rope.toString();
        });

        const scrollBtn = document.getElementById('scroll-button');
        window.addEventListener('element-out-of-view', () => {
            if (scrollBtn) scrollBtn.style.display = 'block';
        });
    }

    disableInputs() {
        const ids = [
            'insert-text-input',
            'insert-pos-input',
            'insert-submit',
            'concat-text-input',
            'concat-submit',
            'delete-from-input',
            'delete-to-input',
            'delete-submit',
            'index-pos-input',
            'index-submit',
            'clear-submit',
            'init-text-input',
            'init-submit',
            'fast-forward-checkbox',
            'finish-journey-button',
        ];
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.disabled = true;
        });
    }

    enableInputs() {
        const ids = [
            'insert-text-input',
            'insert-pos-input',
            'insert-submit',
            'concat-text-input',
            'concat-submit',
            'delete-from-input',
            'delete-to-input',
            'delete-submit',
            'index-pos-input',
            'index-submit',
            'clear-submit',
            'init-text-input',
            'init-submit',
            'fast-forward-checkbox',
        ];
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
        });
    }
}

export default HtmlBuilder;
