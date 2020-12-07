import home from './view/home'
import nav from './view/nav'

// const routes = {
//   '/home': () => import('@/view/home'),
//   '/nav': () => import('@/view/nav')
// }

const routes = {
  '/home': home,
  '/nav': nav
}

class Router {
  start() {
    window.addEventListener('popstate', function() {
      this.load(location.pathname)
    })
    this.load(location.pathname)
  }

  go(path) {
    history.pushState({}, '', path)
    this.load(path)
  }

  async load(path) {
    if (path === '/') {
      path = '/home'
    }

    // 动态加载页面
    // const currentView = (await routes[path]()).default
    // 创建页面实例
    const spaView = new routes[path]()
    spaView.mount(document.body)
  }
}

export default new Router()