<template>
	<fa class="iconbtncancel" :icon="['fas', 'xmark']" @mousedown="cancelHandler" />
</template>

<script>
export default {
	props: ["cancelHandler"],
};
</script>

<style scoped>
.iconbtncancel {
	white-space: nowrap;
	display: inline-block;
	font-size: 30px;
	z-index: 1200;
	transform: translate(-5px, 0px);
}
</style>
