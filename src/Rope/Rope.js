import SplayNode from './SplayNode.js';

/**
 * Rope data structure backed by a Splay Tree.
 * Each node stores a single character.
 * In-order traversal (left → node → right) yields the full string.
 */
export default class Rope {
    constructor() {
        this.root = null;
    }

    // ── Size helpers ──────────────────────────────────────────────────────────

    get length() { return this._sz(this.root); }

    _sz(node) { return node ? node.size : 0; }

    _update(node) {
        if (node) node.size = 1 + this._sz(node.left) + this._sz(node.right);
    }

    // ── Rotations ─────────────────────────────────────────────────────────────

    _rotRight(x) {
        const y = x.left;
        if (!y) return;

        x.left = y.right;
        if (y.right) y.right.parent = x;

        y.parent = x.parent;
        if (!x.parent)           this.root = y;
        else if (x === x.parent.left) x.parent.left = y;
        else                          x.parent.right = y;

        y.right = x;
        x.parent = y;

        this._update(x);
        this._update(y);
    }

    _rotLeft(x) {
        const y = x.right;
        if (!y) return;

        x.right = y.left;
        if (y.left) y.left.parent = x;

        y.parent = x.parent;
        if (!x.parent)           this.root = y;
        else if (x === x.parent.left) x.parent.left = y;
        else                          x.parent.right = y;

        y.left = x;
        x.parent = y;

        this._update(x);
        this._update(y);
    }

    // ── Splay ─────────────────────────────────────────────────────────────────

    _splay(x) {
        while (x.parent) {
            const p = x.parent;
            const g = p.parent;

            if (!g) {
                // Zig
                if (x === p.left) this._rotRight(p);
                else              this._rotLeft(p);
            } else if (x === p.left && p === g.left) {
                // Zig-zig (left-left)
                this._rotRight(g);
                this._rotRight(p);
            } else if (x === p.right && p === g.right) {
                // Zig-zig (right-right)
                this._rotLeft(g);
                this._rotLeft(p);
            } else if (x === p.right && p === g.left) {
                // Zig-zag (right-left)
                this._rotLeft(p);
                this._rotRight(g);
            } else {
                // Zig-zag (left-right)
                this._rotRight(p);
                this._rotLeft(g);
            }
        }
        this.root = x;
    }

    // ── Tree traversal ────────────────────────────────────────────────────────

    /**
     * Find the node at in-order position k (0-indexed).
     */
    _findKth(k, node = this.root) {
        while (node) {
            const ls = this._sz(node.left);
            if (k < ls)      { node = node.left; }
            else if (k === ls) { return node; }
            else               { k -= ls + 1; node = node.right; }
        }
        return null;
    }

    // ── Split / Merge ─────────────────────────────────────────────────────────

    /**
     * Split at position k.
     * Afterwards:   this.root = nodes [0 .. k-1]
     * Returns:       root of nodes [k .. end]
     */
    _splitAt(k) {
        if (k <= 0) {
            const right = this.root;
            this.root = null;
            if (right) right.parent = null;
            return right;
        }
        if (k >= this.length) return null;

        const node = this._findKth(k);
        this._splay(node);

        const left = node.left;
        node.left = null;
        if (left) left.parent = null;
        this._update(node);

        this.root = left;  // left part stays in this
        return node;       // right part (k..end) returned
    }

    /**
     * Append rightRoot to the end of this rope.
     */
    _mergeRight(rightRoot) {
        if (!rightRoot) return;
        if (!this.root) {
            this.root = rightRoot;
            rightRoot.parent = null;
            return;
        }

        // Find rightmost node of current tree and splay to root
        let node = this.root;
        while (node.right) node = node.right;
        this._splay(node);

        // node.right is now null (it was rightmost)
        node.right = rightRoot;
        rightRoot.parent = node;
        this._update(node);
    }

    // ── Public operations ─────────────────────────────────────────────────────

    /**
     * Insert `text` at position `pos` (0-indexed, 0 = before first char).
     */
    insert(text, pos) {
        if (!text || text.length === 0) return;

        const right = this._splitAt(pos); // this.root = left part
        for (const ch of text) {
            this._mergeRight(new SplayNode(ch));
        }
        this._mergeRight(right);
    }

    /**
     * Delete characters in [from, to) (to exclusive).
     */
    delete(from, to) {
        to = Math.min(to, this.length);
        if (from >= to || from < 0) return;

        const right = this._splitAt(from); // left in this, right starts at `from`

        const temp = new Rope();
        temp.root = right; // borrow Rope temporarily, bypassing singleton guard below
        const afterDeleted = temp._splitAt(to - from); // discard temp.root (the deleted range)
        temp.root = null; // release

        this._mergeRight(afterDeleted);
    }

    /**
     * Return the character at position `i` (0-indexed) and splay it to root.
     */
    index(i) {
        if (i < 0 || i >= this.length) return null;
        const node = this._findKth(i);
        if (node) this._splay(node);
        return node ? node.value : null;
    }

    /**
     * Concatenate another rope to the end of this one.
     */
    concat(otherRoot) {
        this._mergeRight(otherRoot);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    toString() {
        let s = '';
        const traverse = (n) => {
            if (!n) return;
            traverse(n.left);
            s += n.value;
            traverse(n.right);
        };
        traverse(this.root);
        return s;
    }

    height() {
        const h = (n) => !n ? 0 : 1 + Math.max(h(n.left), h(n.right));
        return h(this.root);
    }

    nodeCount() { return this._sz(this.root); }

    /**
     * Rebuild the current tree as a height-balanced BST while preserving
     * in-order (i.e. string) order.  Uses the standard recursive median-split
     * approach: O(n) time and O(log n) stack space.
     */
    rebalance() {
        if (!this.root) return;

        // 1. Collect all node values via in-order traversal.
        const vals = [];
        const collect = (n) => {
            if (!n) return;
            collect(n.left);
            vals.push(n.value);
            collect(n.right);
        };
        collect(this.root);

        // 2. Recursively build a balanced BST from the sorted value array.
        const build = (lo, hi, parent) => {
            if (lo > hi) return null;
            const mid  = (lo + hi) >> 1;
            const node = new SplayNode(vals[mid]);
            node.parent = parent;
            node.left   = build(lo, mid - 1, node);
            node.right  = build(mid + 1, hi, node);
            this._update(node);
            return node;
        };

        this.root = build(0, vals.length - 1, null);
    }

    initialize(text = '') {
        this.root = null;
        if (text) {
            this.insert(text, 0);
            this.rebalance();
        }
    }

    clear() { this.root = null; }

    // ── Serialization (for step undo) ─────────────────────────────────────────

    static serialize(node) {
        if (!node) return null;
        return {
            v: node.value,
            l: Rope.serialize(node.left),
            r: Rope.serialize(node.right),
        };
    }

    static deserialize(data) {
        if (!data) return null;
        const node  = new SplayNode(data.v);
        node.left   = Rope.deserialize(data.l);
        node.right  = Rope.deserialize(data.r);
        if (node.left)  node.left.parent  = node;
        if (node.right) node.right.parent = node;

        // Recompute sizes bottom-up
        const recompute = (n) => {
            if (!n) return 0;
            n.size = 1 + recompute(n.left) + recompute(n.right);
            return n.size;
        };
        recompute(node);
        return node;
    }

    /** Restore root from a serialised snapshot. */
    restore(snapshot) {
        this.root = Rope.deserialize(snapshot);
        if (this.root) this.root.parent = null;
    }
}
