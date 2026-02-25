export default class SplayNode {
    constructor(value = null) {
        // value: string for leaf nodes (may be multi-char), null for internal nodes.
        this.value  = value;
        this.left   = null;
        this.right  = null;
        this.parent = null;
        // size = total number of characters reachable from this node.
        // Leaf: value.length  |  Internal: 0 + children (updated by Rope._update).
        this.size   = value !== null ? value.length : 0;
    }

    /** True when this node holds character data (leaf node in the Rope sense). */
    get isLeaf() { return this.value !== null; }
}
