import {AstType, BinOp, CmpOp} from '../Enums'
import {AstNode} from '../AstNode'

export class Optimizer {
  private readonly tree: AstNode

  constructor(tree: AstNode) {
    this.tree = tree.clone()
  }

  Optimize () {
    
  }
}

function optimize (node: AstNode) {
  switch (node.type) {
    case AstType.Null:
    case AstType.Bool:
    case AstType.Num:
    case AstType.Str:
    case AstType.Attr:
      return node
    
    case AstType.Func: {
      const args = optimizeChilds(node)

      return node.setChild(...args)
    }
    
    case AstType.BinOp: {
      const [left, right] = optimizeChilds(node)

      if (!(
        isNum(left) || isStr(left) || isAttr(left) || isFunc(left) || isBinOp(left) ||
        isNum(right) || isStr(right) || isAttr(right) || isFunc(right) || isBinOp(right)
      )) {
        throw new Error('Expected operand with BinOp support')
      }

      if (
        isAttr(left) || isFunc(left) || isBinOp(left) ||
        isAttr(right) || isFunc(right) || isBinOp(right)
      ) {
        return node.setChild(left, right)
      }

      if (left.type !== right.type) {
        throw new Error('Operators have different data types')
      }
      
      if (isNum(left)) {
        const leftValue = <number>left.value
        const rightValue = <number>right.value

        switch (node.value) {
          case BinOp.Add:
            return new AstNode(AstType.Num, leftValue + rightValue)
          
          case BinOp.Sub:
            return new AstNode(AstType.Num, leftValue - rightValue)
          
          case BinOp.Mult:
            return new AstNode(AstType.Num, leftValue * rightValue)
        }

        if (rightValue === 0) {
          throw new Error('Division by zero')
        }

        switch (node.value) {
          case BinOp.Div:
            return new AstNode(AstType.Num, leftValue / rightValue)
          
          case BinOp.Mod:
            return new AstNode(AstType.Num, leftValue % rightValue)
          
          case BinOp.FloorDiv:
            return new AstNode(AstType.Num, (leftValue - leftValue % rightValue) / rightValue)
        }
      }

      if (node.value !== BinOp.Add) {
        throw new Error('Strings only support the addition operation')
      }

      return new AstNode(AstType.Str, <string>left.value + <string>right.value)
    }

    case AstType.CmpOp: {
      const args = optimizeChilds(node)

      switch (node.value) {
        default: {
          const [left, right] = args

          
        }
      }

      return node.setChild(...args)
    }
  }
}

function optimizeChilds (node: AstNode) : Array<AstNode> {
  return node.childs.map((child) => optimize(child))
}

function isNum (node: AstNode) {
  return node.type === AstType.Num
}

function isStr (node: AstNode) {
  return node.type === AstType.Str
}

function isAttr (node: AstNode) {
  return node.type === AstType.Attr
}

function isFunc (node: AstNode) {
  return node.type === AstType.Func
}

function isBinOp (node: AstNode) {
  return node.type === AstType.BinOp
}
