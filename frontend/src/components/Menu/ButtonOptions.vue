<template>
    <div>
      <router-link @click="onClick" class="menubutton">
        {{ title }}
        <span class="menuicon material-icons" style="padding-right: 17px;">
          {{ icon }}
        </span>
      </router-link>
      <br />
    </div>
  </template>
  
  <script>
  export default {
    props: {
      onClick: Function,
      title: String,
      icon: String,
    },
  };
  </script>
  