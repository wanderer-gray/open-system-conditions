export enum Char {
  Plus = '+',
  Minus = '-',
  Period = '.',
  Apos = `'`,
  Lpar = '(',
  Rpar = ')',
  Comma = ','
}

export enum Constant {
  Null = 'NULL',
  False = 'FALSE',
  True = 'TRUE'
}

export enum AstType {
  Null,
  Bool,
  Num,
  Str,
  Attr,
  Func,
  BinOp,
  CmpOp,
  BoolOp
}

export enum BinOp {
  Add = '+',
  Sub = '-',
  Mult = '*',
  Div = '/',
  Mod = '%',
  FloorDiv = '//'
}

export enum CmpOp {
  Eq = '=',
  NotEq = '!=',
  Lt = '<',
  LtE = '<=',
  Gt = '>',
  GtE = '>=',
  In = 'IN',
  Like = 'LIKE',
  Between = 'BETWEEN',
  Is = 'IS'
}

export enum BoolOp {
  Not = 'NOT',
  And = 'AND',
  Or = 'OR'
}
