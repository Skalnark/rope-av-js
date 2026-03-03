import Journey from '../Journey.js';
import SplayStep from './SplayStep.js';
import { managerInstance } from '../Manager.js';
import draw from '../Draw.js';
import { prompt } from '../Prompt.js';
import Rope from './Rope.js';
import SplayNode from './SplayNode.js';

export default class InsertJourney extends Journey {
    constructor() {
        super('insert-journey');
        this._rightRoot = null;
        this._rightRootSnapshot = null;
    }

    _treeFromSnapshot(snapshot) {
        if (!snapshot) return null;
        const tmp = new Rope();
        tmp.restore(snapshot);
        const root = tmp.root;
        tmp.root = null;
        return root;
    }

    build(text, pos) {
        this.context = { text, pos };

        const rope = managerInstance.rope;
        const t = (key, vars = {}) => {
            try {
                return window.i18next.t(key, vars);
            } catch {
                return null;
            }
        };

        const pseudoCode = `procedure insert(text, pos):
  (L, R) = split(rope, pos)
  N      = buildNodes(text)
  rope   = concat(L, N, R)`;
        prompt.initPseudoCode(pseudoCode);

        const initStep = new SplayStep('init');
        initStep.skip = true;
        initStep.action = async (ctx) => {
            initStep.restoreAndSave(rope, ctx);
            this._rightRoot = null;
            this._rightRootSnapshot = null;
            draw.renderTree(rope.root);
            await prompt.nextLine(1);
            const msg =
                t('messages.insertStart', { text, pos }) ??
                `Inserting "${text}" at position ${pos} of the rope.`;
            await this._print(msg);
            await managerInstance.waitForUser();
            return ctx;
        };
        this.steps.push(initStep);

        const splitStep = new SplayStep('split');
        splitStep.action = async (ctx) => {
            splitStep.restoreAndSave(rope, ctx);

            this._rightRoot = null;
            this._rightRootSnapshot = null;

            await prompt.nextLine(2);
            const clampedPos = Math.min(pos, rope.length);
            const msg =
                t('messages.splitAt', { pos: clampedPos }) ??
                `Splitting the rope at position ${clampedPos}…`;
            await this._print(msg);

            this._rightRoot = rope._splitAt(clampedPos);
            this._rightRootSnapshot = Rope.serialize(this._rightRoot);

            draw.renderTrees([
                { root: rope.root, label: 'L' },
                { root: this._rightRoot, label: 'R' },
            ]);
            const msg2 =
                t('messages.splitDone', {
                    leftLen: rope._sz(rope.root),
                    rightLen: rope._sz(this._rightRoot),
                }) ??
                `Left: ${rope._sz(rope.root)} char(s).  Right: ${rope._sz(this._rightRoot)} char(s).`;
            await this._print(msg2);
            await managerInstance.waitForUser();
            return ctx;
        };
        this.steps.push(splitStep);

        const buildStep = new SplayStep('build');
        buildStep.action = async (ctx) => {
            buildStep.restoreAndSave(rope, ctx);

            await prompt.nextLine(3);
            const msg =
                t('messages.buildNodes', { count: text.length, text }) ??
                `Building ${text.length} new node(s) for "${text}"…`;
            await this._print(msg);

            const nRope = new Rope();
            for (const ch of text) nRope._mergeRight(new SplayNode(ch));
            nRope.rebalance();
            const nRoot = nRope.root;
            nRope.root = null;

            const rightRootDisplay =
                this._rightRoot !== null
                    ? this._rightRoot
                    : this._rightRootSnapshot
                    ? this._treeFromSnapshot(this._rightRootSnapshot)
                    : null;

            draw.renderTrees([
                { root: rope.root, label: 'L' },
                { root: nRoot,     label: 'N' },
                { root: rightRootDisplay, label: 'R' },
            ]);

            const msg2 =
                t('messages.buildNodesDone', { count: text.length }) ??
                `${text.length} node(s) built and appended to the left part.`;
            await this._print(msg2);
            await managerInstance.waitForUser();

            rope._mergeRight(nRoot);
            rope.rebalance();
            return ctx;
        };
        this.steps.push(buildStep);

        const concatStep = new SplayStep('concat');
        concatStep.action = async (ctx) => {
            concatStep.restoreAndSave(rope, ctx);

            if (this._rightRoot === null && this._rightRootSnapshot !== null) {
                this._rightRoot = this._treeFromSnapshot(
                    this._rightRootSnapshot,
                );
            }

            await prompt.nextLine(4);
            await this._print(
                t('messages.concatRight') ??
                    'Concatenating with right partition…',
            );

            rope._mergeRight(this._rightRoot);
            this._rightRoot = null;

            draw.renderTree(rope.root);
            const finalMsg =
                t('messages.insertDone', { result: rope.toString() }) ??
                `Insertion complete.  Rope is now "${rope.toString()}".`;
            await this._print(finalMsg);
            await managerInstance.waitForUser();
            window.dispatchEvent(new Event('journey-finished'));
            return ctx;
        };
        this.steps.push(concatStep);
    }
}
