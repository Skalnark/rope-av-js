export default class SplayNode {
    constructor(value = null) {
        // value is a character string for leaf nodes; null for internal nodes.
        this.value  = value;
        this.left   = null;
        this.right  = null;
        this.parent = null;
        // size = total number of characters reachable from this node.
        // Leaf: 1  |  Internal: sum of children's sizes (updated by Rope._update).
        this.size   = value !== null ? 1 : 0;
    }

    /**
     * A node is a "leaf" (in the Rope sense) when it holds a character.
     * Internal nodes are purely structural and carry no character data.
     * Note: after splay operations a leaf may temporarily have children;
     * it is still a leaf because it still holds a character value.
     */
    get isLeaf() { return this.value !== null; }
}
