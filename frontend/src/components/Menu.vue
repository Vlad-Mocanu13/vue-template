<template>
	<!-- <div :class="menuClasses"> -->
	<div :class="[collapsed ? 'menu menucollapsed' : 'menu']">
		<div style="height: 60px; width: 100%">
			<img src="@/assets/customer.png" style="width: 205px; padding: 10px 0 10px 0" alt="" />
			<fa
				icon="arrow-right-arrow-left"
				style="
					color: white;
					position: relative;
					float: right;
					margin-right: 20px;
					margin-top: 10px;
					cursor: pointer;
					font-size: 25px;
				"
				class="syncalt"
				v-on:click="Collapse"
			/>
            <menu-drawer />
		</div>
		<div
			v-if="!collapsed"
			style="
				font-family: Arial, Helvetica, sans-serif;
				height: 70px;
				position: absolute;
				width: 100%;
				bottom: 40px;
				text-align: center;
			"
		>
			<div
				style="
					font-family: Arial, Helvetica, sans-serif;
					height: 70px;
					position: absolute;
					width: 100%;
					bottom: 40px;
					text-align: center;
				"
			>
				<img
					src="@/assets/logo.png"
					style="max-width: 90%; height: 60px; padding: 0"
					alt=""
				/>
				<br />
				<span style="color: white; font-weight: 400">Adresa noua:</span><br /><a
					href="https://pontaj.ad.cnab.ro"
					>https://pontaj.ad.cnab.ro</a
				>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import MenuDrawer from "./MenuDrawer.vue";

export default defineComponent({
	name: "Menu",
	components: {
		MenuDrawer,
	},
	props: {
		collapsed: Boolean,
		Collapse: Function,
	},
	computed: {
		menuClasses() {
			return {
				menu: true,
				menucollapsed: this.collapsed,
			};
		},
	},
	methods: {},
});
</script>
<style scoped>
.menu {
	margin: 0px;
	border-radius: 0px 4px 4px 0px;
	padding: 0px;
	position: fixed;
	display: inline-block;
	margin-left: -8px;
	vertical-align: top;
	margin-top: -8px;
	padding-top: 0px;
	height: 100%;
	width: 260px;
	box-shadow: 5px 10px 8px #888888;
	background-color: black;
	background-image: url("./assets/background.jpg");
	background-size: cover;
	background-repeat: no-repeat;
	font-family: Montserrat;
	transition: 0.2s;
	user-select: none;
	z-index: 10;
}
.menucollapsed {
	margin-left: -200px;
	border-radius: 0px 40px 40px 0px;
	transition: 0.2s;
	z-index: 10;
}
</style>
