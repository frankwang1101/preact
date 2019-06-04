import { options } from 'preact';

/** @type {number} */
let currentIndex;

/** @type {import('./internal').Component} */
let currentComponent;

/** @type {Array<import('./internal').Component>} */
let afterPaintEffects = [];
// 利用传入的vnode获取其component引用并添加计数，同时更新effect
// 获取的引用在render时以闭包的形式提供给hook使用
let oldBeforeRender = options.render;
options.render = vnode => {
	if (oldBeforeRender) oldBeforeRender(vnode);

	currentComponent = vnode._component;
	currentIndex = 0;

	if (currentComponent.__hooks) {
		currentComponent.__hooks._pendingEffects = handleEffects(currentComponent.__hooks._pendingEffects);
	}
};
// 对diff切面，目的是同步更新layoutffect
let oldAfterDiff = options.diffed;
options.diffed = vnode => {
	if (oldAfterDiff) oldAfterDiff(vnode);

	const c = vnode._component;
	if (!c) return;

	const hooks = c.__hooks;
	if (hooks) {
		hooks._pendingLayoutEffects = handleEffects(hooks._pendingLayoutEffects);
	}
};

// unmount的时候要触发所有 effect的返回函数
let oldBeforeUnmount = options.unmount;
options.unmount = vnode => {
	if (oldBeforeUnmount) oldBeforeUnmount(vnode);

	const c = vnode._component;
	if (!c) return;

	const hooks = c.__hooks;
	if (hooks) {
		hooks._list.forEach(hook => hook._cleanup && hook._cleanup());
	}
};

/**
 * 获取当前的hook，如果没有则创建一个新的
 * index为currentIndx,每次组件调用options.render重新初始化
 * 按照hook调用顺序递增index确保index在render后可以对应
 * Get a hook's state from the currentComponent
 * @param {number} index The index of the hook to get
 * @returns {import('./internal').HookState}
 */
function getHookState(index) {
	if (options.hook) options.hook(currentComponent);
	// Largely inspired by:
	// * https://github.com/michael-klein/funcy.js/blob/f6be73468e6ec46b0ff5aa3cc4c9baf72a29025a/src/hooks/core_hooks.mjs
	// * https://github.com/michael-klein/funcy.js/blob/650beaa58c43c33a74820a3c98b3c7079cf2e333/src/renderer.mjs
	// Other implementations to look at:
	// * https://codesandbox.io/s/mnox05qp8
	const hooks = currentComponent.__hooks || (currentComponent.__hooks = { _list: [], _pendingEffects: [], _pendingLayoutEffects: [] });
  // state储存在hooks._list中
	if (index >= hooks._list.length) {
		hooks._list.push({});
	}
	return hooks._list[index];
}

// use state 相当于 useReducer的curry版
export function useState(initialState) {
  // invokeOrReturn 如果是 fn 调用， 否则 返回
	return useReducer(invokeOrReturn, initialState);
}

export function useReducer(reducer, initialState, init) {

  /** @type {import('./internal').ReducerHookState} */
  // 首先获取一个 state， 此处的currentIndex, 每个组件的render都会重置
  const hookState = getHookState(currentIndex++);
  // 没有 _c 证明没有初始化
	if (!hookState._component) {
    // 获取当前component
		hookState._component = currentComponent;
    // value设置为 一个 初始值 和 一个函数
		hookState._value = [
			!init ? invokeOrReturn(null, initialState) : init(initialState),

			action => {
        // 原理是，首先使用旧值与action获取新值， 初始值为fn则调用返回新值， 否则action为新值
        const nextValue = reducer(hookState._value[0], action);
        // 然后判断新旧是否相等
				if (hookState._value[0]!==nextValue) {
          // 不等则替换value中的值并触发state中引用的组件的setState然后进行更新
          hookState._value[0] = nextValue;
					hookState._component.setState({});
				}
			}
		];
	}

	return hookState._value;
}

/**
 * @param {import('./internal').Effect} callback
 * @param {any[]} args
 */
export function useEffect(callback, args) {

  /** @type {import('./internal').EffectHookState} */
  // 获取或者初始化一个state
  const state = getHookState(currentIndex++);
  // 判断是否参数改变，如果已经有state的话，state会储存上一次的args
	if (argsChanged(state._args, args)) {
    // 改变了，更新value _args
		state._value = callback;
		state._args = args;
    // 将回调推入pendingEffects
    currentComponent.__hooks._pendingEffects.push(state);
    // afterPaint作用是异步的去触发回调（mount)
    // 这里有两个异步 一个是 afterPaint的 raf
    // 一个是flushAfterPaint 的 setTimeout
		afterPaint(currentComponent);
	}
}

