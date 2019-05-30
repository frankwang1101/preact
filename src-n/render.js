import { EMPTY_OBJ, EMPTY_ARR } from './constants'
import { commitRoot } from './diff/index'
import { diffChildren } from './diff/children'
import { createElement, Fragment } from './create-element'
import options from './options'

/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 */
export function render(vnode, parentDom) {
  // debug模式, 在debug模式下会对vnode的render diff等函数做切面以进行错误检测
  if (options.root) options.root(vnode, parentDom)
  // 获取前一个 vnode？ 目测在dom中会设置当前vnode和前一个vnode
  let oldVNode = parentDom._prevVNode
  // 创建新的vnode，Fragment是一个空函数， 相当于工厂函数，cildren是 vnode组成的数组
  vnode = createElement(Fragment, null, [vnode])
  let mounts = []
  // 对比dom的children， 首先将 生成的vnode设置给 dom的_prevVnode，
  // 然后进行对比
  // ctx = empty_obj
  // isSvg 通过 ownerSVGElement判断
  // excessElement，代表旧vnode的子vnode
  // 深度遍历(后置)children将component存到mounts中
  diffChildren(
    parentDom,
    (parentDom._prevVNode = vnode),
    oldVNode,
    EMPTY_OBJ,
    parentDom.ownerSVGElement !== undefined,
    oldVNode ? null : EMPTY_ARR.slice.call(parentDom.childNodes),
    mounts,
    vnode
  )
  // 通知完成即 componentDidMount，由此可知其顺序为由里到外，顺序执行
  commitRoot(mounts, vnode)
}

/**
 * Update an existing DOM element with data from a Preact virtual node
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * update
 */
export function hydrate(vnode, parentDom) {
  parentDom._prevVNode = null
  render(vnode, parentDom)
}
