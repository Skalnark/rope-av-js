// Draw.js – Splay-Tree / Rope visualiser
class Draw {
    constructor() {
        this._svgEl = null;
    }

    get svg() {
        if (!this._svgEl) this._svgEl = document.getElementById('rope-svg');
        return this._svgEl;
    }

    // Colour helper

    _getVar(name, fallback) {
        try {
            const v = getComputedStyle(document.documentElement).getPropertyValue(name);
            if (v && v.trim()) return v.trim();
        } catch (e) {}
        return fallback;
    }

    // SVG element factories

    _el(tag, attrs = {}, text = null) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        if (text !== null) el.textContent = text;
        return el;
    }

    // Layout computation

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

    // Main render

    renderTree(root, highlightNodes = new Set()) {
        if (!this.svg) return;
        while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

        if (!root) {
            this._drawEmpty();
            return;
        }

        const layout = this._computeLayout(root);
        const n = layout.size;
        const maxDepth = Math.max(...[...layout.values()].map(v => v.depth));

        const W          = Math.max(this.svg.clientWidth || 0, 400);
        const minR       = 14, maxR = 24;
        const nodeRadius = Math.min(maxR, Math.max(minR, (W - 60) / (n * 3)));
        const levelH     = Math.max(65, nodeRadius * 3.8);
        const H          = (maxDepth + 2) * levelH + 50;

        this.svg.setAttribute('height', H);
        this.svg.style.height = H + 'px';

        const margin = nodeRadius + 30;
        const span   = Math.max(1, n - 1);
        const xOf    = (pos) => margin + pos * (W - 2 * margin) / span;
        const yOf    = (dep) => nodeRadius + 20 + dep * levelH;

        // Edges (drawn first so nodes appear on top)
        layout.forEach(({ inOrderPos, depth }, node) => {
            const px = xOf(inOrderPos), py = yOf(depth);
            if (node.left) {
                const c = layout.get(node.left);
                if (c) this._drawEdge(px, py, xOf(c.inOrderPos), yOf(c.depth), nodeRadius, '#4a9eff');
            }
            if (node.right) {
                const c = layout.get(node.right);
                if (c) this._drawEdge(px, py, xOf(c.inOrderPos), yOf(c.depth), nodeRadius, '#ff8c4a');
            }
        });

        // Nodes
        layout.forEach(({ inOrderPos, depth }, node) => {
            this._drawNode(node, xOf(inOrderPos), yOf(depth), nodeRadius, highlightNodes.has(node));
        });

        // Rope string at bottom
        this._drawStringLabel(root, H - 16);
    }

    // Sub-drawing helpers

    _drawEdge(x1, y1, x2, y2, r, color) {
        const dx = x2 - x1, dy = y2 - y1;
        const d  = Math.sqrt(dx * dx + dy * dy) || 1;
        this.svg.appendChild(this._el('line', {
            x1: x1 + dx / d * r, y1: y1 + dy / d * r,
            x2: x2 - dx / d * r, y2: y2 - dy / d * r,
            stroke: color, 'stroke-width': 2, opacity: 0.75,
        }));
    }

    _drawNode(node, x, y, r, highlighted) {
        const accent  = this._getVar('--accent-color', '#168344');
        const bg      = this._getVar('--panel-bg',    '#181c1f');
        const fg      = this._getVar('--text',        '#b6fcd5');
        const isLeaf  = node.value !== null;

        if (isLeaf) {
            const display  = node.value.replace(/ /g, '\u00b7');
            const fontSize = Math.max(7, Math.min(
                Math.round(r * 0.95),
                Math.floor((2 * r - 4) / (display.length * 0.65))
            ));
            this.svg.appendChild(this._el('circle', {
                cx: x, cy: y, r,
                fill:           highlighted ? accent : bg,
                stroke:         highlighted ? fg     : accent,
                'stroke-width': highlighted ? 3 : 1.5,
            }));
            this.svg.appendChild(this._el('text', {
                x, y,
                'text-anchor':       'middle',
                'dominant-baseline': 'central',
                'font-size':         fontSize,
                'font-family':       'Fira Code, monospace',
                fill:                highlighted ? bg : fg,
            }, display));
        } else {
            const ri = Math.round(r * 0.82);
            this.svg.appendChild(this._el('circle', {
                cx: x, cy: y, r: ri,
                fill:                'none',
                stroke:              highlighted ? fg : accent,
                'stroke-width':      highlighted ? 2.5 : 1.5,
                'stroke-dasharray':  '4 3',
                opacity:             0.7,
            }));
            const weight = node.left ? node.left.size : 0;
            this.svg.appendChild(this._el('text', {
                x, y,
                'text-anchor':       'middle',
                'dominant-baseline': 'central',
                'font-size':         Math.round(ri * 0.72),
                'font-family':       'sans-serif',
                fill:                highlighted ? fg : accent,
                opacity:             0.85,
            }, String(weight)));
        }

        this.svg.appendChild(this._el('text', {
            x, y: y + r + 11,
            'text-anchor':  'middle',
            'font-size':    Math.max(9, Math.round(r * 0.55)),
            'font-family':  'sans-serif',
            fill:           fg,
            opacity:        0.45,
        }, 's=' + node.size));
    }

    _drawStringLabel(root, y) {
        let s = '';
        const trav = (n) => { if (!n) return; trav(n.left); if (n.value !== null) s += n.value; trav(n.right); };
        trav(root);
        this.svg.appendChild(this._el('text', {
            x:              (this.svg.clientWidth || 400) / 2,
            y,
            'text-anchor':  'middle',
            'font-size':    13,
            'font-family':  'Fira Code, monospace',
            fill:           this._getVar('--text', '#b6fcd5'),
            opacity:        0.8,
        }, '"' + s + '"'));
    }

    _drawEmpty() {
        this.svg.setAttribute('height', 60);
        this.svg.style.height = '60px';
        this.svg.appendChild(this._el('text', {
            x:             (this.svg.clientWidth || 400) / 2,
            y:             35,
            'text-anchor': 'middle',
            'font-size':   14,
            'font-family': 'sans-serif',
            fill:          this._getVar('--text', '#b6fcd5'),
            opacity:       0.45,
        }, '(empty rope)'));
    }

    /* ── convenience ──────────────────────────────────────────────────────── */

    redraw(root) { this.renderTree(root); }
}

const draw = new Draw();
export default draw;
export { draw };
