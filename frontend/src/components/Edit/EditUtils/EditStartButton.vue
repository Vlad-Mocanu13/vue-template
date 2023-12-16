<template>
    <span @mousedown="startHandler" class="iconbtnok" style="vertical-align: top; z-index: 200;">
      <fa icon="fa-solid fa-pen" />
    </span>
  </template>
  
  <script>
  
  export default {
    props: ["startHandler"],
  };
  </script>
  
  <style scoped>
.iconbtnok {
	white-space: "nowrap";
	display: "inline-block";
	font-size: "30px";
	z-index: 1200;
}
  </style>
  