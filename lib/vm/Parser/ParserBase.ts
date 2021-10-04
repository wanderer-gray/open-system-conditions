import {AstNode} from '../AstNode'

export class ParserBase {
  private readonly source: string
  private readonly iSource: string

  private position = 0

  constructor (source: string) {
    source = source.trim()

    this.source = source
    this.iSource = this.convertToIText(source)
  }

  private convertToIText (text: string) {
    return text.toUpperCase()
  }

  get isEnd () {
    return this.source.length <= this.position
  }

  get currentChar () {
    if (this.isEnd) {
      throw new Error('End of source');
    }

    return this.source[this.position]
  }

  next () {
    if (!this.isEnd) {
      this.position++
    }
  }

  skip () {
    const whitespace = /[\s\uFEFF\xA0]/

    while (!this.isEnd && whitespace.test(this.currentChar)) {
      this.next()
    }
  }

  searchText (...texts: Array<string>) {
    for (const text of texts) {
      if (this.source.startsWith(text, this.position)) {
        this.position += text.length

        this.skip()

        return text
      }
    }

    return null
  }

  searchIText (...texts: Array<string>) {
    for (const text of texts) {
      if (this.iSource.startsWith(this.convertToIText(text), this.position)) {
        this.position += text.length

        this.skip()

        return text
      }
    }

    return null
  }

  searchNode (...parsers: Array<() => AstNode | null>) {
    const {position} = this

    for (const parser of parsers) {
      const node: AstNode | null = parser.call(this)

      if (node) {
        return node
      }

      this.position = position
    }

    return null
  }
}
