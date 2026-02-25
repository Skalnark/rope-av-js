import Journey from '../Journey.js';
import SplayStep from './SplayStep.js';
import { managerInstance } from '../Manager.js';
import draw from '../Draw.js';
import { prompt } from '../Prompt.js';
import Rope from './Rope.js';

/*
 * IndexJourney
 *
 * Visualises finding the character at position `pos` using the splay tree.
 * After the lookup the accessed node is splayed to the root (amortised O(log n)).
 *
 * Visual pseudocode:
 *   procedure index(pos):
 *     node = findKth(rope, pos)
 *     splay(node) to root
 *     return root.value
 *
 * Design notes:
 *  - findStep is read-only; restoreAndSave is still called for consistent
 *    undo behaviour even though find is non-destructive.
 *  - splayStep calls restoreAndSave to restore the pre-splay tree, then
 *    re-traverses to find the target node in the fresh tree before splaying.
 */
export default class IndexJourney extends Journey {
    constructor() {
        super('index-journey');
        this._targetNode = null;
        this._pathNodes  = null;
    }

    /** Find the leaf node at character position k using the Rope traversal rules. */
    _findKthNode(root, k) {
        const sz = (n) => n ? n.size : 0;
        let node = root;
        while (node) {
            const ls = sz(node.left);
            if (k < ls) {
                node = node.left;
            } else {
                k -= ls;
                if (node.value !== null) { // leaf node
                    if (k === 0) return node;
                    k -= 1; // skip past this leaf's character
                }
                // internal node contributes 0 characters; just go right
                node = node.right;
            }
        }
        return null;
    }

    build(pos) {
        this.context = { pos };

        const rope = managerInstance.rope;
        const t    = (key, vars = {}) => {
            try { return window.i18next.t(key, vars); } catch { return null; }
        };

        const pseudoCode =
`procedure index(pos):
  node = findKth(rope, pos)
  splay(node) to root
  return root.value`;
        prompt.initPseudoCode(pseudoCode);

        /* ── Step 0: introduction ─────────────────────────────────────────── */
        const initStep  = new SplayStep('init');
        initStep.skip   = true;
        initStep.action = async (ctx) => {
            initStep.restoreAndSave(rope, ctx);
            this._targetNode = null;
            this._pathNodes  = null;
            draw.renderTree(rope.root);
            await prompt.nextLine(1);

            if (pos < 0 || pos >= rope.length) {
                const errMsg = t('messages.indexOutOfBounds', { pos, length: rope.length })
                            ?? `Position ${pos} is out of bounds (length = ${rope.length}).`;
                await this._print(errMsg);
                window.dispatchEvent(new Event('journey-finished'));
                return ctx;
            }

            const msg = t('messages.indexStart', { pos })
                     ?? `Finding the character at position ${pos} in the rope…`;
            await this._print(msg);
            await managerInstance.waitForUser();
            return ctx;
        };
        this.steps.push(initStep);

        /* ── Step 1: traverse – find node at pos, highlight path ─────────── */
        const findStep  = new SplayStep('find');
        findStep.action = async (ctx) => {
            // findStep is read-only; restoreAndSave captures consistent snapshot.
            findStep.restoreAndSave(rope, ctx);

            await prompt.nextLine(2);

            // Collect traversal path (no tree modification).
            // Uses the same leaf/internal traversal rules as Rope._findKth.
            const path = [];
            let node = rope.root;
            let k    = pos;
            while (node) {
                path.push(node);
                const ls = rope._sz(node.left);
                if (k < ls) {
                    node = node.left;
                } else {
                    k -= ls;
                    if (node.value !== null) { // leaf
                        if (k === 0) break;    // found the target leaf
                        k -= 1;                // skip past this leaf's character
                    }
                    node = node.right;
                }
            }

            this._targetNode = path[path.length - 1] ?? null;
            this._pathNodes  = new Set(path);

            draw.renderTree(rope.root, this._pathNodes);

            const msg = t('messages.findPath', { pos, steps: path.length })
                     ?? `Traversed ${path.length} node(s) to reach position ${pos}.`;
            await this._print(msg);
            const foundMsg = t('messages.foundChar', { char: this._targetNode?.value, pos })
                          ?? `Found character '${this._targetNode?.value}' at position ${pos}.`;
            await this._print(foundMsg);
            await managerInstance.waitForUser();
            return ctx;
        };
        this.steps.push(findStep);

        /* ── Step 2: splay to root ───────────────────────────────────────── */
        const splayStep  = new SplayStep('splay');
        splayStep.action = async (ctx) => {
            // Restore to pre-splay state (same as initial since findStep is read-only).
            splayStep.restoreAndSave(rope, ctx);

            // Re-traverse in the (possibly restored) tree to get a fresh node ref.
            this._targetNode = this._findKthNode(rope.root, pos);
            this._pathNodes  = this._targetNode ? new Set([this._targetNode]) : new Set();

            await prompt.nextLine(3);
            const charVal = this._targetNode?.value ?? '?';
            const msg = t('messages.splayNode', { char: charVal })
                     ?? `Splaying node '${charVal}' to the root…`;
            await this._print(msg);

            if (this._targetNode) {
                rope._splay(this._targetNode);
                draw.renderTree(rope.root, new Set([rope.root]));
            }

            const msg2 = t('messages.splayDone') ?? 'Splay complete. The accessed node is now the root.';
            await this._print(msg2);
            await managerInstance.waitForUser();
            return ctx;
        };
        this.steps.push(splayStep);

        /* ── Step 3: show result ─────────────────────────────────────────── */
        const resultStep  = new SplayStep('result');
        resultStep.skip   = true;
        resultStep.action = async (ctx) => {
            resultStep.restoreAndSave(rope, ctx);
            await prompt.nextLine(4);

            const value     = rope.root ? rope.root.value : null;
            const resultMsg = t('messages.indexResult', { pos, char: value })
                           ?? `rope[${pos}] = '${value}'.`;
            await this._print(resultMsg);
            draw.renderTree(rope.root, rope.root ? new Set([rope.root]) : new Set());
            await managerInstance.waitForUser();
            window.dispatchEvent(new Event('journey-finished'));
            return ctx;
        };
        this.steps.push(resultStep);
    }
}