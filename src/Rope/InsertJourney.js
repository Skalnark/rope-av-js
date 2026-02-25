import Journey from '../Journey.js';
import SplayStep from './SplayStep.js';
import { managerInstance } from '../Manager.js';
import draw from '../Draw.js';
import { prompt } from '../Prompt.js';
import Rope from './Rope.js';
import SplayNode from './SplayNode.js';

/*
 * InsertJourney
 *
 * Visualises inserting `text` at position `pos` in the rope.
 *
 * Visual pseudocode:
 *   procedure insert(text, pos):
 *     (L, R) = split(rope, pos)
 *     N      = buildNodes(text)
 *     rope   = concat(L, N, R)
 *
 * Design notes:
 *  - Each mutating step calls restoreAndSave() to make it idempotent on Back-button.
 *  - The right-subtree from the split is stored as both a live node ref (_rightRoot)
 *    and a serialised snapshot (_rightRootSnapshot).  If the live ref has been
 *    consumed (merged into rope) on a previous run, concatStep re-hydrates it from
 *    the snapshot before merging again.
 */
export default class InsertJourney extends Journey {
    constructor() {
        super('insert-journey');
        this._rightRoot         = null;
        this._rightRootSnapshot = null;
    }

    /** Deserialise a snapshot into a standalone SplayNode tree (not attached to rope). */
    _treeFromSnapshot(snapshot) {
        if (!snapshot) return null;
        const tmp = new Rope();
        tmp.restore(snapshot);
        const root = tmp.root;
        tmp.root   = null;
        return root;
    }

    build(text, pos) {
        this.context = { text, pos };

        const rope = managerInstance.rope;
        const t    = (key, vars = {}) => {
            try { return window.i18next.t(key, vars); } catch { return null; }
        };

        const pseudoCode =
`procedure insert(text, pos):
  (L, R) = split(rope, pos)
  N      = buildNodes(text)
  rope   = concat(L, N, R)`;
        prompt.initPseudoCode(pseudoCode);

        /* ── Step 0: introduction ─────────────────────────────────────────── */
        const initStep  = new SplayStep('init');
        initStep.skip   = true;
        initStep.action = async (ctx) => {
            initStep.restoreAndSave(rope, ctx);
            this._rightRoot         = null;
            this._rightRootSnapshot = null;
            draw.renderTree(rope.root);
            await prompt.nextLine(1);
            const msg = t('messages.insertStart', { text, pos })
                     ?? `Inserting "${text}" at position ${pos} of the rope.`;
            await this._print(msg);
            await managerInstance.waitForUser();
            return ctx;
        };
        this.steps.push(initStep);

        /* ── Step 1: split at pos ─────────────────────────────────────────── */
        const splitStep  = new SplayStep('split');
        splitStep.action = async (ctx) => {
            // Restore to pre-split state (full rope) then save snapshot.
            splitStep.restoreAndSave(rope, ctx);
            // Derive right root fresh from the (restored) full rope every time.
            this._rightRoot         = null;
            this._rightRootSnapshot = null;

            await prompt.nextLine(2);
            const clampedPos = Math.min(pos, rope.length);
            const msg = t('messages.splitAt', { pos: clampedPos })
                     ?? `Splitting the rope at position ${clampedPos}…`;
            await this._print(msg);

            this._rightRoot         = rope._splitAt(clampedPos);
            this._rightRootSnapshot = Rope.serialize(this._rightRoot);

            draw.renderTree(rope.root);
            const msg2 = t('messages.splitDone', {
                leftLen:  rope._sz(rope.root),
                rightLen: rope._sz(this._rightRoot),
            }) ?? `Left: ${rope._sz(rope.root)} char(s).  Right: ${rope._sz(this._rightRoot)} char(s).`;
            await this._print(msg2);
            await managerInstance.waitForUser();
            return ctx;
        };
        this.steps.push(splitStep);

        /* ── Step 2: build new nodes ─────────────────────────────────────── */
        const buildStep  = new SplayStep('build');
        buildStep.action = async (ctx) => {
            // Restore to post-split state (left part only).
            buildStep.restoreAndSave(rope, ctx);
            // _rightRoot is a detached subtree unaffected by rope.restore().

            await prompt.nextLine(3);
            const msg = t('messages.buildNodes', { count: text.length, text })
                     ?? `Building ${text.length} new node(s) for "${text}"…`;
            await this._print(msg);

            for (const ch of text) rope._mergeRight(new SplayNode(ch));
            rope.rebalance();

            const msg2 = t('messages.buildNodesDone', { count: text.length })
                      ?? `${text.length} node(s) built and appended to the left part.`;
            await this._print(msg2);
            draw.renderTree(rope.root);
            await managerInstance.waitForUser();
            return ctx;
        };
        this.steps.push(buildStep);

        /* ── Step 3: concat with right part ─────────────────────────────── */
        const concatStep  = new SplayStep('concat');
        concatStep.action = async (ctx) => {
            // Restore to post-build state (left + new chars).
            concatStep.restoreAndSave(rope, ctx);

            // If _rightRoot was already consumed (null), re-hydrate from snapshot.
            if (this._rightRoot === null && this._rightRootSnapshot !== null) {
                this._rightRoot = this._treeFromSnapshot(this._rightRootSnapshot);
            }

            await prompt.nextLine(4);
            await this._print(t('messages.concatRight') ?? 'Concatenating with right partition…');

            rope._mergeRight(this._rightRoot);
            this._rightRoot = null; // consumed; snapshot still allows future re-runs

            draw.renderTree(rope.root);
            const finalMsg = t('messages.insertDone', { result: rope.toString() })
                          ?? `Insertion complete.  Rope is now "${rope.toString()}".`;
            await this._print(finalMsg);
            await managerInstance.waitForUser();
            window.dispatchEvent(new Event('journey-finished'));
            return ctx;
        };
        this.steps.push(concatStep);
    }
}
