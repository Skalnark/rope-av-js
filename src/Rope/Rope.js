import SplayNode from './SplayNode.js';

export default class Rope {
    constructor() {
        this.root = null;
    }

    get length() {
        return this._sz(this.root);
    }

    _sz(node) {
        return node ? node.size : 0;
    }

    _update(node) {
        if (!node) return;

        const own = node.isLeaf ? node.value.length : 0;
        node.size = own + this._sz(node.left) + this._sz(node.right);
    }

    _rotRight(x) {
        const y = x.left;
        if (!y) return;

        x.left = y.right;
        if (y.right) y.right.parent = x;

        y.parent = x.parent;
        if (!x.parent) this.root = y;
        else if (x === x.parent.left) x.parent.left = y;
        else x.parent.right = y;

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
        if (!x.parent) this.root = y;
        else if (x === x.parent.left) x.parent.left = y;
        else x.parent.right = y;

        y.left = x;
        x.parent = y;

        this._update(x);
        this._update(y);
    }

    _splay(x) {
        while (x.parent) {
            const p = x.parent;
            const g = p.parent;

            if (!g) {
                if (x === p.left) this._rotRight(p);
                else this._rotLeft(p);
            } else if (x === p.left && p === g.left) {
                this._rotRight(g);
                this._rotRight(p);
            } else if (x === p.right && p === g.right) {
                this._rotLeft(g);
                this._rotLeft(p);
            } else if (x === p.right && p === g.left) {
                this._rotLeft(p);
                this._rotRight(g);
            } else {
                this._rotRight(p);
                this._rotLeft(g);
            }
        }
        this.root = x;
    }

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

                node = node.right;
            }
        }
        return null;
    }

    _findKth(k) {
        const r = this._findKthWithOffset(k);
        return r ? r.node : null;
    }

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
            this._splay(target);
            const leftPart = target.left;
            target.left = null;
            if (leftPart) leftPart.parent = null;
            this._update(target);
            this.root = leftPart;
            return target;
        }

        const leftVal = target.value.slice(0, offset);
        const rightVal = target.value.slice(offset);

        target.value = leftVal;
        this._update(target);
        this._splay(target);

        const originalRight = target.right;
        target.right = null;
        if (originalRight) originalRight.parent = null;
        this._update(target);

        const rightLeaf = new SplayNode(rightVal);
        rightLeaf.parent = null;
        if (!originalRight) return rightLeaf;

        const internal = new SplayNode(null);
        internal.left = rightLeaf;
        internal.right = originalRight;
        rightLeaf.parent = internal;
        originalRight.parent = internal;
        this._update(internal);
        return internal;
    }

    _mergeRight(rightRoot) {
        if (!rightRoot) return;
        if (!this.root) {
            this.root = rightRoot;
            rightRoot.parent = null;
            return;
        }

        const internal = new SplayNode(null);
        internal.left = this.root;
        internal.right = rightRoot;
        this.root.parent = internal;
        rightRoot.parent = internal;
        this._update(internal);
        this.root = internal;
    }

    insert(text, pos) {
        if (!text || text.length === 0) return;

        const right = this._splitAt(pos);
        for (const ch of text) {
            this._mergeRight(new SplayNode(ch));
        }
        this._mergeRight(right);
        this.rebalance();
    }

    delete(from, to) {
        to = Math.min(to, this.length);
        if (from >= to || from < 0) return;

        const right = this._splitAt(from);

        const temp = new Rope();
        temp.root = right;
        const afterDeleted = temp._splitAt(to - from);
        temp.root = null;

        this._mergeRight(afterDeleted);
        this.rebalance();
    }

    index(i) {
        if (i < 0 || i >= this.length) return null;
        const result = this._findKthWithOffset(i);
        if (!result) return null;
        const { node, offset } = result;
        this._splay(node);
        return node.value[offset];
    }

    concat(otherRoot) {
        this._mergeRight(otherRoot);
    }

    toString() {
        let s = '';

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
        const h = (n) => (!n ? 0 : 1 + Math.max(h(n.left), h(n.right)));
        return h(this.root);
    }

    nodeCount() {
        return this._sz(this.root);
    }

    rebalance() {
        if (!this.root) return;

        const s = this.toString();
        if (!s) {
            this.root = null;
            return;
        }

        const chunks = [];
        const _inputEl =
            typeof document !== 'undefined' &&
            document.getElementById('leaf-size-input');
        const _inputVal = _inputEl ? parseInt(_inputEl.value, 10) : NaN;
        const mls = Math.max(1, isNaN(_inputVal) ? 2 : _inputVal);
        for (let i = 0; i < s.length; i += mls)
            chunks.push(s.slice(i, i + mls));

        const build = (lo, hi, parent) => {
            if (lo === hi) {
                const leaf = new SplayNode(chunks[lo]);
                leaf.parent = parent;

                return leaf;
            }
            const mid = lo + ((hi - lo) >> 1);
            const internal = new SplayNode(null);
            internal.parent = parent;
            internal.left = build(lo, mid, internal);
            internal.right = build(mid + 1, hi, internal);
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

    clear() {
        this.root = null;
    }

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

        const node = new SplayNode(data.v);
        node.left = Rope.deserialize(data.l);
        node.right = Rope.deserialize(data.r);
        if (node.left) node.left.parent = node;
        if (node.right) node.right.parent = node;

        const recompute = (n) => {
            if (!n) return 0;
            const own = n.isLeaf ? n.value.length : 0;
            n.size = own + recompute(n.left) + recompute(n.right);
            return n.size;
        };
        recompute(node);
        return node;
    }

    restore(snapshot) {
        this.root = Rope.deserialize(snapshot);
        if (this.root) this.root.parent = null;
    }
}
