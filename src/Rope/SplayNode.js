export default class SplayNode {
    constructor(value = null) {
        this.value = value;
        this.left = null;
        this.right = null;
        this.parent = null;

        this.size = value !== null ? value.length : 0;
    }

    get isLeaf() {
        return this.value !== null;
    }
}
