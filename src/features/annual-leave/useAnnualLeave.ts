import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  adjustAnnualLeaveBalance,
  commitAnnualLeaveImport,
  getAnnualLeaveLedger,
  listAnnualLeaveBalances,
  previewAnnualLeaveImport,
} from "./annualLeaveApi";
import type { AnnualLeaveQuery } from "./annualLeaveTypes";

export const annualLeaveKeys = {
  all: ["annual-leave"] as const,
  list: (query: AnnualLeaveQuery) => ["annual-leave", "list", query] as const,
  ledger: (employeeId: string | null, year: number) =>
    ["annual-leave", "ledger", employeeId, year] as const,
};

export function useAnnualLeaveBalances(query: AnnualLeaveQuery) {
  return useQuery({
    queryKey: annualLeaveKeys.list(query),
    queryFn: () => listAnnualLeaveBalances(query),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useAnnualLeaveImportPreview() {
  return useMutation({
    mutationFn: ({ file, year }: { file: File; year: number }) =>
      previewAnnualLeaveImport(file, year),
  });
}

export function useCommitAnnualLeaveImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      batchId,
      allowWarnings,
      note,
    }: {
      batchId: string;
      allowWarnings: boolean;
      note?: string;
    }) => commitAnnualLeaveImport(batchId, { allowWarnings, note }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: annualLeaveKeys.all }),
  });
}

export function useAnnualLeaveLedger(employeeId: string | null, year: number) {
  return useQuery({
    queryKey: annualLeaveKeys.ledger(employeeId, year),
    queryFn: () => getAnnualLeaveLedger(employeeId!, year),
    enabled: Boolean(employeeId),
  });
}

export function useAdjustAnnualLeaveBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      year,
      daysDelta,
      note,
    }: {
      employeeId: string;
      year: number;
      daysDelta: number;
      note: string;
    }) => adjustAnnualLeaveBalance(employeeId, year, { daysDelta, note }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: annualLeaveKeys.all }),
  });
}
