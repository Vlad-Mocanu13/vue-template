<template>
	<div style="border: 5px solid #58534e; border-radius: 20px; margin: 0px; margin-top: 4px"></div>
	<p style="color: white">{{ user.username }}</p>
	<menu-options v-for="option in options" :key="option.icon" :option="option" />
	<div style="border: 5px solid #58534e; border-radius: 20px; margin: 0px; margin-top: 4px"></div>
	<menu-pages v-for="page in pages" :key="page.path" :page="page" />
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import MenuPages from "./MenuPages.vue";
import MenuOptions from "./MenuOptions.vue";
import store from "../../store/store";
import router from "../../router/router";
import axios from "axios";

export default defineComponent({
	components: {
		MenuPages,
		MenuOptions,
	},
	setup() {
		const user = ref({
			username: "",
			userid: "",
		});

		const logoutHandler = (refreshPage = true) => {
			axios
				.get(encodeURI("https://localhost/api/logout"), {withCredentials: true})
				.then(response => {
					if (response.data.success) {
						router.push("/login");
						store.dispatch("auth/logout");
						if (refreshPage) {
							window.location.reload();
						}
					} else {
						console.log(response.data.error);
					}
				})
				.catch(error => {
					console.log(error);
				});
		};

		const changeAction = option => {
			// Implement your change action logic
		};

		// Trigger the user data fetching on component mount

		onMounted(() => {
			axios.get("https://localhost/api/getuserdata").then(
				response => {
					console.log(response.data);
					// if (response.data.error.includes("login")) {
					// 	logoutHandler(false);
					// 	return;
					// }
					// user.value = {
					// 	username: response.data.username,
					// 	userid: response.data.userid,
					// };
					// const pageNamesDictCopy = { ...pageNamesDict.value };

					// for (const page of Object.values(pageNamesDict.value)) {
					// 	if (typeof response.data.permission !== undefined) {
					// 		if (response.data.permission[page.permission] === 1) {
					// 			pageNamesDictCopy[page.page].visible = true;
					// 		}
					// 	}
					// }

					// pageNamesDict.value = pageNamesDictCopy;
				},
				error => {
					console.log(error);
				}
			);
		});

		const pages = ref([
			{ name: "Home", path: "/", icon: "home" },
			{ name: "About", path: "/about", icon: "arrow-right-arrow-left" },
			{ name: "Contact", path: "/contact", icon: "phone" },
		]);
		const options = ref([
			{
				name: "Logout",
				icon: "arrow-right-to-bracket",
				action: logoutHandler,
				visible: false,
			},
			{
				name: "Schimbare Parola",
				icon: "lock",
				visible: false,
				inputType: "password",
				action: changeAction,
			},
			{
				name: "Schimbare User",
				icon: "user-gear",
				inputType: "text",
				action: changeAction,
				visible: false,
			},
		]);

		return {
			user,
			pages,
			options,
			logoutHandler,
			changeAction,
		};
	},
});
</script>

<style></style>
