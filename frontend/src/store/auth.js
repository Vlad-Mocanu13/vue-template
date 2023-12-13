export default {
    namespaced: true,
    state: {
      isLoggedIn: false,
    },
    mutations: {
      setLoggedIn(state, value) {
        state.isLoggedIn = value;
      },
    },
    actions: {
      login({ commit }) {
        commit("setLoggedIn", true);
      },
      logout({ commit }) {
        commit("setLoggedIn", false);
      },
    },
  };