<template>
	<div class="contentClasses">
		<br />
		<br />
		<br />
		<div class="error-message">
			<span>{{ error }}</span>
		</div>
		<div class="form-container">
			<label class="input-label" for="inputLarge"></label>
			<input
				v-model="user"
				class="input"
				type="text"
				placeholder="Utilizator"
				id="inputLarge"
			/>
		</div>
		<div class="form-container">
			<label class="input-label" for="inputLarge"></label>
			<input
				v-model="pass"
				class="input"
				type="password"
				placeholder="Parola"
				id="inputLarge"
			/>
		</div>
		<br />
		<br />
		<br />
		<button @click="loginHandler" type="button" class="button-authenticate">
			Autentificare
		</button>
		<br />
		<br />
	</div>
</template>
<script>
import { ref, onMounted } from "vue";
import axios from "axios";
import store from "../store/store";
import router from "../router/router";
export default {
	name: "Login",
	setup() {
		const collapsed = ref(false);
		const user = ref("");
		const pass = ref("");
		const error = ref("");
		const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
		const smallWindow = ref(false);
		let debounce = null;

		const loginHandler = () => {
			axios.get(encodeURI(`https://localhost/api/login?username=${user.value}&password=${pass.value}`), {withCredentials: true})
                .then(response => {
					if (response.data.success) {
						// Assuming you have 'navigate' method available (you may need to adapt this)
						store.dispatch("auth/login");
						router.push("/home");
                        window.location.reload()
					} else {
						console.error(response.data.error);
						error.value = response.data.error;
					}
				})
				.catch(error => {
					console.error(error);
					error.value = error.message;
				});
		};

		const checkIsMobile = () => {
			if (smallWindow.value !== window.innerWidth < 900) {
				collapsed.value = isMobile || window.innerWidth < 900;
			}
			smallWindow.value = window.innerWidth < 900;
		};

		onMounted(() => {
			window.addEventListener("resize", () => {
				if (debounce) clearTimeout(debounce);
				debounce = setTimeout(checkIsMobile, 200);
			});

			document.addEventListener("keypress", event => {
				if (event.code === "Enter" || event.code === "NumpadEnter") {
					loginHandler();
				}
			});
		});

		return {
			collapsed,
			user,
			pass,
			error,
			isMobile,
			smallWindow,
			loginHandler,
			checkIsMobile,
		};
	},
};
</script>
<style scoped>
.menu {
	transition: 0.2s;
}

.menu-header {
	height: 60px;
	width: 100%;
}

.logo {
	width: 205px;
	padding-left: 0px;
	padding-right: 10px;
	padding-top: 0px;
	padding-bottom: 10px;
}

.burger-icon {
	position: relative;
	float: right;
	margin-right: 20px;
	margin-top: 10px;
	cursor: pointer;
}

.logo-container {
	font-family: Arial, Helvetica, sans-serif;
	height: 70px;
	position: absolute;
	width: 100%;
	bottom: 40px;
	text-align: center;
}

.logo-img {
	max-width: 90%;
	height: 60px;
	padding: 0px;
}

.content {
	transition: 0.2s;
}

.form-container {
	max-width: 40%;
	margin: auto;
	text-align: center;
}

.error-message {
	text-align: center;
	color: red;
}

.input {
	width: 330px;
	height: 44px;
	padding-left: 16px;
	font-size: 20px;
}

.button-authenticate {
	margin-left: 44%;
	border-radius: 4px;
	color: white;
	padding: 5px;
	border: 0px solid grey;
	background-color: #325d88;
}

.button-authenticate:hover {
	border-radius: 4px;
	color: white;
	padding: 5px;
	border: 0px solid grey;
	background-color: #3c6a97;
}
</style>
