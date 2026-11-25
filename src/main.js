// main.js: starts the radio (p5 and p5.sound are loaded before, as global scripts).
import { App } from './App.js';

window.radio = new App();
window.radio.mount();
