import Step from '../Step.js';
import { managerInstance } from '../Manager.js';
import draw from '../Draw.js';
import Rope from './Rope.js';

export default class SplayStep extends Step {
    constructor(name) {
        super(name);
        this._preSnapshot = undefined;
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
            rope.restore(this._preSnapshot);
        }
        this._preSnapshot = Rope.serialize(rope.root);
        ctx.treeSnapshot  = this._preSnapshot;
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
