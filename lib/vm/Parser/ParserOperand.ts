import {Char, AstType, BinOp} from '../Enums'
import {AstNode} from '../AstNode'
import {ParserValue} from './ParserValue'

export class ParserOperand extends ParserValue {  
  get isLetter () {
    return !this.isEnd && /[_a-zA-Z]/.test(this.currentChar)
  }

  get isLetterOrDigit () {
    return this.isDigit || this.isLetter
  }

  private getFunc () {
    if (!this.isLetter) {
      return null
    }

    let text = ''

    for (; this.isLetterOrDigit; this.next()) {
      text += this.currentChar;
    }

    if (!this.searchText(Char.Lpar)) {
      return null
    }

    const args : Array<AstNode> = []

    for (let arg = this.getOperand(); arg;) {
      args.push(arg)

      if (!this.searchText(Char.Comma)) {
        break
      }

      arg = this.getOperand()

      if (!arg) {
        throw new Error('Expected operand')
      }
    }

    if (!this.searchText(Char.Rpar)) {
      throw new Error('Expected rpar')
    }

    return new AstNode(AstType.Func, text).addChild(...args)
  }

  private getAttr () {
    if (!this.isLetter) {
      return null
    }

    let text = ''

    for (;;) {
      if (!this.isLetter) {
        throw new Error('Expected letter')
      }

      for (; this.isLetterOrDigit; this.next()) {
        text += this.currentChar
      }

      if (!this.searchText(Char.Period)) {
        break
      }

      text += Char.Period
    }

    this.skip()

    return new AstNode(AstType.Attr, text)
  }

  private getGroup () {
    if (!this.searchText(Char.Lpar)) {
      return null
    }

    const operand = this.getOperand()

    if (!operand) {
      throw new Error('Expected operand')
    }

    if (!this.searchText(Char.Rpar)) {
      throw new Error('Expected rpar')
    }

    return operand
  }

  private getTerm () {
    return this.searchNode(
      this.getValue,
      this.getFunc,
      this.getAttr,
      this.getGroup
    )
  }

  private getFactor () {
    let left = this.getTerm()

    if (!left) {
      return null
    }

    for (;;) {
      const binOp = this.searchText(BinOp.Mult, BinOp.FloorDiv, BinOp.Div, BinOp.Mod)

      if (!binOp) {
        return left
      }

      const right = this.getTerm()

      if (!right) {
        throw new Error('Expected term')
      }

      left = new AstNode(AstType.BinOp, binOp).addChild(left, right)
    }
  }

  private getSummand () {
    let left = this.getFactor()

    if (!left) {
      return null
    }

    for (;;) {
      const binOp = this.searchText(BinOp.Add, BinOp.Sub)

      if (!binOp) {
        return left
      }

      const right = this.getFactor()

      if (!right) {
        throw new Error('Expected factor')
      }

      left = new AstNode(AstType.BinOp, binOp).addChild(left, right)
    }
  }

  getOperand () : AstNode | null {
    return this.getSummand()
  }
}
