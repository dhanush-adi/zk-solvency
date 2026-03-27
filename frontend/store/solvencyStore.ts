import { create } from 'zustand';
import { ProofOfReserves, InclusionProof, AuditorAuditLog, SolvencyHistoryEntry } from '@/lib/types';

interface SolvencyState {
  // Proof of Reserves Data
  currentProof: ProofOfReserves | null;
  proofHistory: ProofOfReserves[];
  
  // Inclusion Proof Data
  currentInclusionProof: InclusionProof | null;
  checkedWallets: Map<string, InclusionProof>;
  
  // Auditor Data
  auditLogs: AuditorAuditLog[];
  
  // Solvency History
  solvencyHistory: SolvencyHistoryEntry[];
  
  // UI State
  isLoadingProof: boolean;
  isVerifying: boolean;
  selectedProofId: string | null;
  
  // Actions
  setCurrentProof: (proof: ProofOfReserves | null) => void;
  addProofToHistory: (proof: ProofOfReserves) => void;
  setCurrentInclusionProof: (proof: InclusionProof | null) => void;
  addCheckedWallet: (address: string, proof: InclusionProof) => void;
  addAuditLog: (log: AuditorAuditLog) => void;
  addSolvencyHistoryEntry: (entry: SolvencyHistoryEntry) => void;
  setIsLoadingProof: (loading: boolean) => void;
  setIsVerifying: (verifying: boolean) => void;
  setSelectedProofId: (id: string | null) => void;
  clearState: () => void;
}

export const useSolvencyStore = create<SolvencyState>((set) => ({
  // Initial state
  currentProof: null,
  proofHistory: [],
  currentInclusionProof: null,
  checkedWallets: new Map(),
  auditLogs: [],
  solvencyHistory: [],
  isLoadingProof: false,
  isVerifying: false,
  selectedProofId: null,

  // Actions
  setCurrentProof: (proof) => set({ currentProof: proof }),

  addProofToHistory: (proof) =>
    set((state) => ({
      proofHistory: [proof, ...state.proofHistory],
    })),

  setCurrentInclusionProof: (proof) => set({ currentInclusionProof: proof }),

  addCheckedWallet: (address, proof) =>
    set((state) => {
      const newChecked = new Map(state.checkedWallets);
      newChecked.set(address, proof);
      return { checkedWallets: newChecked };
    }),

  addAuditLog: (log) =>
    set((state) => ({
      auditLogs: [log, ...state.auditLogs],
    })),

  addSolvencyHistoryEntry: (entry) =>
    set((state) => ({
      solvencyHistory: [entry, ...state.solvencyHistory],
    })),

  setIsLoadingProof: (loading) => set({ isLoadingProof: loading }),

  setIsVerifying: (verifying) => set({ isVerifying: verifying }),

  setSelectedProofId: (id) => set({ selectedProofId: id }),

  clearState: () =>
    set({
      currentProof: null,
      proofHistory: [],
      currentInclusionProof: null,
      checkedWallets: new Map(),
      auditLogs: [],
      solvencyHistory: [],
      isLoadingProof: false,
      isVerifying: false,
      selectedProofId: null,
    }),
}));
