import {ParserExpression} from './ParserExpression'

export class Parser extends ParserExpression {
  Parse () {
    const expression = this.getExpression()

    if (!expression) {
      throw new Error('Expected expression')
    }

    return expression
  }

  static Parse (source: string) {
    return new Parser(source).Parse()
  }
}
