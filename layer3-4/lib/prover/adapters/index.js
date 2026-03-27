/**
 * adapters/index.js — Prover Adapter Registry
 *
 * Selects the appropriate prover adapter based on PROVER_ADAPTER env var.
 * Adding a new backend = creating one file + registering here.
 * No changes to prove.js or inputs.js needed.
 */

import * as sp1Adapter from './sp1.js';
import * as starkAdapter from './stark.js';

const adapters = {
  sp1: sp1Adapter,
  stark: starkAdapter,
};

/**
 * Get the configured prover adapter.
 *
 * @param {string} [adapterName] — override adapter name
 * @returns {{ prove: Function, verify: Function, name: string }}
 */
export function getAdapter(adapterName) {
  const name = adapterName || process.env.PROVER_ADAPTER || 'sp1';

  const adapter = adapters[name];
  if (!adapter) {
    const available = Object.keys(adapters).join(', ');
    throw new Error(
      `Unknown prover adapter: "${name}". Available: ${available}`
    );
  }

  return adapter;
}

/**
 * Register a new prover adapter at runtime.
 * Used for plugins / testing.
 *
 * @param {string} name
 * @param {{ prove: Function, verify: Function }} adapter
 */
export function registerAdapter(name, adapter) {
  if (!adapter.prove || !adapter.verify) {
    throw new Error('Adapter must implement prove() and verify()');
  }
  adapters[name] = adapter;
}

/**
 * List available adapter names.
 * @returns {string[]}
 */
export function listAdapters() {
  return Object.keys(adapters);
}
