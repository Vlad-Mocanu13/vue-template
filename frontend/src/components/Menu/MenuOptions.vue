<template>
	<div>
		<div v-if="option.name === 'Logout'">
			<span
				@click="option.action"
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
			</span>
		</div>
		<div v-else>
			<div v-if="!isEditing">
				<span
					class="menubutton"
					:class="{ menubuttonselected: option.path === $route.path }"
					@click="startEditing"
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
				</span>
			</div>
			<span v-else class="menubutton">
				<input
					v-if="option.inputType === 'password' || option.inputType === 'text'"
					:type="option.inputType"
					:value="inputValue(option)"
					:style="{ borderRadius: '2px', width: '150px', marginLeft: '10px' }"
				/>
				<fa icon="x" class="menuicon material-icons" @click="cancelAction(option)" />
				<fa icon="check" class="menuicon material-icons" @click="confirmAction(option)" />
			</span>
		</div>
	</div>
</template>

<script>
import { ref, defineComponent } from "vue";
import axios from "axios";

export default defineComponent({
	name: "MenuOptions",
	props: {
		option: {
			type: Object,
			required: true,
		},
	},
	setup(props) {
		const isEditing = ref(false);
		const inputValues = ref({});
		const isChangingState = ref({});

		const confirmAction = async option => {
			const inputType = option.inputType === "password" ? "pass" : "account";
			const URL = `${option.name.toLowerCase()}?${inputType}=${encodeURI(
				inputValues.value[option.name]
			)}`;

			try {
				const response = await axios.get(URL);
				if (response.data.error.startsWith("login")) {
					option.action; // Make sure logoutHandler is accessible
					return;
				}
				if (response.data.error.length > 0) {
					alert(`Eroare: ${response.data.error}`);
					return;
				}
				if (option.inputType === "password") {
					window.location.reload();
				} else {
					option.action; // Make sure logoutHandler is accessible
				}
			} catch (error) {
				console.log(error);
			}

			cancelAction(option);
		};

		const startEditing = () => {
			isEditing.value = true;
		};

		const stopEditing = () => {
			isEditing.value = false;
		};

		const cancelAction = option => {
			isChangingState.value[option.name] = false;
			inputValues.value[option.name] = "";
            stopEditing()
		};

		const inputValue = option => {
			return inputValues.value[option.name] || "";
		};

		const isChanging = option => {
			return isChangingState.value[option.name] || false;
		};
		return {
			isEditing,
			inputValues,
			isChangingState,
			startEditing,
			stopEditing,
			confirmAction,
			cancelAction,
			inputValue,
			isChanging,
		};
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
.validinput {
	border-color: #3498db;
	height: 30px;
	border-width: 2px;
	border-radius: "2px";
	margin-left: "10px";
}

.menuicon {
	float: right;
	position: relative;
	padding-left: 5px;
	padding-right: 5px;
	color: #fff;
	padding-top: 5px;
	font-size: 20px;
	user-select: none;
}

.material-icons {
	font-family: "Material Icons";
	font-weight: normal;
	font-style: normal;
	letter-spacing: normal;
	display: inline-block;
	white-space: nowrap;
	word-wrap: normal;
	font-feature-settings: "liga";
	-webkit-font-feature-settings: "liga";
	-webkit-font-smoothing: antialiased;
}
</style>
