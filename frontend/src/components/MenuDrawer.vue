<template>
    <menu-options v-for="option in options" :key="option.path" :option="option" />
	<menu-pages v-for="page in pages" :key="page.path" :page="page" />
</template>

<script lang="ts">
import MenuPages from "./MenuPages.vue";
import MenuOptions from "./MenuOptions.vue";

import { defineComponent } from "vue";
export default defineComponent({
	components: {
		MenuPages,
        MenuOptions
	},
	data() {
		return {
			pages: [
				{ name: "Home", path: "/", icon: "home" },
				{ name: "About", path: "/about", icon: "arrow-right-arrow-left" },
				{ name: "Contact", path: "/contact", icon: "phone" },
			],
			options: [
                { name: "Logout", path: "/", icon: "arrow-right-to-bracket" },
				{ name: "Schimbare Parola", path: "/", icon: "lock" },
				{ name: "Schimbare User", path: "/", icon: "user-gear" },
            ],
		};
	},
});
</script>

<style></style>
