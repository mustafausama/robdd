const ROBDD = require("./robdd");
const readline = require("readline");

letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const isAlpha = function (str) {
  return letters.includes(str);
};

// Cleans the user input by removing spaces and inserting '*' if needed
module.exports.clean = function (expr) {
  expr = expr.replaceAll(" ", "");
  let newExpr = "";
  for (let i = 0; i < expr.length; i++) {
    var token = expr[i];
    newExpr += token;
    if (
      i + 1 < expr.length &&
      token === ")" &&
      (isAlpha(expr[i + 1]) || expr[i + 1] === "(")
    )
      newExpr += "*";
    else if (isAlpha(token)) {
      if (
        i === expr.length - 1 ||
        (i === expr.length - 2 && expr[i + 1] === "'")
      )
        continue;
      if (expr[i + 1] === "'") {
        token = expr[++i];
        newExpr += token;
      }
      if (isAlpha(expr[i + 1]) || expr[i + 1] === "(") newExpr += "*";
    }
  }
  return newExpr;
};

String.prototype.isAlpha = function () {
  return letters.includes(this);
};

// Parse using the Shunting-yard algorithm
// https://www.wikiwand.com/en/Shunting-yard_algorithm
// Convert infix notation => postfix notation
// A*C + BC' => AC*BC'*+
module.exports.parse = function (infix) {
  var outputQueue = "";
  var operatorStack = [];
  // Here are the customizations for any operator type
  var operators = {
    "*": {
      precedence: 2,
      associativity: "Left"
    },
    "+": {
      precedence: 1,
      associativity: "Left"
    }
  };

  for (var i = 0; i < infix.length; i++) {
    var token = infix[i];
    if (token.isAlpha()) {
      outputQueue += token;
      if (infix.length > i + 1 && infix[i + 1] === "'") {
        outputQueue += "'";
        i++;
      }
    } else if ("*+".indexOf(token) !== -1) {
      var o1 = token;
      var o2 = operatorStack[operatorStack.length - 1];
      while (
        "*+".indexOf(o2) !== -1 &&
        operators[o1].precedence <= operators[o2].precedence
      ) {
        outputQueue += operatorStack.pop();
        o2 = operatorStack[operatorStack.length - 1];
      }
      operatorStack.push(o1);
    } else if (token === "(") {
      operatorStack.push(token);
    } else if (token === ")") {
      while (operatorStack[operatorStack.length - 1] !== "(") {
        outputQueue += operatorStack.pop();
      }
      operatorStack.pop();
    }
  }
  while (operatorStack.length > 0) {
    outputQueue += operatorStack.pop();
  }
  return outputQueue;
};

// Construct an ROBDD from a postfix expression
module.exports.ROBDDExpression = function (expr) {
  vars = {};
  stack = [];
  let tree = new ROBDD();
  for (let i = 0; i < expr.length; i++) {
    let curr = expr[i];
    if (curr.isAlpha() && !vars[curr]) vars[curr] = tree.newVar(curr);
    if (curr.isAlpha()) stack.push(vars[curr]);
    if (curr === "'") stack.push(tree.not(stack.pop()));
    if (curr === "+") stack.push(tree.or(stack.pop(), stack.pop()));
    if (curr === "*") stack.push(tree.and(stack.pop(), stack.pop()));
  }
  return [stack[0], Object.keys(vars)];
};

// Compares two ROBDDs recursively
module.exports.isSame = function isSame(F1, F2) {
  if (!F1 && !F2) return true;
  if (!F1 || !F2) return false;
  if (F1.isTerminal && F2.isTerminal) return F1.value === F2.value;
  else if (F1.isTerminal || F2.isTerminal) return false;
  return (
    F1.label == F2.label && isSame(F1.pos, F2.pos) && isSame(F1.neg, F2.neg)
  );
};

// Evaluate the result of an ROBDD if map is input
/*
map object can be:
  map = {
    'A': true,
    'B': false,
    'C': true
  }
*/
module.exports.evaluate = function (func, map) {
  NodePtr = func;
  console.log(map);
  while (!NodePtr.isTerminal)
    NodePtr = map[NodePtr.label] ? NodePtr.pos : NodePtr.neg;
  return NodePtr.value;
};

// Read the user's input response to a question (query)
module.exports.readUser = async function (query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return await new Promise((resolve, _) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
};

// Recursively build the graph visualization
// Optimization: memorizing the already created nodes and edges

module.exports.viz = function viz(mem, g, node, parentId, dashed = false) {
  let currId = `${node.label}>${node.value}>${
    node.pos ? node.pos.label || node.pos.value : node.pos
  }>${node.neg ? node.neg.label || node.neg.value : node.neg}`;
  g.addNode(currId, {
    label: node.label || node.value,
    shape: node.isTerminal ? "rectangle" : "circle"
  });
  if (parentId) {
    if (!mem[parentId] || !mem[parentId].includes(currId)) {
      g.addEdge(parentId, currId, {
        label: dashed ? "0" : "1",
        style: dashed ? "dashed" : "solid",
        nojustify: !dashed
      });
      if (!mem[parentId]) mem[parentId] = [];
      mem[parentId].push(currId);
    }
  }
  if (!node.isTerminal) {
    viz(mem, g, node.neg, currId, true);
    viz(mem, g, node.pos, currId);
  }
};
