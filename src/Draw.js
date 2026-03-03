class Draw {
    constructor() {
        this._svgEl = null;
    }

    get svg() {
        if (!this._svgEl) this._svgEl = document.getElementById('rope-svg');
        return this._svgEl;
    }

    _getVar(name, fallback) {
        try {
            const v = getComputedStyle(
                document.documentElement,
            ).getPropertyValue(name);
            if (v && v.trim()) return v.trim();
        } catch (e) {}
        return fallback;
    }

    _el(tag, attrs = {}, text = null) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        if (text !== null) el.textContent = text;
        return el;
    }

    _computeLayout(root) {
        const layout = new Map();
        let counter = 0;
        const dfs = (node, depth) => {
            if (!node) return;
            dfs(node.left, depth + 1);
            layout.set(node, { inOrderPos: counter++, depth });
            dfs(node.right, depth + 1);
        };
        dfs(root, 0);
        return layout;
    }

    _nodeRadius(node, baseR) {
        if (node.value === null) return baseR;
        const charCount = node.value.length;
        const targetFontSize = 12;
        return Math.max(baseR, Math.ceil((charCount * targetFontSize * 0.65 + 10) / 2));
    }

    renderTree(root, highlightNodes = new Set()) {
        if (!this.svg) return;
        while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

        if (!root) {
            this._drawEmpty();
            return;
        }

        const layout = this._computeLayout(root);
        const n = layout.size;
        const maxDepth = Math.max(...[...layout.values()].map((v) => v.depth));

        const W = Math.max(this.svg.clientWidth || 0, 400);
        const minR = 14,
            maxR = 24;
        const baseRadius = Math.min(maxR, Math.max(minR, (W - 60) / (n * 3)));

        layout.forEach((info, node) => {
            info.r = this._nodeRadius(node, baseRadius);
        });

        const maxR2 = Math.max(...[...layout.values()].map((v) => v.r));
        const levelH = Math.max(65, maxR2 * 3.8);
        const H = (maxDepth + 2) * levelH + 50;

        this.svg.setAttribute('height', H);
        this.svg.style.height = H + 'px';

        const margin = maxR2 + 30;
        const span = Math.max(1, n - 1);
        const xOf = (pos) => margin + (pos * (W - 2 * margin)) / span;
        const yOf = (dep) => maxR2 + 20 + dep * levelH;

        layout.forEach(({ inOrderPos, depth, r }, node) => {
            const px = xOf(inOrderPos),
                py = yOf(depth);
            if (node.left) {
                const c = layout.get(node.left);
                if (c)
                    this._drawEdge(
                        px,
                        py,
                        xOf(c.inOrderPos),
                        yOf(c.depth),
                        r,
                        c.r,
                        '#4a9eff',
                    );
            }
            if (node.right) {
                const c = layout.get(node.right);
                if (c)
                    this._drawEdge(
                        px,
                        py,
                        xOf(c.inOrderPos),
                        yOf(c.depth),
                        r,
                        c.r,
                        '#ff8c4a',
                    );
            }
        });

        layout.forEach(({ inOrderPos, depth, r }, node) => {
            this._drawNode(
                node,
                xOf(inOrderPos),
                yOf(depth),
                r,
                highlightNodes.has(node),
            );
        });

        this._drawStringLabel(root, H - 16);
    }

    _drawEdge(x1, y1, x2, y2, r1, r2, color) {
        const dx = x2 - x1,
            dy = y2 - y1;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        this.svg.appendChild(
            this._el('line', {
                x1: x1 + (dx / d) * r1,
                y1: y1 + (dy / d) * r1,
                x2: x2 - (dx / d) * r2,
                y2: y2 - (dy / d) * r2,
                stroke: color,
                'stroke-width': 2,
                opacity: 0.75,
            }),
        );
    }

    _drawNode(node, x, y, r, highlighted) {
        const accent = this._getVar('--accent-color', '#168344');
        const bg = this._getVar('--panel-bg', '#181c1f');
        const fg = this._getVar('--text', '#b6fcd5');
        const isLeaf = node.value !== null;

        if (isLeaf) {
            const display = node.value;
            const fontSize = Math.max(
                10,
                Math.min(
                    Math.round(r * 0.95),
                    Math.floor((2 * r - 10) / (display.length * 0.65)),
                ),
            );
            this.svg.appendChild(
                this._el('circle', {
                    cx: x,
                    cy: y,
                    r,
                    fill: highlighted ? accent : bg,
                    stroke: highlighted ? fg : accent,
                    'stroke-width': highlighted ? 3 : 1.5,
                }),
            );

            const chars = [...display];
            const totalWidth = chars.length * fontSize * 0.65;
            let startX = x - totalWidth / 2 + fontSize * 0.325;
            for (let i = 0; i < chars.length; ++i) {

                this.svg.appendChild(
                    this._el(
                        'text',
                        {
                            x: startX,
                            y,
                            'text-anchor': 'middle',
                            'dominant-baseline': 'central',
                            'font-size': fontSize,
                            'font-family': 'Fira Code, monospace',
                            fill: highlighted ? bg : fg,
                        },
                        chars[i],
                    ),
                );
                // Draw underline for each character (because of whitspaces)
                this.svg.appendChild(
                    this._el('line', {
                        x1: startX - fontSize * 0.28,
                        x2: startX + fontSize * 0.28,
                        y1: y + fontSize * 0.55,
                        y2: y + fontSize * 0.55,
                        stroke: highlighted ? bg : fg,
                        'stroke-width': 1.2,
                    }),
                );
                startX += fontSize * 0.65;
            }
        } else {
            const ri = Math.round(r * 0.82);
            this.svg.appendChild(
                this._el('circle', {
                    cx: x,
                    cy: y,
                    r: ri,
                    fill: 'none',
                    stroke: highlighted ? fg : accent,
                    'stroke-width': highlighted ? 2.5 : 1.5,
                    'stroke-dasharray': '4 3',
                    opacity: 0.7,
                }),
            );
            this.svg.appendChild(
                this._el(
                    'text',
                    {
                        x,
                        y,
                        'text-anchor': 'middle',
                        'dominant-baseline': 'central',
                        'font-size': Math.round(ri * 0.72),
                        'font-family': 'sans-serif',
                        fill: highlighted ? fg : accent,
                        opacity: 0.85,
                    },
                    String(node.size),
                ),
            );
        }

        const weight = node.isLeaf ? 0 : (node.left ? node.left.size : 0);
        this.svg.appendChild(
            this._el(
                'text',
                {
                    x,
                    y: y + r + 11,
                    'text-anchor': 'middle',
                    'font-size': Math.max(9, Math.round(r * 0.55)),
                    'font-family': 'sans-serif',
                    fill: fg,
                    opacity: 0.45,
                },
                node.isLeaf ? '' : 'w=' + weight,
            ),
        );
    }

    renderTrees(trees) {
        if (!this.svg) return;
        while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

        if (!trees || trees.length === 0) { this._drawEmpty(); return; }

        const W = Math.max(this.svg.clientWidth || 0, 400);
        const cols = trees.length;
        const colW = W / cols;

        const LABEL_COLORS = ['#4a9eff', '#5ad15a', '#ff8c4a'];
        const DEFAULT_COLOR = this._getVar('--text', '#b6fcd5');

        const layouts = trees.map(({ root }) =>
            root ? this._computeLayout(root) : new Map(),
        );

        const allDepths = layouts.flatMap(layout =>
            [...layout.values()].map(v => v.depth),
        );
        const overallMaxDepth = allDepths.length > 0 ? Math.max(...allDepths) : 0;

        const minR = 14, maxR = 24;
        const maxNodeCount = Math.max(...layouts.map(l => l.size), 1);
        const baseRadius = Math.min(
            maxR,
            Math.max(minR, (colW - 40) / (maxNodeCount * 3)),
        );
        layouts.forEach(layout => {
            layout.forEach((info, node) => { info.r = this._nodeRadius(node, baseRadius); });
        });

        const allRadii = layouts.flatMap(layout => [...layout.values()].map(v => v.r));
        const maxR2 = allRadii.length > 0 ? Math.max(...allRadii) : minR;
        const levelH = Math.max(65, maxR2 * 3.8);

        const LABEL_TOP = 22;
        const TREE_TOP = 50;
        const H = TREE_TOP + (overallMaxDepth + 1) * levelH + maxR2 + 40;

        this.svg.setAttribute('height', H);
        this.svg.style.height = H + 'px';

        for (let i = 1; i < cols; i++) {
            this.svg.appendChild(this._el('line', {
                x1: i * colW, y1: 10,
                x2: i * colW, y2: H - 10,
                stroke: DEFAULT_COLOR,
                'stroke-width': 1,
                opacity: 0.2,
                'stroke-dasharray': '6 4',
            }));
        }

        trees.forEach(({ root, label }, i) => {
            const layout = layouts[i];
            const color = LABEL_COLORS[i] || DEFAULT_COLOR;
            const colStart = i * colW;

            const labelStr = label + (root ? ` (${root.size} ch)` : ' \u2205');
            this.svg.appendChild(this._el('text', {
                x: colStart + colW / 2,
                y: LABEL_TOP,
                'text-anchor': 'middle',
                'font-size': 14,
                'font-family': 'sans-serif',
                'font-weight': 'bold',
                fill: color,
            }, labelStr));

            if (!root || layout.size === 0) return;

            const n = layout.size;
            const margin = maxR2 + 15;
            const xOf = n === 1
                ? () => colStart + colW / 2
                : pos => colStart + margin + (pos * (colW - 2 * margin)) / (n - 1);
            const yOf = dep => TREE_TOP + maxR2 + dep * levelH;

            layout.forEach(({ inOrderPos, depth, r }, node) => {
                const px = xOf(inOrderPos), py = yOf(depth);
                if (node.left) {
                    const c = layout.get(node.left);
                    if (c) this._drawEdge(px, py, xOf(c.inOrderPos), yOf(c.depth), r, c.r, '#4a9eff');
                }
                if (node.right) {
                    const c = layout.get(node.right);
                    if (c) this._drawEdge(px, py, xOf(c.inOrderPos), yOf(c.depth), r, c.r, '#ff8c4a');
                }
            });

            layout.forEach(({ inOrderPos, depth, r }, node) => {
                this._drawNode(node, xOf(inOrderPos), yOf(depth), r, false);
            });

            let s = '';
            const trav = nd => { if (!nd) return; trav(nd.left); if (nd.value !== null) s += nd.value; trav(nd.right); };
            trav(root);
            this.svg.appendChild(this._el('text', {
                x: colStart + colW / 2,
                y: H - 16,
                'text-anchor': 'middle',
                'font-size': 12,
                'font-family': 'Fira Code, monospace',
                fill: color,
                opacity: 0.75,
            }, '"' + s + '"'));
        });
    }

    _drawStringLabel(root, y) {
        let s = '';
        const trav = (n) => {
            if (!n) return;
            trav(n.left);
            if (n.value !== null) s += n.value;
            trav(n.right);
        };
        trav(root);
        this.svg.appendChild(
            this._el(
                'text',
                {
                    x: (this.svg.clientWidth || 400) / 2,
                    y,
                    'text-anchor': 'middle',
                    'font-size': 13,
                    'font-family': 'Fira Code, monospace',
                    fill: this._getVar('--text', '#b6fcd5'),
                    opacity: 0.8,
                },
                '"' + s + '"',
            ),
        );
    }

    _drawEmpty() {
        this.svg.setAttribute('height', 60);
        this.svg.style.height = '60px';
        this.svg.appendChild(
            this._el(
                'text',
                {
                    x: (this.svg.clientWidth || 400) / 2,
                    y: 35,
                    'text-anchor': 'middle',
                    'font-size': 14,
                    'font-family': 'sans-serif',
                    fill: this._getVar('--text', '#b6fcd5'),
                    opacity: 0.45,
                },
                '(empty rope)',
            ),
        );
    }

    redraw(root) {
        this.renderTree(root);
    }
}

const draw = new Draw();
export default draw;
export { draw };