/**
 * layoutEffect和effect的区别在于回调放的地方不同
 * pendingLayoutEffects的回调会在diff时执行
 * @param {import('./internal').Effect} callback
 * @param {any[]} args
 */
export function useLayoutEffect(callback, args) {

	/** @type {import('./internal').EffectHookState} */
	const state = getHookState(currentIndex++);
	if (argsChanged(state._args, args)) {
		state._value = callback;
		state._args = args;
		currentComponent.__hooks._pendingLayoutEffects.push(state);
	}
}
// 提供一个 { current: initialValue }, 主要是起到一个memory ref的效果
export function useRef(initialValue) {
	const state = getHookState(currentIndex++);
	if (!state._value) {
		state._value = { current: initialValue };
	}

	return state._value;
}

export function useImperativeHandle(ref, createHandle, args) {
	const state = getHookState(currentIndex++);
	if (argsChanged(state._args, args)) {
		state._args = args;
		ref.current = createHandle();
	}
}

/**
 * 使用 state来判断是返回缓存还是重新运行一个cb
 * @param {() => any} callback
 * @param {any[]} args
 */
export function useMemo(callback, args) {

	/** @type {import('./internal').MemoHookState} */
	const state = getHookState(currentIndex++);
	if (argsChanged(state._args, args)) {
		state._args = args;
		state._callback = callback;
		return state._value = callback();
	}

	return state._value;
}

/**
 * ？？
 * @param {() => void} callback
 * @param {any[]} args
 */
export function useCallback(callback, args) {
	return useMemo(() => callback, args);
}

/**
 * 简化context.consumer
 * @param {import('./internal').PreactContext} context
 */
export function useContext(context) {
	const provider = currentComponent.context[context._id];
	if (!provider) return context._defaultValue;
	const state = getHookState(currentIndex++);
  // This is probably not safe to convert to "!"
  // 利用state判断是否已订阅
	if (state._value == null) {
		state._value = true;
		provider.sub(currentComponent);
	}
	return provider.props.value;
}

/**
 * ？？
 * Display a custom label for a custom hook for the devtools panel
 * @type {<T>(value: T, cb?: (value: T) => string | number) => void}
 */
export function useDebugValue(value, formatter) {
	if (options.useDebugValue) {
		options.useDebugValue(formatter ? formatter(value) : value);
	}
}

// Note: if someone used Component.debounce = requestAnimationFrame,
// then effects will ALWAYS run on the NEXT frame instead of the current one, incurring a ~16ms delay.
// Perhaps this is not such a big deal.
/**
 * Invoke a component's pending effects after the next frame renders
 * @type {(component: import('./internal').Component) => void}
 */
/* istanbul ignore next */
let afterPaint = () => {};

/**
 * After paint effects consumer.
 * 调用已挂载的hook的回调
 */
function flushAfterPaintEffects() {
	afterPaintEffects.some(component => {
		component._afterPaintQueued = false;
		if (component._parentDom) {
			component.__hooks._pendingEffects = handleEffects(component.__hooks._pendingEffects);
		}
	});
	afterPaintEffects = [];
}

function scheduleFlushAfterPaint() {
	setTimeout(flushAfterPaintEffects);
}

/* istanbul ignore else */
if (typeof window !== 'undefined') {
	afterPaint = (component) => {
		if (!component._afterPaintQueued && (component._afterPaintQueued = true) && afterPaintEffects.push(component) === 1) {
			/* istanbul ignore next */
			if (options.requestAnimationFrame) {
				options.requestAnimationFrame(flushAfterPaintEffects);
			}
			else {
				requestAnimationFrame(scheduleFlushAfterPaint);
			}
		}
	};
}

function handleEffects(effects) {
	effects.forEach(invokeCleanup);
	effects.forEach(invokeEffect);
	return [];
}

// 调用回调返回 的 fn
function invokeCleanup(hook) {
	if (hook._cleanup) hook._cleanup();
}

/**
 * Invoke a Hook's effect
 * 调用回调，如果返回fn fn设置给cleanup
 * @param {import('./internal').EffectHookState} hook
 */
function invokeEffect(hook) {
	const result = hook._value();
	if (typeof result === 'function') hook._cleanup = result;
}

function argsChanged(oldArgs, newArgs) {
	return !oldArgs || newArgs.some((arg, index) => arg !== oldArgs[index]);
}

function invokeOrReturn(arg, f) {
	return typeof f === 'function' ? f(arg) : f;
}
