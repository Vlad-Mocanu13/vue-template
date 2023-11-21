<template>
	<div class="no-page">
		<h1>404 - Page Not Found</h1>
		<p>The page you are looking for does not exist.</p>
		<router-link to="/">Go back to the Home Page</router-link>
	</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Menu from "@/components/Menu.vue";

export default defineComponent({
	name: "NoPage",
});
</script>

<style scoped>
.no-page {
	text-align: center;
	padding: 20px;
}

h1 {
	font-size: 4rem;
	color: #e74c3c; /* Red color for the title */
}

p {
	font-size: 1.5rem;
	margin-top: 10px;
}

a {
	text-decoration: none;
	color: #3498db; /* Blue color for the link */
}
</style>
