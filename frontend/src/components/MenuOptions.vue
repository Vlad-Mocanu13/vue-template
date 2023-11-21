<template>
	<button v-if="!isEditing"
        @click="startEditing"
		class="menubutton"
		:class="{ menubuttonselected: option.path === $route.path }"
	>
		{{ option.name }}
		<fa
			:icon="option.icon"
			style="
				color: white;
				position: relative;
				float: right;
				margin-right: 20px;
				margin-top: 10px;
				cursor: pointer;
				font-size: 15px;
			"
		/>
	</button>
    <input v-else type="text" v-model="editedName" @blur="stopEditing" @keydown.enter="stopEditing" />

</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
	name: "MenuButton",
	props: {
        option: {
            type: Object,
            required: true
        }
	},
    data() {
    return {
      isEditing: false,
      editedName: "",
    };
  },
  methods: {
    startEditing() {
      this.isEditing = true;
      this.editedName = this.option.name;
    },
    stopEditing() {
      this.isEditing = false;
      // Perform any actions needed when editing is stopped
      // For example, you can update the page name or handle saving changes.
    },
  },
});
</script>

<style scoped>
.menubutton {
	padding-left: 30px;
	line-height: 32px;
	border-left: 3px solid #eb9f1d00;
	color: rgb(255, 255, 255);
	text-decoration: none;
	font-weight: bold;
	font-family: Arial, Helvetica, sans-serif;
	display: inline-block;
	width: 85%;
	border-radius: 10px;
	position: relative;
	cursor: pointer;
	transition: 0.2s;
	margin: 0px;
	background-position: center;
	transition: background 0.4s;
}
.menubutton:hover {
	color: rgb(255, 255, 255);
	background: #696969 radial-gradient(circle, transparent 0%, #3d3d3d 1%) center/15000%;
}
.menubutton:active {
	background-size: 100%;
	transition: background 0s;
}
.menubuttonselected {
	background-color: rgb(236, 154, 0);
}
</style>
