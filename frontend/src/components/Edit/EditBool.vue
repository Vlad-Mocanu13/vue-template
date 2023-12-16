<template>
	<div>
		<input v-if="active" v-model="newValue" type="checkbox" :style="style" />
		<span
			v-else
			@mousedown="startHandler"
			class="orderbyicon material-icons"
			:style="{ color: '#78B2FF' }"
		>
			<fa :icon="newValue ? 'fa-solid fa-square-check' : 'fa-regular fa-square-check'" />
		</span>
		<Loading v-if="isLoading" />
		<EditStartButton v-if="!active && !isLoading && !readOnly" :startHandler="startHandler" />
		<EditCloseButton v-if="active" :cancelHandler="cancelHandler" />
		<EditDoneButton v-if="active" :finishHandler="finishHandler" />
	</div>
</template>

<script>
import { ref, reactive } from "vue";
import EditStartButton from "./EditUtils/EditStartButton.vue";
import EditCloseButton from "./EditUtils/EditCloseButton.vue";
import EditDoneButton from "./EditUtils/EditDoneButton.vue";
import Loading from "../utils/Loading.vue";

export default {
	props: {
		value: Boolean,
		style: Object,
		onFinish: Function,
		isLoading: Boolean,
		readOnly: Boolean,
	},
	setup(props) {
		const active = ref(false);
		const newValue = ref(props.value);
		const lastValidValue = ref(props.value);

		const startHandler = () => {
			active.value = true;
			if (typeof newValue.value === "boolean") {
				lastValidValue.value = newValue.value;
			}
		};

		const inputHandler = () => {
			newValue.value = !newValue.value;
		};

		const finishHandler = () => {
			if (typeof props.onFinish === "function") {
				props.onFinish(newValue.value);
			}
			active.value = false;
		};

		const cancelHandler = () => {
			active.value = false;
			newValue.value = lastValidValue.value;
		};

		return {
			active,
			newValue,
			startHandler,
			inputHandler,
			finishHandler,
			cancelHandler,
		};
	},
};
</script>
