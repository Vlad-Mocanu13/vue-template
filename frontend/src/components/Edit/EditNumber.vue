<template>
    <div>
      <div v-if="active" style="white-space: nowrap;">
        <input
          v-model="newNumber"
          @input="inputHandler"
          @keydown="checkInputHandler"
          type="number"
          :style="style"
        />
        <div v-if="isHalfHour !== undefined" class="checkboxHalfHour" style="white-space: nowrap;">
          <label style="white-space: nowrap;">
            <input
              type="checkbox"
              :checked="newNumber % 2 === 1"
              @change="checkboxInputHandler"
              style="white-space: nowrap;"
            />
            <span style="white-space: nowrap;">{{ newNumber % 2 === 1 ? ':30' : '00' }}</span>
          </label>
        </div>
      </div>
      <Loading v-if="isLoading" />
      <div style="white-space: nowrap;">
        <EditText
          v-if="!active"
          :startHandler="startHandler"
          :text="parseInt(newNumber / (isHalfHour ? 2 : 1))"
          :style="{ maxWidth, minWidth }"
          :isHalfHour="isHalfHour"
          :readOnly="readOnly"
        />
        <EditStartButton v-if="!active && !isLoading && !readOnly" :startHandler="startHandler" />
      </div>
      <EditCloseButton v-if="active" :cancelHandler="cancelHandler" />
      <EditDoneButton v-if="active" :finishHandler="finishHandler" />
    </div>
  </template>
  
  <script>
  import { ref } from 'vue';
  import EditText from './EditUtils/EditText.vue';
  import EditStartButton from './EditUtils/EditStartButton.vue';
  import EditCloseButton from './EditUtils/EditCloseButton.vue';
  import EditDoneButton from './EditUtils/EditDoneButton.vue';
  import Loading from '../utils/Loading.vue';
  import { isValidDigit } from '../../utils/helper_functions';
  
  const MIN_LIMIT = 0;
  const MAX_LIMIT = 999999999999;
  
  export default {
    props: {
      number: {
        type: [String, Number],
        default: 0,
      },
      style: Object,
      minWidth: String,
      maxWidth: String,
      onFinish: Function,
      isLoading: Boolean,
      readOnly: Boolean,
      isHalfHour: Boolean,
      makeRoundingOnSubmit: Boolean,
      min: {
        type: Number,
        default: MIN_LIMIT,
      },
      max: {
        type: Number,
        default: MAX_LIMIT,
      },
    },
    setup(props) {
      const active = ref(false);
      const newNumber = ref(parseInt(props.number) || 0);
      const lastValidNumber = ref(newNumber.value);
      const minNumber = ref(Math.max(MIN_LIMIT, props.min));
      const maxNumber = ref(Math.min(MAX_LIMIT, props.max));
  
      const startHandler = () => {
        active.value = true;
        lastValidNumber.value = newNumber.value;
      };
  
      const inputHandler = () => {
        if (isNaN(newNumber.value)) {
          newNumber.value = minNumber.value;
        }
        if (props.makeRoundingOnSubmit) {
          newNumber.value = Math.min(maxNumber.value, Math.max(newNumber.value, minNumber.value));
        }
      };
  
      const checkboxInputHandler = () => {
        newNumber.value = newNumber.value + (newNumber.value % 2 === 1 ? 1 : -1);
      };
  
      const checkInputHandler = (event) => {
        if (!isValidDigit(event.keyCode)) {
          event.preventDefault();
        }
      };
  
      const finishHandler = () => {
        if (props.makeRoundingOnSubmit) {
          let roundedNumber = Math.min(maxNumber.value, Math.max(newNumber.value, minNumber.value));
          newNumber.value = roundedNumber;
          console.log('ALERT! Numarul schimbat a fost rotunjit la limita (minima/maxima) deoarece valoarea introdusa depasea limita.');
        }
        if (typeof props.onFinish === 'function') {
          props.onFinish(newNumber.value);
        }
        active.value = false;
      };
  
      const cancelHandler = () => {
        active.value = false;
        newNumber.value = lastValidNumber.value;
      };
  
      return {
        active,
        newNumber,
        startHandler,
        inputHandler,
        checkboxInputHandler,
        checkInputHandler,
        finishHandler,
        cancelHandler,
      };
    },
  };
  </script>
  