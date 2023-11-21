import { createApp } from "vue";

import Vue from "vue";
import App from "./App.vue";
import router from "./router/router";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { loadFonts } from "./plugins/webfontloader";

library.add(fas);

loadFonts();

createApp(App)
	.component("fa", FontAwesomeIcon)
	.use(router)
	//   .use(store)
	.mount("#app");
