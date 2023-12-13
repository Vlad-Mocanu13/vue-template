import { createApp } from "vue";
import App from "./App.vue";
import router from "./router/router";
import store from "../src/store/store"
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

library.add(fas);


createApp(App)
	.component("fa", FontAwesomeIcon)
	.use(router)
	.use(store)
	.mount("#app");
