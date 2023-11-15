<template>
	<div class="menuClasses">
		<div class="menu-header">
			<span @click="collapsed = !collapsed" class="burger-icon material-icons">sync_alt</span>
		</div>

		<div v-if="!collapsed" class="logo-container">
		</div>
	</div>

	<div class="contentClasses">
		<br />
		<br />
		<br />
		<div class="form-container">
			<span class="error-message">{{ error }}</span>
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
		<button @click="login" type="button" class="button-authenticate">Autentificare</button>
		<br />
		<br />
	</div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import axios from "axios";

export default defineComponent({
	name: "Login",
	data() {
		return {
			collapsed: false,
			user: "",
			pass: "",
			error: "",
			ismobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
			smallWindow: false,
			debounce: null,
		};
	},
	mounted() {
		window.addEventListener("resize", () => {
			if (this.debounce) clearTimeout(this.debounce);
			this.debounce = setTimeout(() => this.checkIsMobile(), 200);
		});

		document.addEventListener("keypress", event => {
			if (event.code === "Enter" || event.code === "NumpadEnter") {
				this.login();
			}
		});
	},
	methods: {
		async login() {
			try {
				const response = await axios.get(
					`https://localhost:443/login?username=${this.user}&password=${this.pass}`
				);

				if (response.data.success) {
					this.$router.push("/NoPage");
					window.location.reload();
				} else {
                    console.error(response.data.error);
				}
			} catch (error) {
				console.error(error);
			}
		},
		checkIsMobile() {
			if (this.smallWindow !== window.innerWidth < 900) {
				this.collapsed = this.ismobile || window.innerWidth < 900;
			}
			this.smallWindow = window.innerWidth < 900;
		},
	},
});
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
	color: red;
}

.input-label {
	/* Adjust as needed */
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
