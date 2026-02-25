import SplayNode from './SplayNode.js';

/**
 * Rope data structure backed by a Splay Tree.
 * Leaf nodes store substrings of up to Rope.MAX_LEAF_SIZE characters.
 * Internal nodes are purely structural (null value, store subtree size only).
 * In-order traversal of leaves yields the full rope string.
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
        // Leaf nodes own value.length characters; internal nodes own 0.
        const own = node.isLeaf ? node.value.length : 0;
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
     * Find the leaf containing in-order character position k (0-indexed).
     * Returns { node, offset } where offset is k's position within node.value.
     * Internal nodes contribute 0 characters; leaves contribute value.length.
     */
    _findKthWithOffset(k) {
        let node = this.root;
        while (node) {
            const ls = this._sz(node.left);
            if (k < ls) {
                node = node.left;
            } else {
                k -= ls;
                if (node.isLeaf) {
                    if (k < node.value.length) return { node, offset: k };
                    k -= node.value.length;
                }
                // internal node: contributes 0 characters, continue right
                node = node.right;
            }
        }
        return null;
    }

    /** Convenience wrapper – returns just the leaf node, ignoring offset. */
    _findKth(k) {
        const r = this._findKthWithOffset(k);
        return r ? r.node : null;
    }

    // ── Split / Merge ─────────────────────────────────────────────────────────

    /**
     * Split at character position k.
     * After the call: this.root = characters [0, k-1].
     * Returns: root covering characters [k, end].
     *
     * Handles multi-char leaves: if k falls inside a leaf the leaf string is
     * split in two and only the right half is moved to the returned partition.
     */
    _splitAt(k) {
        if (k <= 0) {
            const right = this.root;
            this.root = null;
            if (right) right.parent = null;
            return right;
        }
        if (k >= this.length) return null;

        const found = this._findKthWithOffset(k);
        if (!found) return null;
        const { node: target, offset } = found;

        if (offset === 0) {
            // k falls exactly at the start of this leaf – no leaf split needed.
            this._splay(target);
            const leftPart = target.left;
            target.left = null;
            if (leftPart) leftPart.parent = null;
            this._update(target);
            this.root = leftPart;   // left partition [0, k-1]
            return target;          // right partition [k, end]
        }

        // k falls inside the leaf at `offset`. Split the leaf string.
        const leftVal  = target.value.slice(0, offset);
        const rightVal = target.value.slice(offset);

        // Shorten target to just the left portion, then splay it to root.
        target.value = leftVal;
        this._update(target);
        this._splay(target);

        // After splay: target is root, target.right = chars after original leaf.
        const originalRight = target.right;
        target.right = null;
        if (originalRight) originalRight.parent = null;
        this._update(target);   // this.root = target, left partition [0, k-1]

        // Build right partition: rightVal leaf prepended to originalRight.
        const rightLeaf = new SplayNode(rightVal);
        rightLeaf.parent = null;
        if (!originalRight) return rightLeaf;

        const internal    = new SplayNode(null);
        internal.left     = rightLeaf;
        internal.right    = originalRight;
        rightLeaf.parent     = internal;
        originalRight.parent = internal;
        this._update(internal);
        return internal;
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
     * Return the character at position `i` (0-indexed) and splay its leaf to root.
     * With multi-char leaves, this returns the specific character within the leaf.
     */
    index(i) {
        if (i < 0 || i >= this.length) return null;
        const result = this._findKthWithOffset(i);
        if (!result) return null;
        const { node, offset } = result;
        this._splay(node);
        return node.value[offset];
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
     * Rebuild the tree as a height-balanced Rope while preserving in-order
     * (string) order.  Leaves hold up to Rope.MAX_LEAF_SIZE characters;
     * internal nodes are structural only.
     */
    rebalance() {
        if (!this.root) return;

        // 1. Collect the full rope string.
        const s = this.toString();
        if (!s) { this.root = null; return; }

        // 2. Split string into chunks of at most MAX_LEAF_SIZE chars.
        // Read leaf size from the DOM input; fall back to 2 if unavailable.
        const chunks = [];
        const _inputEl = typeof document !== 'undefined' && document.getElementById('leaf-size-input');
        const _inputVal = _inputEl ? parseInt(_inputEl.value, 10) : NaN;
        const mls = Math.max(1, isNaN(_inputVal) ? 2 : _inputVal);
        for (let i = 0; i < s.length; i += mls) chunks.push(s.slice(i, i + mls));

        // 3. Build balanced tree: single chunk → leaf; multiple → internal node.
        const build = (lo, hi, parent) => {
            if (lo === hi) {
                const leaf  = new SplayNode(chunks[lo]);
                leaf.parent = parent;
                // SplayNode constructor already sets size = value.length
                return leaf;
            }
            const mid      = lo + ((hi - lo) >> 1);
            const internal = new SplayNode(null);
            internal.parent = parent;
            internal.left   = build(lo,      mid, internal);
            internal.right  = build(mid + 1, hi,  internal);
            this._update(internal);
            return internal;
        };

        this.root = build(0, chunks.length - 1, null);
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
        // SplayNode(null) → internal node; SplayNode(string) → leaf node.
        const node  = new SplayNode(data.v);
        node.left   = Rope.deserialize(data.l);
        node.right  = Rope.deserialize(data.r);
        if (node.left)  node.left.parent  = node;
        if (node.right) node.right.parent = node;

        // Recompute sizes bottom-up respecting the leaf/internal distinction.
        const recompute = (n) => {
            if (!n) return 0;
            const own = n.isLeaf ? n.value.length : 0;
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
