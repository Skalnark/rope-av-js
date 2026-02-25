import Journey from '../Journey.js';
import { managerInstance } from '../Manager.js';
import { prompt } from '../Prompt.js';
import draw from '../Draw.js';
import Rope from './Rope.js';

export default class RopeJourney extends Journey {
    constructor(name) {
        super(name);
    }

    async execute() {
        let context = structuredClone(this.context);
        let i = 0;

        while (i < this.steps.length) {
            if (!this.journeyRunning) break;
            const step = this.steps[i];

            step._ropeSnapshot = Rope.serialize(managerInstance.rope.root);

            step.context = structuredClone(context);
            context = await step.action(context);
            if (!this.journeyRunning) break;

            let decision = 'next';
            if (!step.skip) {
                decision = await managerInstance.waitForUser();
            }

            if (decision === 'back') {
                prompt.clear();
                if (i === 0) {
                    decision = 'next';
                    continue;
                }

                if (step._ropeSnapshot !== undefined) {
                    managerInstance.rope.restore(step._ropeSnapshot);
                    draw.renderTree(managerInstance.rope.root);
                }

                context = step.context;
                i--;

                continue;
            }

            if (decision === 'next') {
                i++;
            }
        }

        return context;
    }
}
