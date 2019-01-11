import 'babel-polyfill';

import Vue from 'vue';
import './index.css';

import Settings from './Settings.vue';
import Status from './Status.vue';

new Vue({
  el: '#app',
  components: {
    settings: Settings,
    status: Status
  }
});
