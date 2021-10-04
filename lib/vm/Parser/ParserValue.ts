import {Char, Constant, AstType} from '../Enums'
import {AstNode} from '../AstNode'
import {ParserBase} from './ParserBase'

export class ParserValue extends ParserBase {
  get isDigit () {
    return !this.isEnd && /[0-9]/.test(this.currentChar)
  }

  private getDigits () {
    let digitsText = ''

    for (; this.isDigit; this.next()) {
      digitsText += this.currentChar
    }

    return digitsText
  }

  private getNull () {
    const constNull = this.searchIText(Constant.Null)

    if (constNull) {
      return new AstNode(AstType.Null, null)
    }

    return null
  }

  private getBool () {
    const constBool = this.searchIText(Constant.False, Constant.True)
    
    if (constBool) {
      return new AstNode(AstType.Bool, Constant.True === constBool)
    }

    return null
  }

  private getNum () {
    let s = this.searchText(Char.Plus, Char.Minus)
    let e = this.getDigits()
    let p = this.searchText(Char.Period)
    let m = p ? this.getDigits() : ''

    if (!(e || m)) {
      if (s || p) {
        throw new Error('Expected number')
      }

      return null
    }

    this.skip()

    m = m.replace(/0+$/, '')

    if (!m) {
      p = ''
    }

    e = e.replace(/^0+/, '').padEnd(1, '0')

    if (s !== Char.Minus) {
      s = ''
    }

    return new AstNode(AstType.Num, Number(s + e + p + m))
  }

  private getStr () {
    if (!this.searchText(Char.Apos)) {
      return null
    }

    let text = ''

    for (;;) {
      for (; !this.isEnd && this.currentChar !== Char.Apos; this.next()) {
        text += this.currentChar
      }

      if (!this.searchText(Char.Apos.repeat(2))) {
        break
      }

      text += Char.Apos
    }

    if (!this.searchText(Char.Apos)) {
      throw new Error('Expected string')
    }

    this.skip()

    return new AstNode(AstType.Str, text)
  }

  getValue () {
    return this.searchNode(
      this.getNull,
      this.getBool,
      this.getNum,
      this.getStr
    )
  }
}
