<template>
	<div class="no-page">
        <EditCloseButton />
        <EditDoneButton />
        <EditStartButton />
        <EditText />
		<h1>404 - Page Not Found</h1>
		<p>The page you are looking for does not exist.</p>
		<router-link to="/">Go back to the Home Page</router-link>
	</div>
</template>

<script>
import EditCloseButton from "../components/Edit/EditUtils/EditCloseButton.vue";
import EditDoneButton from "../components/Edit/EditUtils/EditDoneButton.vue";
import EditStartButton from "../components/Edit/EditUtils/EditStartButton.vue";
import EditText from "../components/Edit/EditUtils/EditText.vue";
export default {
	name: "NoPage",
    components: {
        EditCloseButton,
        EditDoneButton,
        EditStartButton,
        EditText
    }
};
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
