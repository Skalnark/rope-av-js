import Journey from '../Journey.js';
import SplayStep from './SplayStep.js';
import { managerInstance } from '../Manager.js';
import draw from '../Draw.js';
import { prompt } from '../Prompt.js';
import Rope from './Rope.js';

export default class DeleteJourney extends Journey {
    constructor() {
        super('delete-journey');
        this._restRoot          = null;
        this._restRootSnapshot  = null;
        this._rightRoot         = null;
        this._rightRootSnapshot = null;
        this._deletedRoot       = null;
    }

    _treeFromSnapshot(snapshot) {
        if (!snapshot) return null;
        const tmp = new Rope();
        tmp.restore(snapshot);
        const root = tmp.root;
        tmp.root   = null;
        return root;
    }

    build(from, to) {
        this.context = { from, to };

        const rope = managerInstance.rope;
        const t    = (key, vars = {}) => {
            try { return window.i18next.t(key, vars); } catch { return null; }
        };

        const pseudoCode =
`procedure delete(from, to):
  (L, rest) = split(rope, from)
  (M, R)    = split(rest, to - from)
  discard M
  rope = concat(L, R)`;
        prompt.initPseudoCode(pseudoCode);

        const initStep  = new SplayStep('init');
        initStep.skip   = true;
        initStep.action = async (ctx) => {
            initStep.restoreAndSave(rope, ctx);
            this._restRoot          = null;
            this._restRootSnapshot  = null;
            this._rightRoot         = null;
            this._rightRootSnapshot = null;
            this._deletedRoot       = null;
            draw.renderTree(rope.root);
            await prompt.nextLine(1);
            const clampedTo = Math.min(to, rope.length);
            const msg = t('messages.deleteStart', { from, to: clampedTo })
                     ?? `Deleting characters [${from}, ${clampedTo}) from the rope.`;
            await this._print(msg);
            await managerInstance.waitForUser();
            return ctx;
        };
        this.steps.push(initStep);

        const split1  = new SplayStep('split1');
        split1.action = async (ctx) => {
            split1.restoreAndSave(rope, ctx);

            this._restRoot         = null;
            this._restRootSnapshot = null;

            await prompt.nextLine(2);
            const clampedFrom = Math.max(0, Math.min(from, rope.length));
            const msg = t('messages.splitAt', { pos: clampedFrom })
                     ?? `First split at position ${clampedFrom} to isolate the prefix…`;
            await this._print(msg);

            this._restRoot         = rope._splitAt(clampedFrom);
            this._restRootSnapshot = Rope.serialize(this._restRoot);

            draw.renderTree(rope.root);
            const msg2 = t('messages.firstSplitDone', {
                leftLen:  rope._sz(rope.root),
                rightLen: rope._sz(this._restRoot),
            }) ?? `Prefix: ${rope._sz(rope.root)} char(s).  Remaining: ${rope._sz(this._restRoot)} char(s).`;
            await this._print(msg2);
            await managerInstance.waitForUser();
            return ctx;
        };
        this.steps.push(split1);

        const split2  = new SplayStep('split2');
        split2.action = async (ctx) => {
            // Restore rope.root to post-split1 state (prefix only).
            split2.restoreAndSave(rope, ctx);
            // Re-hydrate _restRoot if it was consumed by a previous run.
            if (this._restRoot === null && this._restRootSnapshot !== null) {
                this._restRoot = this._treeFromSnapshot(this._restRootSnapshot);
            }
            // Reset downstream refs.
            this._rightRoot         = null;
            this._rightRootSnapshot = null;
            this._deletedRoot       = null;

            await prompt.nextLine(3);
            const rangeLen = Math.min(to - from, rope._sz(this._restRoot));
            const msg = t('messages.secondSplit', { rangeLen })
                     ?? `Second split: isolating ${rangeLen} character(s) to delete…`;
            await this._print(msg);

            // Use a temporary Rope wrapper to split the rest subtree.
            const tempRope      = new Rope();
            tempRope.root       = this._restRoot;
            this._rightRoot     = tempRope._splitAt(rangeLen);
            this._deletedRoot   = tempRope.root;
            this._restRoot      = null; // consumed
            tempRope.root       = null;

            this._rightRootSnapshot = Rope.serialize(this._rightRoot);

            draw.renderTree(rope.root);
            const msg2 = t('messages.secondSplitDone', {
                deleted:   rope._sz(this._deletedRoot),
                remaining: rope._sz(this._rightRoot),
            }) ?? `To delete: ${rope._sz(this._deletedRoot)} char(s).  Right remainder: ${rope._sz(this._rightRoot)} char(s).`;
            await this._print(msg2);
            await managerInstance.waitForUser();
            return ctx;
        };
        this.steps.push(split2);

        /* ── Step 3: discard middle, concat L + R ─────────────────────────── */
        const mergeStep  = new SplayStep('merge');
        mergeStep.action = async (ctx) => {
            // Restore rope.root to post-split2 state (prefix only).
            mergeStep.restoreAndSave(rope, ctx);
            // Re-hydrate _rightRoot if consumed.
            if (this._rightRoot === null && this._rightRootSnapshot !== null) {
                this._rightRoot = this._treeFromSnapshot(this._rightRootSnapshot);
            }

            await prompt.nextLine(4);
            await this._print(t('messages.discardMiddle') ?? 'Discarding the deleted range…');
            this._deletedRoot = null;

            await prompt.nextLine(5);
            await this._print(t('messages.concatRight') ?? 'Concatenating prefix with right remainder…');

            rope._mergeRight(this._rightRoot);
            this._rightRoot = null; // consumed; snapshot still allows future re-runs

            draw.renderTree(rope.root);
            const finalMsg = t('messages.deleteDone', { result: rope.toString() })
                          ?? `Deletion complete.  Rope is now "${rope.toString()}".`;
            await this._print(finalMsg);
            await managerInstance.waitForUser();
            window.dispatchEvent(new Event('journey-finished'));
            return ctx;
        };
        this.steps.push(mergeStep);
    }
}
