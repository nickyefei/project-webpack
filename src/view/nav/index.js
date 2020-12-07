import router from '../../router'

import template from './index.html'
import './style.css'

export default class {
  mount(el) {
    document.title = 'nav'
    el.innerHTML = template
    document.getElementById('gotohome').addEventListener('click', () => {
      router.go('/home')
    })
  }
}