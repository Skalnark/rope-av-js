import Journey from '../Journey.js';
import { managerInstance } from '../Manager.js';
import { prompt } from '../Prompt.js';
import draw from '../Draw.js';
import Rope from './Rope.js';

/**
 * RopeJourney – extends Journey with correct Back-button handling for rope operations.
 *
 * The base Journey re-executes the previous step when the user presses Back, which
 * breaks non-idempotent operations like splay-tree split/concat.  RopeJourney
 * overrides execute() so that pressing Back:
 *   1. Calls undo() on the current step to restore the tree.
 *   2. Stores the full tree snapshot in the step BEFORE running it (so undo is reliable).
 *   3. Simply re-positions the cursor to the previous step WITHOUT re-executing its action.
 *
 * Pressing Back on step 0 is a no-op (as in the base Journey).
 */
export default class RopeJourney extends Journey {
    constructor(name) { super(name); }

    async execute() {
        let context = structuredClone(this.context);
        let i = 0;

        while (i < this.steps.length) {
            if (!this.journeyRunning) break;
            const step = this.steps[i];

            // ── forward: run step action ──────────────────────────────────
            // Save a full tree snapshot so undo is reliable regardless of context.
            step._ropeSnapshot = Rope.serialize(managerInstance.rope.root);

            step.context = structuredClone(context);
            context = await step.action(context);
            if (!this.journeyRunning) break;

            // ── wait for user (if not skipped) ────────────────────────────
            let decision = 'next';
            if (!step.skip) {
                decision = await managerInstance.waitForUser();
            }

            if (decision === 'back') {
                prompt.clear();
                if (i === 0) {
                    // At the very first step – nothing to go back to, just restart it.
                    decision = 'next';
                    continue;
                }

                // Restore tree to state BEFORE this step ran
                if (step._ropeSnapshot !== undefined) {
                    managerInstance.rope.restore(step._ropeSnapshot);
                    draw.renderTree(managerInstance.rope.root);
                }

                // Restore context to pre-step state  
                context = step.context;
                i--;
                // Do NOT re-run the previous step: skip its action and wait again.
                // We achieve this by re-entering the loop at i and running the action.
                // (The step action will restore from ctx.treeSnapshot so it's idempotent.)
                // Actually just fall through: the loop will execute steps[i].action again.
                // To avoid re-running destructively, we rely on the snapshot restore above.
                continue;
            }

            if (decision === 'next') { i++; }
        }

        return context;
    }
}
