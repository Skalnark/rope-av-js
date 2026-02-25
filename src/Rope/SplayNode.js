export default class SplayNode {
    constructor(value) {
        this.value = value; // single character
        this.left = null;
        this.right = null;
        this.parent = null;
        this.size = 1; // size of subtree rooted at this node
    }
}
