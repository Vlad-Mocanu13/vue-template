<template>
	<router-link
		:to="page.path"
		class="menubutton"
		:class="{ menubuttonselected: page.path === $route.path }"
	>
		{{ page.name }}
		<fa
			:icon="page.icon"
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
	</router-link>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
	name: "MenuButton",
	props: {
		page: {
			type: Object,
			required: true,
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
