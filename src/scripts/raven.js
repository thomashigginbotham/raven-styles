import { customEnvPolyfill } from './custom-env-polyfill.js';

/**
 * Handles initialization of scripts.
 */
(() => {
  // Add simple polyfill for custom environment variables.
  customEnvPolyfill();
})();
