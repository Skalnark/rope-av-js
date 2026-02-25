import Step from '../Step.js';
import { managerInstance } from '../Manager.js';
import draw from '../Draw.js';
import Rope from './Rope.js';

export default class SplayStep extends Step {
    constructor(name) {
        super(name);
        this._preSnapshot = undefined;
    }

    restoreAndSave(rope, ctx) {
        if (this._preSnapshot !== undefined) {
            rope.restore(this._preSnapshot);
        }
        this._preSnapshot = Rope.serialize(rope.root);
        ctx.treeSnapshot = this._preSnapshot;
    }

    undo(context) {
        if (context && context.treeSnapshot !== undefined) {
            managerInstance.rope.restore(context.treeSnapshot);
        }
        draw.renderTree(managerInstance.rope.root);
    }
}
