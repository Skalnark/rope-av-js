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
        if (!node) return;
        // Leaf nodes own 1 character; internal nodes own 0.
        // Both may have children (splay can promote a leaf to an ancestor position).
        const own = node.isLeaf ? 1 : 0;
        node.size = own + this._sz(node.left) + this._sz(node.right);
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
     * Find the leaf node at in-order character position k (0-indexed).
     *
     * Traversal rules:
     *   – At an internal node: navigate left/right by left-subtree size.
     *     The internal node itself contributes 0 characters.
     *   – At a leaf node: the leaf contributes 1 character at the current
     *     position (= ls after subtracting left-subtree size).
     *     If k == ls the leaf is the answer; otherwise skip the leaf's
     *     character and continue into the right subtree.
     */
    _findKth(k) {
        let node = this.root;
        while (node) {
            const ls = this._sz(node.left);
            if (k < ls) {
                node = node.left;
            } else {
                k -= ls;
                if (node.isLeaf) {
                    if (k === 0) return node; // this leaf is the k-th character
                    k -= 1;                   // skip past this leaf's character
                }
                // internal node: contributes 0 characters, just go right
                node = node.right;
            }
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
     * Append rightRoot to the end of this rope by creating a new internal
     * node that wraps both subtrees.  This preserves the Rope invariant:
     * internal nodes hold no character data.
     */
    _mergeRight(rightRoot) {
        if (!rightRoot) return;
        if (!this.root) {
            this.root = rightRoot;
            rightRoot.parent = null;
            return;
        }

        // Create a new internal node (value = null) combining both sides.
        const internal  = new SplayNode(null);
        internal.left   = this.root;
        internal.right  = rightRoot;
        this.root.parent  = internal;
        rightRoot.parent  = internal;
        this._update(internal);
        this.root = internal;
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
        this.rebalance(); // restore proper Rope structure after building
    }

    /**
     * Delete characters in [from, to) (to exclusive).
     */
    delete(from, to) {
        to = Math.min(to, this.length);
        if (from >= to || from < 0) return;

        const right = this._splitAt(from); // left in this, right starts at `from`

        const temp = new Rope();
        temp.root = right;
        const afterDeleted = temp._splitAt(to - from); // discard deleted range
        temp.root = null;

        this._mergeRight(afterDeleted);
        this.rebalance(); // restore proper Rope structure after deletion
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
        // Only leaf nodes carry character data; internal nodes are structural.
        const traverse = (n) => {
            if (!n) return;
            traverse(n.left);
            if (n.isLeaf) s += n.value;
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
    /**
     * Rebuild the tree as a height-balanced Rope while preserving in-order
     * (string) order.  The result is a proper Rope:
     *   – Leaf nodes at the bottom hold exactly one character each.
     *   – Internal nodes hold no data; they only carry the subtree size.
     * Uses the standard recursive median-split approach: O(n) time.
     */
    rebalance() {
        if (!this.root) return;

        // 1. Collect in-order character values from leaf nodes only.
        const chars = [];
        const collect = (n) => {
            if (!n) return;
            collect(n.left);
            if (n.isLeaf) chars.push(n.value);
            collect(n.right);
        };
        collect(this.root);

        if (chars.length === 0) { this.root = null; return; }

        // 2. Build a balanced binary tree:
        //    – Single character range → leaf node.
        //    – Multiple characters → internal node with two subtrees.
        const build = (lo, hi, parent) => {
            if (lo === hi) {
                const leaf    = new SplayNode(chars[lo]);
                leaf.parent   = parent;
                leaf.size     = 1;
                return leaf;
            }
            const mid      = lo + ((hi - lo) >> 1);
            const internal  = new SplayNode(null); // internal: no character
            internal.parent = parent;
            internal.left   = build(lo,      mid, internal);
            internal.right  = build(mid + 1, hi,  internal);
            this._update(internal);
            return internal;
        };

        this.root = build(0, chars.length - 1, null);
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
        // SplayNode(null) → internal node; SplayNode(char) → leaf node.
        const node  = new SplayNode(data.v);
        node.left   = Rope.deserialize(data.l);
        node.right  = Rope.deserialize(data.r);
        if (node.left)  node.left.parent  = node;
        if (node.right) node.right.parent = node;

        // Recompute sizes bottom-up respecting the leaf/internal distinction.
        const recompute = (n) => {
            if (!n) return 0;
            const own = n.isLeaf ? 1 : 0;
            n.size = own + recompute(n.left) + recompute(n.right);
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
