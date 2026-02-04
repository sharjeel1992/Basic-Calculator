// ===== Grab DOM =====
const display = document.querySelector(".display");
const keys = document.querySelectorAll(".key");

// ===== State =====
let expression = "";

// ===== Helpers =====
function render() {
  display.value = expression;
}

function isOperator(ch) {
  return ch === "+" || ch === "-" || ch === "*" || ch === "/";
}

function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}

function endsWithOperator(expr) {
  if (expr.length === 0) return false;
  return isOperator(expr[expr.length - 1]);
}

function lastNumberChunk(expr) {
  // returns the last number portion (since last operator), e.g. "12.3"
  // used to prevent multiple decimals in one number
  let i = expr.length - 1;
  while (i >= 0 && !isOperator(expr[i])) i--;
  return expr.slice(i + 1);
}

function canAppendValue(expr, value) {
  // Prevent starting with * or /
  if (expr.length === 0 && (value === "*" || value === "/")) return false;

  // Prevent double operators like ++, **, /+, etc. (allow unary minus)
  if (isOperator(value)) {
    if (expr.length === 0) {
      // allow starting with '-' for negative number
      return value === "-";
    }
    const last = expr[expr.length - 1];
    if (isOperator(last)) {
      // allow ... * -  (unary minus after operator)
      return value === "-" && last !== "-";
    }
  }

  // Prevent multiple decimals in the same number chunk
  if (value === ".") {
    const chunk = lastNumberChunk(expr);
    if (chunk.includes(".")) return false;
    // If '.' is first char in number, prepend 0 (handled later)
  }

  return true;
}

// ===== Tokenize + Evaluate (no eval) =====
function tokenize(expr) {
  const tokens = [];
  let num = "";

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];

    // numbers / decimals
    if (isDigit(ch) || ch === ".") {
      num += ch;
      continue;
    }

    // operators
    if (isOperator(ch)) {
      // unary minus: start or after another operator
      if (ch === "-" && (i === 0 || isOperator(expr[i - 1]))) {
        num += ch; // start a negative number
        continue;
      }

      if (num !== "") {
        tokens.push(num);
        num = "";
      }
      tokens.push(ch);
      continue;
    }

    // ignore spaces
    if (ch === " ") continue;

    // invalid character
    throw new Error("Invalid character");
  }

  if (num !== "") tokens.push(num);
  return tokens;
}

function precedence(op) {
  if (op === "*" || op === "/") return 2;
  if (op === "+" || op === "-") return 1;
  return 0;
}


function toRPN(tokens) {
  const output = [];
  const ops = [];

  for (const t of tokens) {
    if (!isNaN(t)) {
      output.push(t);
      continue;
    }

    if (isOperator(t)) {
      while (
        ops.length > 0 &&
        isOperator(ops[ops.length - 1]) &&
        precedence(ops[ops.length - 1]) >= precedence(t)
      ) {
        output.push(ops.pop());
      }
      ops.push(t);
      continue;
    }

    throw new Error("Bad token");
  }

  while (ops.length > 0) output.push(ops.pop());
  return output;
}

function evalRPN(rpn) {
  const stack = [];

  for (const t of rpn) {
    if (!isNaN(t)) {
      stack.push(Number(t));
      continue;
    }

    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) throw new Error("Bad expression");

    if (t === "+") stack.push(a + b);
    else if (t === "-") stack.push(a - b);
    else if (t === "*") stack.push(a * b);
    else if (t === "/") {
      if (b === 0) throw new Error("Divide by zero");
      stack.push(a / b);
    } else {
      throw new Error("Bad operator");
    }
  }

  if (stack.length !== 1) throw new Error("Bad expression");
  return stack[0];
}

function evaluateExpression(expr) {
  if (expr.trim() === "") return "";

  const tokens = tokenize(expr);

 
  const last = tokens[tokens.length - 1];
  if (isOperator(last)) throw new Error("Ends with operator");

  
  const rpn = toRPN(tokens);
  const result = evalRPN(rpn);

  // fix floating noise: 0.30000000000004 -> 0.3
  const cleaned = Number(result.toFixed(10));

  // show integers without trailing .0
  return cleaned.toString();
}

// ===== Click handling =====
for (let i = 0; i < keys.length; i++) {
  const btn = keys[i];

  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    const value = btn.dataset.value;

    // If we currently show Error and user starts typing, reset first
    if (expression === "Error" && action !== "clear") {
      expression = "";
    }

    // Clear
    if (action === "clear") {
      expression = "";
      render();
      return;
    }

    // Equals
    if (action === "equals") {
      try {
        expression = evaluateExpression(expression);
      } catch (e) {
        expression = "Error";
      }
      render();
      return;
    }

    // Normal value button (number/operator)
    if (value !== undefined) {
      // If user presses '.' first in a number, turn it into '0.'
      if (value === ".") {
        const chunk = lastNumberChunk(expression);
        if (chunk === "" || chunk === "-") {
          // start decimal number: 0. or -0.
          if (!canAppendValue(expression, ".")) return;
          expression += "0.";
          render();
          return;
        }
      }

      if (!canAppendValue(expression, value)) return;

      expression += value;
      render();
    }
  });
}

// initial render
render();
