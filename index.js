import HtmlBuilder from './src/HtmlBuilder.js';
import { managerInstance } from './src/Manager.js';
import { Util } from './src/Util.js';
import Prompt from './src/Prompt.js';
import { initializeLocales } from './src/InitializeLocales.js';
import { applyLocales } from './src/ApplyLocales.js';

window.DEBUG = false;

let htmlBuilder;
let prompt;

async function awake() {
    const saved = localStorage.getItem('locale') || 'en';
    await initializeLocales(saved);
    applyLocales(document);
    htmlBuilder = new HtmlBuilder();
    prompt = new Prompt();
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const isLight = savedTheme === 'light';
    if (isLight) document.documentElement.classList.add('theme-light');

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.setAttribute('aria-pressed', isLight ? 'true' : 'false');
        toggle.addEventListener('click', () => {
            const nowLight =
                document.documentElement.classList.toggle('theme-light');
            localStorage.setItem('theme', nowLight ? 'light' : 'dark');
            toggle.setAttribute('aria-pressed', nowLight ? 'true' : 'false');
            try {
                managerInstance.redrawGraphics();
            } catch (e) {}
        });
    }
    if (isLight) {
        try {
            managerInstance.redrawGraphics();
        } catch (e) {}
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    await awake();

    initTheme();

    (function ensureFooter() {
        const footer = document.querySelector('.site-footer');
        if (!footer) return;
        if (footer.parentElement !== document.body) {
            try {
                document.body.appendChild(footer);
            } catch (e) {}
        }
        footer.style.display = 'flex';
        footer.style.visibility = 'visible';
        footer.style.opacity = '1';
        footer.style.pointerEvents = 'auto';
    })();

    const initInput = document.getElementById('init-text-input');
    const startText = initInput ? initInput.value : 'Hello!';
    managerInstance.rope.initialize(startText);
    managerInstance.redrawGraphics();
    htmlBuilder.setInfoLabels();

    greetings();
    let pseudoCode = `// select an operation\nreturn`;
    prompt.initPseudoCode(pseudoCode);
    await prompt.simulatePseudoCode();

    const tabSelect = document.getElementById('tab-select');
    if (tabSelect) {
        tabSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            const idMap = {
                simulator: 'simulator-tab',
                'text-demo': 'text-demo-tab',
                about: 'about-tab',
            };
            const btn = document.getElementById(idMap[val] || val + '-tab');
            if (btn) btn.click();
        });

        document.querySelectorAll('.tab-button').forEach((btn) => {
            btn.addEventListener('click', () => {
                const mapping = {
                    'simulator-tab': 'simulator',
                    'text-demo-tab': 'text-demo',
                    'about-tab': 'about',
                };
                const v = mapping[btn.id];
                if (v) tabSelect.value = v;
            });
        });

        Util.scrollToElementById('main-title');
    }

    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        const current =
            window.i18next && window.i18next.language
                ? window.i18next.language
                : 'en';
        langSelect.value = current;
        langSelect.addEventListener('change', async (e) => {
            const newLang = e.target.value;
            try {
                await window.i18next.changeLanguage(newLang);
            } catch (err) {}
            localStorage.setItem('locale', newLang);
            applyLocales(document);
        });
    }
});

function greetings() {
    try {
        prompt.print(window.i18next.t('ui.greetWelcome'));
        prompt.print(window.i18next.t('ui.greetInsert'));
        prompt.print(window.i18next.t('ui.greetNavigation'));
        prompt.print(window.i18next.t('ui.greetFastForward'));
        prompt.print(window.i18next.t('ui.greetEnjoy'));
    } catch (e) {
        prompt.print('Welcome to the Rope Algorithm Visualizer!');
        prompt.print(
            'Initialize the rope, then use Insert / Delete / Index to explore it.',
        );
        prompt.print("Use 'Next' and 'Back' to step through operations.");
        prompt.print(
            "Uncheck 'Enable step-by-step' or click 'Finish' to fast-forward.",
        );
        prompt.print('Enjoy!');
    }
    prompt.print();
}

window.addEventListener('refreshUI', () => {
    htmlBuilder.setInfoLabels();
    managerInstance.redrawGraphics();
});

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        managerInstance.redrawGraphics();
    }, 150);
});
