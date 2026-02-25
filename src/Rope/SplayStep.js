import Step from '../Step.js';
import { managerInstance } from '../Manager.js';
import draw from '../Draw.js';
import Rope from './Rope.js';

/**
 * SplayStep – Step subclass for all Rope / splay-tree operations.
 *
 * Problem: Journey.execute() re-executes the previous step when the user presses
 * Back, which would break non-idempotent operations (split, concat, etc.).
 *
 * Solution: each step stores a snapshot of the tree taken THE FIRST TIME the step
 * runs (_preSnapshot).  If the action is re-invoked (after Back), it restores the
 * tree from that snapshot before re-applying its transformation, making every step
 * safely idempotent.
 *
 * Usage in each action:
 *   action = async (ctx) => {
 *       thisStep.restoreAndSave(rope, ctx);   // ← always first line
 *       // ... perform tree modifications ...
 *   };
 */
export default class SplayStep extends Step {
    constructor(name) {
        super(name);
        this._preSnapshot = undefined; // tree state before this step's first execution
    }

    /**
     * Restore the rope to the pre-step state (if available) then capture the
     * current state as the authoritative snapshot for this step.
     *
     * Must be called as the very first statement in every step's action.
     *
     * @param {Rope}   rope - the live rope instance
     * @param {object} ctx  - the journey context (receives treeSnapshot for undo)
     */
    restoreAndSave(rope, ctx) {
        if (this._preSnapshot !== undefined) {
            // Re-execution after Back → restore to the known-good pre-step state
            rope.restore(this._preSnapshot);
        }
        this._preSnapshot = Rope.serialize(rope.root);
        ctx.treeSnapshot  = this._preSnapshot; // kept in context so undo() works
    }

    /**
     * Undo this step by restoring the rope to the state captured by restoreAndSave().
     * `context` here is the value returned by the step's action (has treeSnapshot set).
     */
    undo(context) {
        if (context && context.treeSnapshot !== undefined) {
            managerInstance.rope.restore(context.treeSnapshot);
        }
        draw.renderTree(managerInstance.rope.root);
    }
}
