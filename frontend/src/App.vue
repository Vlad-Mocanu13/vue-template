<template>
	<div>
		<Menu :collapsed="data.collapsed" :Collapse="toggleCollapsed" />
		<div :class="[data.collapsed ? 'content contentextended' : 'content']">
			<router-view v-if="data.isLoggedIn" />
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted, onBeforeUnmount } from "vue";
import Menu from "@/components/Menu.vue";
import Login from "@/Pages/Login.vue";
import NoPage from "@/Pages/NoPage.vue";

export default defineComponent({
	name: "App",
	components: {
		Menu,
		Login,
		NoPage,
	},
	setup() {
		const data = ref({
			collapsed: false,
			smallWindow: false,
			debounce: null,
			isLoggedIn: false,
			isMobile: false,
		});

		const toggleCollapsed = () => {
			data.value.collapsed = !data.value.collapsed;
		};

		const checkIsMobile = () => {
			if (data.value.smallWindow !== window.innerWidth < 900) {
				data.value.collapsed = data.value.isMobile || window.innerWidth < 900;
			}
			data.value.smallWindow = window.innerWidth < 900;
		};

		const handleResize = () => {
			if (data.value.debounce) {
				clearTimeout(data.value.debounce);
			}
			data.value.debounce = setTimeout(() => {
				checkIsMobile();
			}, 1000);
		};

		onMounted(() => {
			checkIsMobile();
			window.addEventListener("resize", handleResize);
		});

		onBeforeUnmount(() => {
			window.removeEventListener("resize", handleResize);
		});

		watch(
			() => data.value.isLoggedIn,
			newValue => {
				if (newValue) {
					// Perform actions when the user is logged in
				} else {
					// Perform actions when the user is not logged in
				}
			}
		);

		// Check login status on component mount
		onMounted(() => {
			if (getCookie("jwt")) {
				data.value.isLoggedIn = true;
			} else {
				data.value.isLoggedIn = false;
			}
		});

		function getCookie(cname) {
			let name = cname + "=";
			let decodedCookie = decodeURIComponent(document.cookie);
			let ca = decodedCookie.split(";");

			for (let i = 0; i < ca.length; i++) {
				let c = ca[i];
				while (c.charAt(0) == " ") {
					c = c.substring(1);
				}
				if (c.indexOf(name) == 0) {
					return c.substring(name.length, c.length);
				}
			}
			return "";
		}

		return {
			data,
			toggleCollapsed,
			getCookie,
		};
	},
});
</script>

<style scoped>
.content {
	margin-left: 270px;
	transition: 0.2s;
}
.contentextended {
	margin-left: 130px;
	transition: 0.2s;
}
</style>
