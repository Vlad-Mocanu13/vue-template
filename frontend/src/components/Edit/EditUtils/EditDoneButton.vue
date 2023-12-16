<template>
	<fa class="iconbtnok" :icon="['fas', 'check']" @mousedown="finishHandler" />
</template>

<script>
export default {
	props: ["finishHandler"],
};
</script>

<style scoped>
.iconbtnok {
	white-space: "nowrap";
	display: "inline-block";
	font-size: "30px";
	z-index: 1200;
}
</style>
