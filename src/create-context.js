import { enqueueRender } from './component';

export let i = 0;

/**
 *
 * @param {any} defaultValue
 */
export function createContext(defaultValue) {
  // 初始化 ctx
  const ctx = {};
  // 创建context
	const context = {
		_id: '__cC' + i++,
		_defaultValue: defaultValue,
		Consumer(props, context) {
      // 即 <Context.Consumer>{function aa() {}}</Context.Consumer> === aa(context), 主要是为了将context传给子组件
			return props.children(context);
		},
		Provider(props) {
      // 没有getChildContext代表未初始化
			if (!this.getChildContext) {
        const subs = [];
        // 在Provider方法初始化vnode时，绑定this到ctx上，便于子组件sub
				this.getChildContext = () => {
					ctx[context._id] = this;
					return ctx;
        };
        /**
         * 在provider里附加了生命周期，在provider的vnode改变->触发render->diff provider->触发scu的流程最终会进到这里
         * 此时会将已挂载的vnode放入更新队列中，同时要改变该依赖的context，注意更新的是包裹着组件的Consumer
         */
				this.shouldComponentUpdate = props => {
					subs.some(c => {
						// Check if still mounted
						if (c._parentDom) {
							c.context = props.value;
							enqueueRender(c);
						}
					});
        };
        // 添加 sub 函数，添加需要依赖组件
        // 在 diff 函数，type为 function时会判断是否存在sub，存在则调用sub,sub是provider在getChildContext中获得的context透传下来的context.sub
				this.sub = (c) => {
          subs.push(c);
          // unmount 删除依赖，因此时已无法渲染
					let old = c.componentWillUnmount;
					c.componentWillUnmount = () => {
						subs.splice(subs.indexOf(c), 1);
						old && old.call(c);
					};
				};
			}
			return props.children;
		}
	};
  // 此处会
	context.Consumer.contextType = context;

	return context;
}
