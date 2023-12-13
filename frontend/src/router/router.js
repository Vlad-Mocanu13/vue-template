import { createRouter, createWebHistory } from 'vue-router'
import NoPage from '../Pages/NoPage.vue'
import Login from '../Pages/Login.vue'

const router = createRouter({
  history: createWebHistory(''),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login
    },
    {
      path: '/:catchAll(.*)',
      name: 'NoPage',
      component: NoPage
    },
  ]
})

export default router
