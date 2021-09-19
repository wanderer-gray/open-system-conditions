const IsDigit = (ch) => /^[0-9]$/.test(ch);
const IsLetter = (ch) => /^[_a-zA-Z]$/.test(ch);
const IsLetterOrDigit = (ch) => /^[_a-zA-Z0-9]$/.test(ch);

const AstType = {
  NULL: 0,
  BOOL: 1,
  NUM: 2,
  STR: 3,
  ATTR: 4,
  FUNC: 5,
  OP: 6,
  COND: 7
};

class AstNode {
  _type = null;
  _text = null;

  _childs = [];

  get Type() {
    return this._type;
  }

  get Text() {
    return this._text;
  }

  get Childs() {
    return this._childs;
  }

  constructor(type, text) {
    this._type = type;
    this._text = text;
    this._childs = [];
  }

  addChild(...nodes) {
    this._childs.push(...nodes);

    return this;
  }
}

class Parser {
  WHITESPACE = [' ', '\t', '\n'];

  _text = null;
  _position = 0;

  constructor(text) {
    this._text = text;
  }

  get Char() {
    return this._text[this._position];
  }

  get IsEnd() {
    return this._text.length <= this._position;
  }

  Next() {
    if (!this.IsEnd) {
      this._position++;
    }
  }

  Skip() {
    while (this.WHITESPACE.includes(this.Char)) {
      this.Next();
    }
  }

  TryTextMatch(...texts) {
    for (const text of texts) {
      if (this._text.startsWith(text, this._position)) {
        this._position += text.length;

        this.Skip();

        return text;
      }
    }

    return null;
  }

  TryNodeMatch(...getNodes) {
    const position = this._position;

    for (const getNode of getNodes) {
      const node = getNode();

      if (node) {
        return node;
      }

      this._position = position;
    }

    return null;
  }

  GetNull = () => {
    const text = this.TryTextMatch('NULL');

    return text ? new AstNode(AstType.NULL, text) : null;
  }

  GetBool = () => {
    const text = this.TryTextMatch('FALSE', 'TRUE');

    return text ? new AstNode(AstType.BOOL, text) : null;
  }

  GetNum = () => {
    const MINUS = '-';
    const POINT = '.';

    const getDigits = () => {
      let digits = '';

      for (; IsDigit(this.Char); this.Next()) {
        digits += this.Char;
      }

      return digits;
    }

    const sign = this.TryTextMatch('+', MINUS);
    const exponent = getDigits();
    const point = this.TryTextMatch(POINT);
    const mantissa = point ? getDigits() : '';

    this.Skip();

    if (!(exponent || mantissa)) {
      return null;
    }

    const m = mantissa.replace(/0+$/, '');
    const p = m ? POINT : '';
    const e = exponent.replace(/^0+/, '').padEnd(1, '0');
    const s = sign === MINUS ? MINUS : '';

    const text = s + e + p + m;

    return new AstNode(AstType.NUM, text);
  }

  GetStr = () => {
    const SINGLE_QUOTE = `'`;

    if (!this.TryTextMatch(SINGLE_QUOTE)) {
      return null;
    }

    let text = '';

    for (;;) {
      for (; !this.IsEnd && this.Char !== SINGLE_QUOTE; this.Next()) {
        text += this.Char;
      }

      if (!this.TryTextMatch(SINGLE_QUOTE.repeat(2))) {
        break;
      }

      text += SINGLE_QUOTE;
    }

    if (!this.TryTextMatch(SINGLE_QUOTE)) {
      return null;
    }

    this.Skip();

    return new AstNode(AstType.STR, text);
  }

  GetVal = () => {
    return this.TryNodeMatch(
      this.GetNull,
      this.GetBool,
      this.GetNum,
      this.GetStr
    );
  }

  GetAttr = () => {
    const POINT = '.';

    let text = '';

    for (;;) {
      if (!IsLetter(this.Char)) {
        return null;
      }
      
      while (IsLetterOrDigit(this.Char)) {
        text += this.Char;

        this.Next();
      }
      
      if (!this.TryTextMatch(POINT)) {
        break;
      }

      text += POINT;
    }

    this.Skip();

    return new AstNode(AstType.ATTR, text);
  }

