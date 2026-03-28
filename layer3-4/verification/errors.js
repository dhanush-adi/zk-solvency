/**
 * errors.js — Domain-specific error classes for Layer 7 verification
 */

export class VerificationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'VerificationError';
    this.details = details;
  }
}

export class InclusionError extends VerificationError {
  constructor(reason, details = {}) {
    super(`Inclusion verification failed: ${reason}`, { reason, ...details });
    this.name = 'InclusionError';
  }
}

export class ChainGapError extends VerificationError {
  constructor(cycleId, expectedPrev, actualPrev) {
    super(`Gap detected at cycle ${cycleId}: expected previous cycle ${expectedPrev}, found ${actualPrev}`, {
      cycleId,
      expectedPrev,
      actualPrev,
      severity: 'critical'
    });
    this.name = 'ChainGapError';
  }
}

export class RootTamperError extends VerificationError {
  constructor(cycleId, onChain, artifact) {
    super(`Root mismatch at cycle ${cycleId}: On-chain (${onChain}) !== Artifact (${artifact})`, {
      cycleId,
      onChain,
      artifact,
      severity: 'critical'
    });
    this.name = 'RootTamperError';
  }
}
