import 'babel-polyfill';

import Vue from 'vue';
import './index.css';

import Status from './Status.vue';
import GTranslate from './GTranslate.vue';
import Settings from './Settings.vue';

new Vue({
  el: '#app',
  components: {
    status: Status,
    'g-translate': GTranslate,
    settings: Settings
  }
});