  GetFunc = () => {
    const COMMA = ',';

    let text = '';

    if (!IsLetter(this.Char)) {
      return null;
    }

    for (; IsLetterOrDigit(this.Char); this.Next()) {
      text += this.Char;
    }

    this.Skip();

    if (!this.TryTextMatch('(')) {
      return null;
    }

    const args = [];

    for (let com = COMMA, arg = this.GetTerm(); com && arg; com = this.TryTextMatch(COMMA), arg = this.GetTerm()) {
      args.push(arg);
    }

    if (!this.TryTextMatch(')')) {
      return null;
    }

    return new AstNode(AstType.FUNC, text)
      .addChild(...args);
  }

  GetGroup = () => {
    if (!this.TryTextMatch('(')) {
      return null;
    }

    const summand = this.GetOperand();
    
    if (!summand) {
      return null;
    }
    
    if (!this.TryTextMatch(')')) {
      return null;
    }

    return summand;
  }

  GetTerm = () => {
    return this.TryNodeMatch(
      this.GetVal,
      this.GetFunc,
      this.GetAttr,
      this.GetGroup
    );
  }

  GetOpMul = () => {
    let left = this.GetTerm();

    if (!left) {
      return null;
    }

    for (;;) {
      const op = this.TryTextMatch('*', '/', '%', '//');
  
      if (!op) {
        return left;
      }
  
      const right = this.GetTerm();
  
      if (!right) {
        return null;
      }
  
      left = new AstNode(AstType.OP, op)
        .addChild(left)
        .addChild(right);
    }
  }

  GetOpSum = () => {
    let left = this.GetOpMul();

    if (!left) {
      return null;
    }

    for (;;) {
      const op = this.TryTextMatch('+', '-');
  
      if (!op) {
        return left;
      }
  
      const right = this.GetOpMul();
  
      if (!right) {
        return null;
      }
  
      left = new AstNode(AstType.OP, op)
        .addChild(left)
        .addChild(right);
    }
  }

  GetOperand = () => {
    return this.GetOpSum();
  }

  GetOpCmp = () => {
    const left = this.GetOperand();

    if (!left) {
      return null;
    }

    const opCmp = this.TryTextMatch('<>', '<=', '>=', '=', '<', '>', '!=');

    if (!opCmp) {
      return null;
    }

    const right = this.GetOperand();

    if (!right) {
      return null;
    }

    return new AstNode(AstType.OP, opCmp)
      .addChild(left)
      .addChild(right);
  }

  GetCondIn = () => {
    const left = this.GetOperand();

    if (!left) {
      return null;
    }

    const condNot = this.TryTextMatch('NOT');
    const condIn = this.TryTextMatch('IN');

    if (!condIn) {
      return null;
    }

    if (!this.TryTextMatch('(')) {
      return null;
    }

    const args = [];

    do {
      const arg = this.GetOperand();

      if (!arg) {
        return null;
      }

      args.push(arg);
    } while (!this.TryTextMatch(','));

    if (!this.TryTextMatch(')')) {
      return null;
    }

    const cond = new AstNode(AstType.COND, condIn)
      .addChild(left)
      .addChild(...args);
    
    if (!condNot) {
      return cond;
    }

    return new AstNode(AstType.COND, condNot).addChild(cond);
  }

  GetCondLike = () => {
    const left = this.GetOperand();

    if (!left) {
      return null;
    }

    const condNot = this.TryTextMatch('NOT');
    const condLike = this.TryTextMatch('LIKE');

    if (!condLike) {
      return null;
    }

    const right = this.GetOperand();

    if (!right) {
      return null;
    }

    const cond = new AstNode(AstType.COND, condLike)
      .addChild(left)
      .addChild(right);
    
    if (!condNot) {
      return cond;
    }

    return new AstNode(AstType.COND, condNot).addChild(cond);
  }

  GetCondBetween = () => {
    const left = this.GetOperand();

    if (!left) {
      return null;
    }

    const condNot = this.TryTextMatch('NOT');
    const condBetween = this.TryTextMatch('BETWEEN');

    if (!condBetween) {
      return null;
    }

    const argLeft = this.GetOperand();

    if (!argLeft) {
      return null;
    }

    if (!this.TryTextMatch('AND')) {
      return null;
    }

    const argRight = this.GetOperand();

    if (!argRight) {
      return null;
    }

    const cond = new AstNode(AstType.COND, condBetween)
      .addChild(left)
      .addChild(argLeft)
      .addChild(argRight);
    
    if (!condNot) {
      return cond;
    }

    return new AstNode(AstType.COND, condNot).addChild(cond);
  }

