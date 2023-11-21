// import Vue from 'vue';
// import Vuex, { ActionTree, MutationTree, GetterTree } from 'vuex';
// import Axios from 'axios';

// Vue.use(Vuex);

// interface State {
//   drawer: null | any;
//   status: string;
//   buildInfo: any;
//   token: string;
//   user: any;
// }

// const state: State = {
//   drawer: null,
//   status: '',
//   buildInfo: {},
//   token: localStorage.getItem('token') || '',
//   user: {},
// };

// interface Mutations {
//   auth_request(state: State): void;
//   auth_success(state: State, payload: { token: string; user: any }): void;
//   auth_error(state: State): void;
//   logout(state: State): void;
// }

// const mutations: MutationTree<State> & Mutations = {
//   auth_request(state) {
//     state.status = 'loading';
//   },
//   auth_success(state, { token, user }) {
//     state.status = 'success';
//     state.token = token;
//     state.user = user;
//   },
//   auth_error(state) {
//     state.status = 'error';
//   },
//   logout(state) {
//     state.status = '';
//     state.token = '';
//   },
// };

// interface Actions {
//   login({ commit }: { commit: any }, user: any): Promise<void>;
//   logout({ commit }: { commit: any }): Promise<void>;
// }

// const actions: ActionTree<State, any> & Actions = {
//   login({ commit }, user) {
//     return new Promise<void>((resolve, reject) => {
//       commit('auth_request');
//       Axios({ url: '/api/login', data: user, method: 'POST' })
//         .then((resp) => {
//           const token = resp.data.token;
//           const user = resp.data.user;
//           localStorage.setItem('token', token);
//           Axios.defaults.headers.common.Authorization = token;
//           commit('auth_success', { token, user });
//           resolve();
//         })
//         .catch((err) => {
//           commit('auth_error');
//           localStorage.removeItem('token');
//           reject(err);
//         });
//     });
//   },
//   logout({ commit }) {
//     return new Promise<void>((resolve) => {
//       commit('logout');
//       localStorage.removeItem('token');
//       delete Axios.defaults.headers.common.Authorization;
//       resolve();
//     });
//   },
// };

// interface Getters {
//   isLoggedIn(state: State): boolean;
//   authStatus(state: State): string;
//   getBuildValue(state: State): any;
// }

// const getters: GetterTree<State, any> & Getters = {
//   isLoggedIn: (state) => !!state.token,
//   authStatus: (state) => state.status,
//   getBuildValue: (state) => state.buildInfo,
// };

// export default new Vuex.Store({
//   state,
//   mutations,
//   actions,
//   getters,
// });
