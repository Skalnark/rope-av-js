import Journey from '../Journey.js';
import SplayStep from './SplayStep.js';
import { managerInstance } from '../Manager.js';
import draw from '../Draw.js';
import { prompt } from '../Prompt.js';
import Rope from './Rope.js';

export default class IndexJourney extends Journey {
    constructor() {
        super('index-journey');
        this._targetNode = null;
        this._targetChar = null;
        this._targetOffset = 0;
        this._pathNodes = null;
    }

    _findKthNode(root, k) {
        const sz = (n) => (n ? n.size : 0);
        let node = root;
        while (node) {
            const ls = sz(node.left);
            if (k < ls) {
                node = node.left;
            } else {
                k -= ls;
                if (node.value !== null) {
                    if (k < node.value.length) return { node, offset: k };
                    k -= node.value.length;
                }
                node = node.right;
            }
        }
        return null;
    }

    build(pos) {
        this.context = { pos };

        const rope = managerInstance.rope;
        const t = (key, vars = {}) => {
            try {
                return window.i18next.t(key, vars);
            } catch {
                return null;
            }
        };

        const pseudoCode = `procedure index(pos):
  node = findKth(rope, pos)
  splay(node) to root
  return root.value`;
        prompt.initPseudoCode(pseudoCode);

        const initStep = new SplayStep('init');
        initStep.skip = true;
        initStep.action = async (ctx) => {
            initStep.restoreAndSave(rope, ctx);
            this._targetNode = null;
            this._targetChar = null;
            this._targetOffset = 0;
            this._pathNodes = null;
            draw.renderTree(rope.root);
            await prompt.nextLine(1);

            if (pos < 0 || pos >= rope.length) {
                const errMsg =
                    t('messages.indexOutOfBounds', {
                        pos,
                        length: rope.length,
                    }) ??
                    `Position ${pos} is out of bounds (length = ${rope.length}).`;
                await this._print(errMsg);
                window.dispatchEvent(new Event('journey-finished'));
                return ctx;
            }

            const msg =
                t('messages.indexStart', { pos }) ??
                `Finding the character at position ${pos} in the rope…`;
            await this._print(msg);
            await managerInstance.waitForUser();
            return ctx;
        };
        this.steps.push(initStep);

        const findStep = new SplayStep('find');
        findStep.action = async (ctx) => {
            findStep.restoreAndSave(rope, ctx);

            await prompt.nextLine(2);

            const path = [];
            let node = rope.root;
            let k = pos;
            let foundOffset = 0;
            while (node) {
                path.push(node);
                const ls = rope._sz(node.left);
                if (k < ls) {
                    node = node.left;
                } else {
                    k -= ls;
                    if (node.value !== null) {
                        if (k < node.value.length) {
                            foundOffset = k;
                            break;
                        }
                        k -= node.value.length;
                    }
                    node = node.right;
                }
            }

            this._targetNode = path[path.length - 1] ?? null;
            this._targetChar = this._targetNode?.value?.[foundOffset] ?? null;
            this._targetOffset = foundOffset;
            this._pathNodes = new Set(path);

            draw.renderTree(rope.root, this._pathNodes);

            const msg =
                t('messages.findPath', { pos, steps: path.length }) ??
                `Traversed ${path.length} node(s) to reach position ${pos}.`;
            await this._print(msg);
            const foundMsg =
                t('messages.foundChar', { char: this._targetChar, pos }) ??
                `Found character '${this._targetChar}' at position ${pos}.`;
            await this._print(foundMsg);
            await managerInstance.waitForUser();
            return ctx;
        };
        this.steps.push(findStep);

        const splayStep = new SplayStep('splay');
        splayStep.action = async (ctx) => {
            splayStep.restoreAndSave(rope, ctx);

            const result = this._findKthNode(rope.root, pos);
            if (result) {
                this._targetNode = result.node;
                this._targetChar = result.node.value[result.offset];
                this._targetOffset = result.offset;
            }
            this._pathNodes = this._targetNode
                ? new Set([this._targetNode])
                : new Set();

            await prompt.nextLine(3);
            const charVal = this._targetChar ?? '?';
            const msg =
                t('messages.splayNode', { char: charVal }) ??
                `Splaying leaf containing '${charVal}' to the root…`;
            await this._print(msg);

            if (this._targetNode) {
                rope._splay(this._targetNode);
                draw.renderTree(rope.root, new Set([rope.root]));
            }

            const msg2 =
                t('messages.splayDone') ??
                'Splay complete. The accessed node is now the root.';
            await this._print(msg2);
            await managerInstance.waitForUser();
            return ctx;
        };
        this.steps.push(splayStep);

        const resultStep = new SplayStep('result');
        resultStep.skip = true;
        resultStep.action = async (ctx) => {
            resultStep.restoreAndSave(rope, ctx);
            await prompt.nextLine(4);

            const res = this._findKthNode(rope.root, pos);
            const value = res ? res.node.value[res.offset] : null;
            const resultMsg =
                t('messages.indexResult', { pos, char: value }) ??
                `rope[${pos}] = '${value}'.`;
            await this._print(resultMsg);

            if (res) {
                rope._splay(res.node);
                draw.renderTree(rope.root, new Set([rope.root]));
            } else {
                draw.renderTree(rope.root);
            }
            await managerInstance.waitForUser();
            window.dispatchEvent(new Event('journey-finished'));
            return ctx;
        };
        this.steps.push(resultStep);
    }
}