  GetCondIsNull = () => {
    const left = this.GetOperand();

    if (!left) {
      return null;
    }

    const condIs = this.TryTextMatch('IS');

    if (!condIs) {
      return null;
    }

    const condNot = this.TryTextMatch('NOT');
    const condNull = this.TryTextMatch('NULL');

    if (!condNull) {
      return null;
    }

    const text = condIs + ' ' + condNull;

    const cond = new AstNode(AstType.COND, text).addChild(left);
    
    if (!condNot) {
      return cond;
    }
    
    return new AstNode(AstType.COND, condNot).addChild(cond);
  }

  GetExprNot = () => {
    const condNot = this.TryTextMatch('NOT');

    if (!condNot) {
      return null;
    }

    const right = this.GetExpression();

    if (!right) {
      return null;
    }

    return new AstNode(AstType.COND, condNot).addChild(right);
  }

  GetExprGroup = () => {
    if (!this.TryTextMatch('(')) {
      return null;
    }

    const expr = this.GetExpression();

    if (!expr) {
      return null;
    }
    
    if (!this.TryTextMatch(')')) {
      return null;
    }

    return expr;
  }

  GetCondition = () => {
    return this.TryNodeMatch(
      this.GetOpCmp,
      this.GetCondIn,
      this.GetCondLike,
      this.GetCondBetween,
      this.GetCondIsNull,
      this.GetExprNot,
      this.GetExprGroup,
      this.GetOperand
    );
  }

  GetAndCondition = () => {
    let left = this.GetCondition();

    if (!left) {
      return null;
    }

    for (;;) {
      const condAnd = this.TryTextMatch('AND');

      if (!condAnd) {
        return left;
      }

      const right = this.GetAndCondition();

      if (!right) {
        return null;
      }

      left = new AstNode(AstType.COND, condAnd)
        .addChild(left)
        .addChild(right);
    }
  }

  GetExpression = () => {
    let left = this.GetAndCondition();

    if (!left) {
      return null;
    }

    for (;;) {
      const condOr = this.TryTextMatch('OR');

      if (!condOr) {
        return left;
      }

      const right = this.GetExpression();

      if (!right) {
        return null;
      }

      left = new AstNode(AstType.COND, condOr)
        .addChild(left)
        .addChild(right);
    }
  }

  Parse() {
    const expr = this.GetExpression();

    if (!expr) {
      return null;
    }

    return expr;
  }

  static Parse(text) {
    return new Parser(text).Parse();
  }
}

class Executor {
  _node = null;

  constructor(node) {
    this._node = node;
  }

  Compute = async(node, ctx) => {
    switch (node.Type) {
      case AstType.NULL:
        return null;
      
      case AstType.BOOL:
        return node.Text === 'TRUE';
      
      case AstType.NUM:
        return Number(node.Text);
      
      case AstType.STR:
        return node.Text;
      
      case AstType.ATTR:
        return await ctx.getAttr(node.Text);
      
      case AstType.FUNC:
        const func = ctx.getFunc(node.Text);
        const args = await Promise.all(node.Childs.map((child) => this.Compute(child, ctx)));

        return await func(...args);
      
      case AstType.OP:
        const [left, right] = await Promise.all(node.Childs.map((child) => this.Compute(child, ctx)));

        switch (node.Text) {
          case '=':
            return left === right;

          case '<>':
          case '!=':
            return left !== right;
        }

        if (typeof left !== typeof right) {
          throw new Error('Types arguments is not equal');
        }

        if (typeof left === 'string') {
          switch (node.Text) {
            case '<':
              return left < right;
            
            case '>':
              return left > right;
            
            case '<=':
              return left <= right;
            
            case '>=':
              return left >= right;

            case '+':
              return left + right;
            
            default:
              throw new Error('String support only + operation');
          }
        }

        if (typeof left !== 'number') {
          throw new Error('Type left and right arguments is not number');
        }

        switch (node.Text) {            
          case '<':
            return left < right;
          
          case '>':
            return left > right;
          
          case '<=':
            return left <= right;
          
          case '>=':
            return left >= right;

          case '+':
            return left + right;
          
          case '-':
            return left - right;
          
          case '*':
            return left * right;
          
          case '/':
            return left / right;

          case '%':
            return left % right;
          
          case '//':
            return (left - left % right) / right; 
          
          default:
            throw new Error('Number support +,-,*,/,%,// operation');
        }
      
      case AstType.COND:
        switch (node.Text) {
          case 'NOT': {
            const [arg] = await Promise.all(node.Childs.map((child) => this.Compute(child, ctx)));

            if (typeof arg !== 'boolean') {
              throw new Error('Type is not BOOL');
            }

            return !arg;
          }
          
          case 'AND': {
            const [nodeLeft, nodeRight] = node.Childs;
            const left = await this.Compute(nodeLeft, ctx);

            if (typeof left !== 'boolean') {
              throw new Error('Type left argument is not BOOL');
            }

            if (!left) {
              return false;
            }

            const right = await this.Compute(nodeRight, ctx);

            if (typeof right !== 'boolean') {
              throw new Error('Type right argument is not BOOL');
            }

            return right;
          }
          
          case 'OR': {
            const [nodeLeft, nodeRight] = node.Childs;
            const left = await this.Compute(nodeLeft, ctx);

            if (typeof left !== 'boolean') {
              throw new Error('Type left argument is not BOOL');
            }

            if (left) {
              return true;
            }

            const right = await this.Compute(nodeRight, ctx);

            if (typeof right !== 'boolean') {
              throw new Error('Type right argument is not BOOL');
            }

            return right;
          }
          
          case 'IN': {
            const [value, args] = await Promise.all(node.Childs.map((child) => this.Compute(child, ctx)));

            return args.includes(value);
          }

          case 'LIKE': {
            const [value, pattern] = await Promise.all(node.Childs.map((child) => this.Compute(child, ctx)));

            if (typeof value !== 'string' || typeof pattern !== 'string') {
              throw new Error('Type is not string');
            }

            throw new Error('Beta =)');
          }

          case 'BETWEEN': {
            const [value, start, end] = await Promise.all(node.Childs.map((child) => this.Compute(child, ctx)));

            if (typeof value !== 'number' || typeof value !== typeof start || typeof value !== typeof end) {
              throw new Error('Value is not number');
            }

            return value >= start && value <= end;
          }

          case 'IS NULL': {
            const [arg] = await Promise.all(node.Childs.map((child) => this.Compute(child, ctx)));

            return arg === null;
          }
  
          default:
            throw new Error(`Cond not found: ${node.Text}`);
        }

      default:
        throw new Error(`Node type is not found: ${node.Type}`);
    }
  }

