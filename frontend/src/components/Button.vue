<template>
    <div>
      <template v-for="(opt, index) in adminOpt" :key="index">
        <template v-if="!isChanging(opt)">
          <ButtonOptions :onClick="opt.onClick" :title="opt.title" :icon="opt.icon" />
        </template>
        <template v-else>
          <span class="menubutton">
            <input
              v-if="opt.inputType === 'password' || opt.inputType === 'text'"
              :type="opt.inputType"
              v-model="inputValue(opt)"
              :style="{ borderRadius: '2px', width: '150px', marginLeft: '10px' }"
            />
            <Check @click="confirmAction(opt)" />
            <Cancel @click="cancelAction(opt)" />
          </span>
        </template>
      </template>
    </div>
  </template>
  
  <script>
  import ButtonOptions from './ButtonOptions.vue'; // Make sure to adjust the path
  
  export default {
    components: {
      ButtonOptions,
    },
    data() {
      return {
        isChangingState: {},
        inputValues: {},
        adminOpt: [
          {
            page: '/Logout',
            title: 'Logout',
            icon: 'Logout',
            visible: false,
            click1: false,
            onClick: this.logoutHandler,
          },
          {
            page: '/SchimbareParola',
            title: 'Schimbare parola',
            icon: 'VpnKey',
            visible: false,
            click1: false,
            inputType: 'password',
            action: this.changeAction,
          },
          {
            page: '/SchimbareUser',
            title: 'Schimbare user',
            icon: 'ManageAccounts',
            visible: false,
            click1: false,
            inputType: 'text',
            action: this.changeAction,
          },
        ],
      };
    },
    methods: {
      changeAction(opt) {
        this.isChangingState[opt.page] = true;
        this.inputValues[opt.page] = '';
      },
      confirmAction(opt) {
        const inputType = opt.inputType === 'password' ? 'pass' : 'account';
        const URL = `${opt.page.toLowerCase()}?${inputType}=${encodeURI(
          this.inputValues[opt.page]
        )}`;
  
        axios.get(URL).then(
          (response) => {
            if (response.data.error.startsWith('login')) {
              this.logoutHandler();
              return;
            }
            if (response.data.error.length > 0) {
              alert(`Eroare: ${response.data.error}`);
              return;
            }
            if (opt.inputType === 'password') {
              window.location.reload();
            } else {
              this.logoutHandler();
            }
          },
          (error) => {
            console.log(error);
          }
        );
  
        this.cancelAction(opt);
      },
      cancelAction(opt) {
        this.isChangingState[opt.page] = false;
        this.inputValues[opt.page] = '';
      },
      inputValue(opt) {
        return this.inputValues[opt.page] || '';
      },
      isChanging(opt) {
        return this.isChangingState[opt.page] || false;
      },
      logoutHandler(refreshPage = true) {
        // ... (similar logic as in the React code)
      },
    },
  };
  </script>
  
  <style scoped>
  /* Your component styles go here */
  </style>
  