<template>
	<div>
		<Menu :collapsed="data.collapsed" :Collapse="toggleCollapsed" />
		<div :class="[data.collapsed ? 'content contentextended' : 'content']">
            <template v-if="isLoggedIn">
				<router-view />
			</template>
			<template v-else>
				<Login />
			</template>
		</div>
	</div>
</template>


<script>
import { ref, watch, onMounted, onBeforeUnmount, computed } from "vue";
import store from './store/store'
import Menu from "./components/Menu/Menu.vue";
import Login from "./Pages/Login.vue";
import NoPage from "./Pages/NoPage.vue";
export default {
	name: "App",
	components: {
		Menu,
		Login,
		NoPage,
	},
	setup() {

        const isLoggedIn = computed(() => store.state.auth.isLoggedIn);

		const data = ref({
			collapsed: false,
			smallWindow: false,
			debounce: null,
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

		// Check login status on component mount
		onMounted(() => {
            console.log(getCookie("jwt"))
			if (getCookie("jwt")) {
				store.dispatch("auth/login")
			} else {
                store.dispatch("auth/logout")

			}
		});

		function getCookie(cookieName) {
			let name = cookieName + "=";
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
            isLoggedIn
		};
	},
};
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