  Execute = async(ctx) => {
    const result = await this.Compute(this._node, ctx);

    if (typeof result !== 'boolean') {
      throw new Error('Type is not boolean');
    }

    return result;
  }

  static Execute(node, ctx) {
    return new Executor(node).Execute(ctx);
  }
}

class Context {
  _data = null;
  _funcs = null;

  constructor(data) {
    this._data = data;
    this._funcs = new Map();
  }

  // Temp
  getAttr = (path) => {
    let data = this._data;

    for (const key of path.split('.')) {
      if (!(typeof data === 'object' && key in data)) {
        throw new Error('Attr not found');
      }

      data = data[key];
    }

    return data;
  }

  getFunc = (name) => {
    if (!this._funcs.has(name)) {
      throw new Error('Function not found');
    }
    
    return this._funcs.get(name);
  }

  addFunc = (name, func) => {
    if (this._funcs.has(name)) {
      throw new Error(`Func this name exists: ${name}`);
    }

    this._funcs.set(name, func);
  }

  removeFunc = (name) => {
    return this._funcs.delete(name);
  }
}

const ctx = new Context({
  userId: 1,
  nickname: 'nickname_1',
  settings: {
    tz: 100,
    lang: 'ru-RU'
  },
  tasks: [{ id: 123, title: 189, ownerId: 1 /* userId */ }]
});

ctx.addFunc('get_by_idx', function (arr, idx) {
  if (arguments.length !== 2) {
    throw new Error('Arguments length error');
  }

  if (!Array.isArray(arr)) {
    throw new Error('First argument is not array');
  }

  if (!Number.isInteger(idx)) {
    throw new Error('Second argument is not integer');
  }

  if (idx < 0 || idx >= arr.length) {
    throw new Error('Out of range array');
  }

  return arr[idx];
});

ctx.addFunc('get_by_path', function (obj, path) {
  if (arguments.length !== 2) {
    throw new Error('Arguments length error');
  }

  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error('First argument is not object');
  }

  if (typeof path !== 'string') {
    throw new Error('Second argument is not string');
  }

  let data = obj;

  for (const key of path.split('.')) {
    if (!(typeof data === 'object' && key in data)) {
      throw new Error('Key not found');
    }

    data = data[key];
  }

  return data;
});

Executor.Execute(Parser.Parse(`userId = 1 AND userId = get_by_path(get_by_idx(tasks, 0), 'ownerId')`), ctx)
  .then(console.log);
