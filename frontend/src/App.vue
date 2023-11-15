<template>
  <v-app>
    <v-main>
      <left-menu />
      <router-view/>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import LeftMenu from '@/components/LeftMenu.vue'
import Login from '@/Pages/Login.vue'
import NoPage from '@/Pages/NoPage.vue'

export default defineComponent({
  name: 'App',
  components: {
    LeftMenu,
    Login,
    NoPage
  },
  data () {
    return {
      //
    }
  },
})
</script>
