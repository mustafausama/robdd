const graphviz = require("graphviz");
const {
  parse,
  clean,
  ROBDDExpression,
  isSame,
  evaluate,
  readUser,
  viz
} = require("./utils");

const logger = (colored, plain) => {
  color = "\x1b[33m%s\x1b[0m";
  console.log(color, colored, plain);
};

const loggerReset = (text) => {
  return `\x1b[33m${text}\x1b[0m`;
};

async function main() {
  // ask the user to input expressions and clean the input then output the cleaned expressions
  let expression1 = await readUser(loggerReset("Enter expression 1: "));
  let clean1 = clean(expression1);
  logger("Cleaning expression 1:", clean(clean1));
  let expression2 = await readUser(loggerReset("Enter expression 2: "));
  let clean2 = clean(expression2);
  logger("Cleaning expression 2:", clean(clean2));
  // Parse the clean expressions to create the ROBBD trees and store their roots in function1 and function2 while storing the input variables in vars1 and vars2
  let [function1, vars1] = ROBDDExpression(parse(clean1)),
    [function2, vars2] = ROBDDExpression(parse(clean2));
  logger(
    `Expressions are:`,
    `${!isSame(function1, function2) ? "not " : ""}identical`
  );
  // Keep asking the user to evaluate an expression until the user chooses N (No)
  let readEval = loggerReset(
    "Evaluate an expression? Select the expression number or N for denial. [1, 2, N]: "
  );
  let evalAns = await readUser(readEval);
  while (evalAns != "N") {
    let vars = [vars1, vars2];
    // create a map object from the variables of the expressions the user chose to evaluate
    let varsChoice = vars[parseInt(evalAns) - 1];
    let map = Object.fromEntries(varsChoice.sort().map((v) => [v, true]));
    // ask the user to input values and store them in the map
    for (let v of varsChoice)
      map[v] = [
        "true",
        "True",
        "TRUE",
        1,
        "1",
        "high",
        "High",
        "HIGH",
        "one",
        "One",
        "ONE"
      ].includes(await readUser(loggerReset(`${v}: `)));
    // Evaluate the ROBDD and output the result
    console.log(
      "Result:",
      evaluate(parseInt(evalAns) === 1 ? function1 : function2, map)
    );
    evalAns = await readUser(readEval);
  }
  // Keep asking the user to visualize an ROBDD until the user chooses N (No)
  let readVis = loggerReset(
    "Visualize the ROBDD? Select the expression number or N for denial. [1, 2, N]: "
  );
  let visAns = await readUser(readVis);
  while (visAns != "N") {
    // create a graph and visualize the chosen expression's ROBDD
    var g = graphviz.digraph("G");
    g.set("label", visAns === "1" ? expression1 : expression2);
    let mem = {};
    viz(mem, g, visAns === "1" ? function1 : function2);
    g.setGraphVizPath("C:\\Program Files\\Graphviz\\bin");
    g.output("png", "test01.png");
    visAns = await readUser(readVis);
  }
}

main();
