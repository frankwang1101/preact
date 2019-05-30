import { diff, unmount } from './index'
import { coerceToVNode, Fragment } from '../create-element'
import { EMPTY_OBJ, EMPTY_ARR } from '../constants'
import { removeNode } from '../util'

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../internal').VNode} newParentVNode The new virtual
 * node whose children should be diff'ed against oldParentVNode
 * @param {import('../internal').VNode} oldParentVNode The old virtual
 * node whose children should be diff'ed against newParentVNode
 * @param {object} context The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} mounts The list of components
 * which have mounted
 * @param {import('../internal').Component} ancestorComponent The direct parent
 * component to the ones being diffed
 */
export function diffChildren(
  parentDom,
  newParentVNode,
  oldParentVNode,
  context,
  isSvg,
  excessDomChildren,
  mounts,
  ancestorComponent
) {
  let childVNode,
    i,
    j,
    p,
    index,
    oldVNode,
    newDom,
    nextDom,
    sibDom,
    focus,
    childDom
  /**
   * newChildren 的 组成：
   * create时：
   * props中的children(可能是多维数组，将其降维)
   * vnode中储存的_children, create diff 时无内容，目的是初始化_children
   * coerceToVNode, 用于将非vnode类型转换成 vnode
   * update时：
   * 存在_children, 直接使用即可
  */
  let newChildren =
    newParentVNode._children ||
    toChildArray(
      newParentVNode.props.children,
      (newParentVNode._children = []),
      coerceToVNode
    )
  // oldParentVNode._children 或者空数组
  let oldChildren =
    (oldParentVNode != null &&
      oldParentVNode != EMPTY_OBJ &&
      oldParentVNode._children) ||
    EMPTY_ARR

  let oldChildrenLength = oldChildren.length
  // childDom 设置为 oldChildren的第一个dom ？
  for (i = 0; i < oldChildrenLength; i++) {
    if (oldChildren[i] && oldChildren[i]._dom) {
      childDom = oldChildren[i]._dom
      break
    }
  }
  // 如果存在 excessDomChildren（dom上绑定的旧childNodes）, childDom设置为其第一个元素（如果存在）
  if (excessDomChildren != null) {
    for (i = 0; i < excessDomChildren.length; i++) {
      if (excessDomChildren[i] != null) {
        childDom = excessDomChildren[i]
        break
      }
    }
  }
  // 遍历 newChildren
  for (i = 0; i < newChildren.length; i++) {
    // 转换非vnode远古三
    childVNode = newChildren[i] = coerceToVNode(newChildren[i])
    oldVNode = index = null

    // Check if we find a corresponding element in oldChildren and store the
    // index where the element was found.
    /**
     * 判断是否找到一个 key type相应的vnode，index设置为其 index （i）
     * 没有找到，遍历旧vnode，找看看有没有
    */
    p = oldChildren[i]
    if (
      p != null &&
      (childVNode.key == null && p.key == null
        ? childVNode.type === p.type
        : childVNode.key === p.key)
    ) {
      index = i
    } else {
      /**
       * 这里会寻找 key 和 type相同的 vnode进行复用
       * 正因如此，同个组件在一个层级用多次，没有用key区分，会合并
       */
      for (j = 0; j < oldChildrenLength; j++) {
        p = oldChildren[j]
        if (p != null) {
          if (
            childVNode.key == null && p.key == null
              ? childVNode.type === p.type
              : childVNode.key === p.key
          ) {
            index = j
            break
          }
        }
      }
    }

    // If we have found a corresponding old element we store it in a variable
    // and delete it from the array. That way the next iteration can skip this
    // element.
    /**
     * 如果以上操作找到相应的index，将其设置到oldVNode中，同时数组(oldChilren)对应位置置空
     * 当oldVNode存在
     */
    if (index != null) {
      oldVNode = oldChildren[index]
      oldChildren[index] = null
    }

    // nextDom -》 childDom 不为空时，设置为其下一个dom，用于给下一个vnode更新到dom中
    nextDom = childDom != null && childDom.nextSibling
    // diff将当前的dom更新，此操作会递归遍历所有的子dom
    // Morph the old element into the new one, but don't append it to the dom yet
    newDom = diff(
      oldVNode == null ? null : oldVNode._dom,
      parentDom,
      childVNode,
      oldVNode,
      context,
      isSvg,
      excessDomChildren,
      mounts,
      ancestorComponent,
      null
    )

    // Only proceed if the vnode has not been unmounted by `diff()` above.
    // 假设两者存在
    if (childVNode != null && newDom != null) {
      // Store focus in case moving children around changes it. Note that we
      // can't just check once for every tree, because we have no way to
      // differentiate wether the focus was reset by the user in a lifecycle
      // hook or by reordering dom nodes.
      // 缓存 active, 每个diffChildren都要如此操作
      focus = document.activeElement

      if (childVNode._lastDomChild != null) {
        // Only Fragments or components that return Fragment like VNodes will
        // have a non-null _lastDomChild. Continue the diff from the end of
        // this Fragment's DOM tree.
        // 只有 fragments 或者组件函数返回fragment的vnode会有非空的 lastDomChild、
        newDom = childVNode._lastDomChild
      } else if (
        excessDomChildren == oldVNode ||
        newDom != childDom ||
        newDom.parentNode == null
      ) {
        // what.
        // NOTE: excessDomChildren==oldVNode above:
        // This is a compression of excessDomChildren==null && oldVNode==null!
        // The values only have the same type when `null`.
        // 没有childDom ，或者childDom的父dom跟形参parentDom不同，此时给parentDom中添加生成的newDom
        outer: if (childDom == null || childDom.parentNode !== parentDom) {
          parentDom.appendChild(newDom)
        } else {
          // 否则，newDom添加在childDom之前
          sibDom = childDom
          j = 0
          while ((sibDom = sibDom.nextSibling) && j++ < oldChildrenLength / 2) {
            if (sibDom === newDom) {
              break outer
            }
          }
          parentDom.insertBefore(newDom, childDom)
        }
      }

      // Restore focus if it was changed
      if (focus !== document.activeElement) {
        focus.focus()
      }
      // 对下一个dom进行比较更新
      childDom = newDom != null ? newDom.nextSibling : nextDom
    }
  }

  // 接下来的的操作是删除剩余的vnode 和 dom

  // Remove children that are not part of any vnode. Only used by `hydrate`
  if (excessDomChildren != null && newParentVNode.type !== Fragment)
    for (i = excessDomChildren.length; i--; )
      if (excessDomChildren[i] != null) removeNode(excessDomChildren[i])

  // Remove remaining oldChildren if there are any.
  for (i = oldChildrenLength; i--; )
    if (oldChildren[i] != null) unmount(oldChildren[i], ancestorComponent)
}

/**
 * Flatten a virtual nodes children to a single dimensional array
 * vnode children数组 降维 通过闭包引用flattened将元素存入，
 * map中将 基本类型（number, bool）转成
 * vnode
 * @param {import('../index').ComponentChildren} children The unflattened
 * children of a virtual node
 * @param {Array<import('../internal').VNode | null>} [flattened] An flat array of children to modify
 * */
export function toChildArray(children, flattened, map) {
  if (flattened == null) flattened = []
  if (children == null || typeof children === 'boolean') {
  } else if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      toChildArray(children[i], flattened)
    }
  } else {
    flattened.push(map ? map(children) : children)
  }

  return flattened
}
