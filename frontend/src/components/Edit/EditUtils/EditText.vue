<template>
    <span
      @click="!readOnly ? startHandler() : undefined"
      :style="{ ...style, whiteSpace: 'nowrap', overflow: 'scroll', display: 'inline-block', border: '1px solid rgba(0, 0, 0, .01)' }"
    >
      {{ text }}
      {{ typeof isHalfHour === 'undefined' ? '' : text % 2 === 1 ? ':30' : ':00' }}
    </span>
  </template>
  
  <script>
  export default {
    props: {
      text: String,
      readOnly: Boolean,
      startHandler: Function,
      style: Object,
      isHalfHour: Boolean,
    },
  };
  </script>
  