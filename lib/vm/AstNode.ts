import {AstType} from './Enums'

export class AstNode {
  readonly type: AstType
  readonly value: null | boolean | number | string
  readonly childs: Array<AstNode>

  constructor (type: AstType, value: null | boolean | number | string) {
    this.type = type
    this.value = value
    this.childs = []
  }

  setChild (...childs: Array<AstNode>) {
    this.childs.splice(0, this.childs.length, ...childs)

    return this
  }

  addChild (...childs: Array<AstNode>) {
    this.childs.push(...childs)

    return this
  }

  clone () {
    const childs : Array<AstNode> = this.childs.map((child) => child.clone())

    return new AstNode(this.type, this.value).setChild(...childs)
  }
}
