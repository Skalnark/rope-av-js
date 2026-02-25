import { prompt } from './Prompt.js';
import { draw } from './Draw.js';
import i18next from 'i18next';
import Rope from './Rope/Rope.js';
import InsertJourney from './Rope/InsertJourney.js';
import DeleteJourney from './Rope/DeleteJourney.js';
import IndexJourney from './Rope/IndexJourney.js';

const _t = (key, vars = {}) => {
    try {
        return i18next.t(key, vars);
    } catch {
        try {
            return window.i18next?.t(key, vars);
        } catch {
            return null;
        }
    }
};

export default class Manager {
    constructor() {
        if (Manager._instance) return Manager._instance;
        Manager._instance = this;

        this.rope = new Rope();
        this.prompt = prompt;
        this.nextStepButton = document.getElementById('next-step-button');
        this.finishButton = document.getElementById('finish-journey-button');
        this.fastForwardCheckbox = document.getElementById(
            'fast-forward-checkbox',
        );
        this.nextStep = false;
        this.fastForward = true;
        this.direction = 'next';

        this.initListeners();
    }

    async insertText(text, pos) {
        const j = new InsertJourney();
        j.build(text, pos);
        await j.execute();
    }

    async concatenateText(text) {
        const j = new InsertJourney();
        j.build(text, this.rope.length);
        await j.execute();
    }

    async deleteRange(from, to) {
        const j = new DeleteJourney();
        j.build(from, to);
        await j.execute();
    }

    async indexChar(pos) {
        const j = new IndexJourney();
        j.build(pos);
        await j.execute();
    }

    async waitForUser() {
        this.finishButton.disabled = false;
        if (this.fastForward) return this.direction;

        const next = document.getElementById('next-step-button');
        const prev = document.getElementById('prev-step-button');
        next.style.cssText +=
            ';background-color:#4aff50;color:black;font-weight:bold';
        prev.style.cssText +=
            ';background-color:#fb4a3d;color:black;font-weight:bold';

        while (!this.nextStep) {
            await new Promise((r) => setTimeout(r, 100));
        }

        next.style.backgroundColor = '';
        next.style.color = '';
        next.style.fontWeight = '';
        prev.style.backgroundColor = '';
        prev.style.color = '';
        prev.style.fontWeight = '';

        this.nextStep = false;
        return this.direction;
    }

    redrawGraphics() {
        draw.renderTree(this.rope.root);
    }

    initializeTextDemo() {
        const sample = 'Hello, Rope!';
        this.rope.initialize(sample);
        draw.renderTree(this.rope.root);
        this.updateInfoLabels();

        const display = document.getElementById('text-demo-display');
        if (display) display.textContent = this.rope.toString();
    }

    updateInfoLabels() {
        const lenSpan = document.getElementById('rope-info-length');
        const nodesSpan = document.getElementById('rope-info-nodes');
        const heightSpan = document.getElementById('rope-info-height');
        if (lenSpan) lenSpan.textContent = this.rope.length;
        if (nodesSpan) nodesSpan.textContent = this.rope.nodeCount();
        if (heightSpan) heightSpan.textContent = this.rope.height();
    }

    initListeners() {
        this.nextStepButton.addEventListener('click', () => {
            this.direction = 'next';
            this.nextStep = true;
        });

        this.finishButton.addEventListener('click', () => {
            this.fastForward = true;
            this.nextStep = true;
            this.direction = 'next';
        });

        const prevButton = document.getElementById('prev-step-button');
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                this.direction = 'back';
                this.nextStep = true;
            });
        }

        window.addEventListener('journey-finished', () => {
            this.fastForward = !this.fastForwardCheckbox.checked;
            const msg =
                _t('messages.finishedExecution') ?? 'Finished execution.';
            this.prompt.print(msg);
            this.prompt.newLine();
        });

        this.fastForward = !this.fastForwardCheckbox.checked;

        this.fastForwardCheckbox.addEventListener('change', () => {
            this.fastForward = !this.fastForwardCheckbox.checked;
            const msg = this.fastForward
                ? (_t('messages.fastForwardEnabled') ??
                  'Step-by-step will be fast-forwarded.')
                : (_t('messages.fastForwardDisabled') ??
                  'Step-by-step execution is enabled.');
            this.prompt.print(msg);
        });
    }
}

const managerInstance = new Manager();
export { managerInstance };
