import {Char, Constant, AstType, CmpOp, BoolOp} from '../Enums'
import {AstNode} from '../AstNode'
import {ParserOperand} from './ParserOperand'

export class ParserExpression extends ParserOperand {
  private getCmpOperand (left: AstNode) {
    return () => {
      const cmpOp = this.searchText(CmpOp.Eq, CmpOp.NotEq, CmpOp.LtE, CmpOp.Lt, CmpOp.GtE, CmpOp.Gt)

      if (!cmpOp) {
        return null
      }

      const right = this.getOperand()

      if (!right) {
        throw new Error('Expected operand')
      }

      return new AstNode(AstType.CmpOp, cmpOp).addChild(left, right)
    }
  }

  private getInOperands (left: AstNode) {
    return () => {
      const boolNot = this.searchIText(BoolOp.Not)
      const cmpIn = this.searchIText(CmpOp.In)

      if (!cmpIn) {
        return null
      }
      
      if (!this.searchText(Char.Lpar)) {
        throw new Error('Expected lpar')
      }

      const args: Array<AstNode> = []

      do {
        const arg = this.getOperand()

        if (!arg) {
          throw new Error('Expected operand')
        }

        args.push(arg)
      } while (this.searchText(Char.Comma))
      
      if (!this.searchText(Char.Rpar)) {
        throw new Error('Expected rpar')
      }

      const result = new AstNode(AstType.CmpOp, cmpIn).addChild(left, ...args)
      
      if (!boolNot) {
        return result
      }

      return new AstNode(AstType.BoolOp, boolNot).addChild(result)
    }
  }

  private getLikeOperand (left: AstNode) {
    return () => {
      const boolNot = this.searchIText(BoolOp.Not)
      const cmpLike = this.searchIText(CmpOp.Like)

      if (!cmpLike) {
        return null
      }
      
      const right = this.getOperand() // !!!

      if (!right) {
        throw new Error('Expected operand')
      }

      const result = new AstNode(AstType.CmpOp, cmpLike).addChild(left, right)
      
      if (!boolNot) {
        return result
      }

      return new AstNode(AstType.BoolOp, boolNot).addChild(result)
    }
  }

  private getBetweenOperands (left: AstNode) {
    return () => {
      const boolNot = this.searchIText(BoolOp.Not)
      const cmpBetween = this.searchIText(CmpOp.Between)

      if (!cmpBetween) {
        return null
      }

      const start = this.getOperand()

      if (!start) {
        throw new Error('Expected operand')
      }

      if (!this.searchIText('AND')) {
        throw new Error('Expected AND')
      }

      const end = this.getOperand()

      if (!end) {
        throw new Error('Expected operand')
      }

      const result = new AstNode(AstType.CmpOp, cmpBetween).addChild(left, start, end)
      
      if (!boolNot) {
        return result
      }

      return new AstNode(AstType.BoolOp, boolNot).addChild(result)
    }
  }

  private getIsNull (left: AstNode) {
    return () => {
      const cmpIs = this.searchIText(CmpOp.Is)

      if (!cmpIs) {
        return null
      }

      const boolNot = this.searchIText(BoolOp.Not)

      if (!this.searchIText(Constant.Null)) {
        throw new Error(`Expected ${Constant.Null}`)
      }

      const result = new AstNode(AstType.CmpOp, cmpIs).addChild(left)
      
      if (!boolNot) {
        return result
      }

      return new AstNode(AstType.BoolOp, boolNot).addChild(result)
    }
  }

  private getOperands () {
    const left = this.getOperand()

    if (!left) {
      return null
    }

    const result = this.searchNode(
      this.getCmpOperand(left),
      this.getInOperands(left),
      this.getLikeOperand(left),
      this.getBetweenOperands(left),
      this.getIsNull(left)
    )
    
    if (result) {
      return result
    }

    return left
  }

  private getNotExpression () {
    const boolNot = this.searchIText(BoolOp.Not)

    if (!boolNot) {
      return null
    }

    const expression = this.getExpression()

    if (!expression) {
      throw new Error('Expected expression')
    }

    return new AstNode(AstType.BoolOp, boolNot).addChild(expression)
  }

  private getGroupExpression () {
    if (!this.searchText(Char.Lpar)) {
      return null
    }

    const expression = this.getExpression()

    if (!expression) {
      throw new Error('Expected expression')
    }

    if (!this.searchText(Char.Rpar)) {
      throw new Error('Expected rpar')
    }

    return expression
  }

  private getCondition () {
    return this.searchNode(
      this.getOperands,
      this.getNotExpression,
      this.getGroupExpression
    )
  }

  private getAndCondition () {
    let left = this.getCondition()

    if (!left) {
      return null
    }

    for (;;) {
      const boolAnd = this.searchIText(BoolOp.And)

      if (!boolAnd) {
        return left
      }

      const right = this.getCondition()

      if (!right) {
        throw new Error('Expected operand')
      }

      left = new AstNode(AstType.BoolOp, boolAnd).addChild(left, right)
    }
  }

  private getOrCondition () {
    let left = this.getAndCondition()

    if (!left) {
      return null
    }

    for (;;) {
      const boolOr = this.searchIText(BoolOp.Or)

      if (!boolOr) {
        return left
      }

      const right = this.getAndCondition()

      if (!right) {
        throw new Error('Expected andOperand')
      }

      left = new AstNode(AstType.BoolOp, boolOr).addChild(left, right)
    }
  }

  getExpression () : AstNode | null {
    return this.getOrCondition()
  }
}
