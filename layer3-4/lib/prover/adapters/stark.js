/**
 * stark.js — Cairo/StarkNet Prover Adapter (Secondary)
 *
 * Same interface as SP1 adapter. Placeholder for future integration
 * with native StarkNet STARK proving.
 *
 * Interface: { prove(inputs), verify(proof, publicInputs) }
 */

export async function prove(_inputs) {
  throw new Error(
    'Cairo/StarkNet STARK adapter is not yet implemented. ' +
    'Set PROVER_ADAPTER=sp1 to use the SP1 adapter.'
  );
}

export async function verify(_proof, _publicInputs) {
  throw new Error(
    'Cairo/StarkNet STARK adapter is not yet implemented. ' +
    'Set PROVER_ADAPTER=sp1 to use the SP1 adapter.'
  );
}

export const name = 'stark';
