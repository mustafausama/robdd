class ROBDDNode {
  label; // Node's label (variable name)
  pos; // Node's positive coefficient
  neg; // Node's negative coefficient
  value; // Node's value only if it's a terminal node
  constructor(label, pos, neg, value) {
    this.label = label;
    this.pos = pos;
    this.neg = neg;
    this.value = value;
  }
  // For normal nodes return false
  // This function is overriden for true/false nodes
  get isTerminal() {
    return false;
  }
}

// Create a special instance of ROBDDNode for the true terminal node
ROBDDNodeTrue = Object.create(ROBDDNode.prototype, {
  value: { get: () => true },
  isTerminal: { get: () => true }
});
module.exports.ROBDDNodeTrue = ROBDDNodeTrue;

// Create a special instance of ROBDDNode for the false terminal node
ROBDDNodeFalse = Object.create(ROBDDNode.prototype, {
  value: { get: () => false },
  isTerminal: { get: () => true }
});
module.exports.ROBDDNodeFalse = ROBDDNodeFalse;

class ROBDD {
  // Node caching for optimization
  cache = {};

  // Create and cache a new variable if it does not exist
  newVar(label) {
    if (this.cache[label]) return;
    return this.insertCache(label, ROBDDNodeTrue, ROBDDNodeFalse);
  }

  // Insert a new node with the specified label, positve, and negative coefficients
  insertCache(label, pos, neg) {
    // Optimization: if it has the same positive and negative coefficients
    if (pos === neg) return pos;
    // if the node does not exist at all, create and cache it
    if (!this.cache[label]) {
      let node = new ROBDDNode(label, pos, neg);
      // Cache the created node along with its corresponding not (without actually using it)
      this.cache[label] = [node, this.noCacheNot(node)];
      // if it exists but with different positive and negative coefficients
      // create a new one and cache it
    } else if (
      !this.cache[label].find((node) => node.pos === pos && node.neg === neg)
    ) {
      let node = new ROBDDNode(label, pos, neg);
      // Cache the created node along with its corresponding not (without actually using it)
      this.cache[label].push(node, this.noCacheNot(node));
    }
    // retrieve and return the required cached node after being created
    return this.cache[label].find(
      (node) => node.pos === pos && node.neg === neg
    );
  }

  noCacheNot(node) {
    // Optimization: if the node is true or false, return the opposite
    if (node === ROBDDNodeTrue) return ROBDDNodeFalse;
    if (node === ROBDDNodeFalse) return ROBDDNodeTrue;
    // create a new node while reversing the negtive and positive coefficients
    return new ROBDDNode(
      node.label,
      this.noCacheNot(node.neg),
      this.noCacheNot(node.pos)
    );
  }

  not(node) {
    // Optimization: if the node is true or false, return the opposite
    if (node === ROBDDNodeTrue) return ROBDDNodeFalse;
    if (node === ROBDDNodeFalse) return ROBDDNodeTrue;
    // create and cache a new node while reversing the negtive and positive coefficients
    return this.insertCache(node.label, this.not(node.pos), this.not(node.neg));
  }

  and(A, B) {
    // Optimization: if any node is true, return the other node
    if (A === ROBDDNodeTrue) return B;
    if (B === ROBDDNodeTrue) return A;
    // Optimization: if any node is false, return the false node
    if (A === ROBDDNodeFalse) return ROBDDNodeFalse;
    if (B === ROBDDNodeFalse) return ROBDDNodeFalse;
    // Optimization: if and-ed with itself, return itself
    if (A === B) return A;
    // Optimization: if and-ed with its not, return false
    if (A === this.not(B)) return ROBDDNodeFalse;
    // Optimization: if the same label (variable name), create and cache a new node
    // The new node would have the same label, an and-ed positive and negative coefficients
    if (A.label === B.label) {
      return this.insertCache(
        A.label,
        this.and(A.pos, B.pos),
        this.and(A.neg, B.neg)
      );
    } else if (A.label < B.label) {
      // This rule is strict for the correctness of ROBDD
      // Here the nodes are and-ed and added to the tree in a chronological order
      // For example A would be an ancestor for B, X would be an ancestor for Y
      //           A
      //          / \
      //         /   \
      //       A&B  A'&B
      return this.insertCache(A.label, this.and(A.pos, B), this.and(A.neg, B));
    } else {
      //           B
      //          / \
      //         /   \
      //       A&B  A&B'
      return this.insertCache(B.label, this.and(A, B.pos), this.and(A, B.neg));
    }
  }
  or(A, B) {
    // Optimization: if any node is true, return true
    if (A === ROBDDNodeTrue) return ROBDDNodeTrue;
    if (B === ROBDDNodeTrue) return ROBDDNodeTrue;
    // Optimization: if any node is false, return the other node
    if (A === ROBDDNodeFalse) return B;
    if (B === ROBDDNodeFalse) return A;
    // Optimization: if or-ed with itself, return itself
    if (A === B) return A;
    // Optimization: if or-ed with its not, return true
    if (A === this.not(B)) return ROBDDNodeTrue;
    // Optimization: if the same label (variable name), create and cache a new node
    // The new node would have the same label, an or-ed positive and negative coefficients
    if (A.label === B.label) {
      return this.insertCache(
        A.label,
        this.or(A.pos, B.pos),
        this.or(A.neg, B.neg)
      );
    } else if (A.label < B.label) {
      // This rule is strict for the correctness of ROBDD
      // Here the nodes are and-ed and added to the tree in a chronological order
      // For example A would be an ancestor for B, X would be an ancestor for Y
      //           A
      //          / \
      //         /   \
      //       A+B  A'+B
      return this.insertCache(A.label, this.or(A.pos, B), this.or(A.neg, B));
    } else {
      //           B
      //          / \
      //         /   \
      //       A+B  A+B'
      return this.insertCache(B.label, this.or(A, B.pos), this.or(A, B.neg));
    }
  }
}

module.exports = ROBDD;
