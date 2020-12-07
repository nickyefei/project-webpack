import router from '../../router'

import template from './index.html'
import './style.css'

export default class {
  mount(el) {
    document.title = 'home'
    el.innerHTML = template
    const gotonav = document.getElementById('gotonav')
    gotonav.addEventListener('click', () => {
      router.go('/nav')
    })
  }
}
