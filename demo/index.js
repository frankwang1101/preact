import {
	createElement,
	render,
	hydrate,
	Component,
	options,
	Fragment,
	createContext
} from '../src/index'
import { useLayoutEffect, useEffect, useState } from '../hooks/src/index'
// import renderToString from 'preact-render-to-string';
import './style.scss'
import { Router, Link } from 'preact-router'
import Pythagoras from './pythagoras'
import Spiral from './spiral'
import Reorder from './reorder'
import Todo from './todo'
import Fragments from './fragments'
import Context from './context'
import installLogger from './logger'
import ProfilerDemo from './profiler'
import KeyBug from './key_bug'
import PeopleBrowser from './people'
import { initDevTools } from 'preact/debug/src/devtools'
import { initDebug } from 'preact/debug/src/debug'
import DevtoolsDemo from './devtools'

let isBenchmark = /(\/spiral|\/pythagoras|[#&]bench)/g.test(
	window.location.href
)
if (!isBenchmark) {
	// eslint-disable-next-line no-console
	console.log('Enabling devtools and debug')
	initDevTools()
	initDebug()
}

// mobx-state-tree fix
window.setImmediate = setTimeout

// class Home extends Component {
//   a = 1;
//   state = {
//   	name: 'world',
//     type: 1
//   }
//   setRandom = () => {
//     this.setState({
//       name: 'world' + ~~(Math.random() * 10)
//     })
//   }
//   setType() {
//     this.setState({
//       type: Math.round(Math.random())
//     })
//   }
// 	render() {
//     const Cpn = this.state.type === 1 ? () => <div className="type1"><span>type1</span></div> : () => <span>type2</span>
// 		return (
// 			<div>
// 				<h1>Hello, {this.state.name}</h1>
//         <button onClick={this.setRandom}>random</button>
//         <button onClick={() => this.setType()}>setType</button>
//         <h2>end</h2>
//         <Cpn></Cpn>
// 			</div>
// 		);
// 	}
// }

const h1 = () => <h1>1111</h1>

// class Home extends Component {
//   state = {
//     type: 1
//   }
//   componentDidMount() {
//     setTimeout(() => {
//       this.setState({
//         type: 2
//       })
//     }, 3000)
//   }
//   render() {
//     const Back =
//       this.state.type === 2 ? () => <h2>2222</h2> : h1
//     return (
//       <div>
//         <h1 />
//         <Back />
//       </div>
//     )
//   }
// }

// const Home = () => {
//   const [state, setState] = useState(0)
//   useEffect(() => {
//     console.log('effect active!')
//   }, [state])
//   const random = () => {
//     setState(parseInt(Math.random() * 10))
//   }
//   return (
//     <div onClick={random}>{state}</div>
//   )
// }

const Home = () => {
  const [state, setState] = useState(0)
  useEffect(() => {
    console.log('effect chage')
  }, [state])

  useLayoutEffect(() => {
    console.log('layout effect chage')
  }, [state])
  return (<>
    {state === 0 ? <h1 key="h1">h111 {state}</h1> : null}
    <div key="0000" onClick={() => setState(0)}>0000</div>
    {state === 1 ? <h1 key="h1">h111 {state}</h1> : null}
    <div key="1111" onClick={() => setState(1)}>1111</div>
  </>)
}

// const ThemeContext = createContext({
// 	theme: 'dark',
// 	change: () => {}
// })

// class Toolbar extends Component {
// 	render() {
// 		return (
// 			<div>
// 				<ThemeContext.Consumer>
// 					{({ theme, changeTheme }) => (
// 						<ThemeButton theme={theme} cl={changeTheme} />
// 					)}
// 				</ThemeContext.Consumer>
// 			</div>
// 		)
// 	}
// }

// class ThemeButton extends Component {
// 	render() {
// 		return (
// 			<button
// 				theme={this.props.theme}
// 				onClick={() => {
// 					console.log(this.props)
// 					this.props.cl(this.props.theme === 'light' ? 'dark' : 'light')
// 				}}
// 			>
// 				{this.props.theme}
// 			</button>
// 		)
// 	}
// }

// class Home extends Component {
// 	constructor(props) {
// 		super(props)
// 		const changeTheme = (theme) => {
// 			this.setState({
// 				theme
// 			})
// 		}
// 		this.state = {
// 			theme: 'dark',
// 			changeTheme
// 		}
// 	}
// 	render() {
// 		return (
// 			<ThemeContext.Provider value={this.state}>
// 				<Toolbar />
// 			</ThemeContext.Provider>
// 		)
// 	}
// }

class DevtoolsWarning extends Component {
	onClick = () => {
		window.location.reload()
	}

	render() {
		return (
			<button onClick={this.onClick}>
				Start Benchmark (disables devtools)
			</button>
		)
	}
}

class App extends Component {
	render({ url }) {
		return (
			<div class="app">
				<header>
					<nav>
						<Link href="/" activeClassName="active">
							Home
						</Link>
						<Link href="/reorder" activeClassName="active">
							Reorder
						</Link>
						<Link href="/spiral" activeClassName="active">
							Spiral
						</Link>
						<Link href="/pythagoras" activeClassName="active">
							Pythagoras
						</Link>
						<Link href="/todo" activeClassName="active">
							ToDo
						</Link>
						<Link href="/fragments" activeClassName="active">
							Fragments
						</Link>
						<Link href="/key_bug" activeClassName="active">
							Key Bug
						</Link>
						<Link href="/profiler" activeClassName="active">
							Profiler
						</Link>
						<Link href="/context" activeClassName="active">
							Context
						</Link>
						<Link href="/devtools" activeClassName="active">
							Devtools
						</Link>
						<Link href="/empty-fragment" activeClassName="active">
							Empty Fragment
						</Link>
						<Link href="/people" activeClassName="active">
							People Browser
						</Link>
					</nav>
				</header>
				<main>
					<Router url={url}>
						<Home path="/" />
						<Reorder path="/reorder" />
						<div path="/spiral">
							{!isBenchmark ? <DevtoolsWarning /> : <Spiral />}
						</div>
						<div path="/pythagoras">
							{!isBenchmark ? <DevtoolsWarning /> : <Pythagoras />}
						</div>
						<Todo path="/todo" />
						<Fragments path="/fragments" />
						<ProfilerDemo path="/profiler" />
						<KeyBug path="/key_bug" />
						<Context path="/context" />
						<DevtoolsDemo path="/devtools" />
						<EmptyFragment path="/empty-fragment" />
						<PeopleBrowser path="/people/:user?" />
					</Router>
				</main>
			</div>
		)
	}
}

function EmptyFragment() {
	return <Fragment />
}

// document.body.innerHTML = renderToString(<App url={location.href.match(/[#&]ssr/) ? undefined : '/'} />);
// document.body.firstChild.setAttribute('is-ssr', 'true');

installLogger(
	String(localStorage.LOG) === 'true' || location.href.match(/logger/),
	String(localStorage.CONSOLE) === 'true' || location.href.match(/console/)
)

render(<Home />, document.body)
