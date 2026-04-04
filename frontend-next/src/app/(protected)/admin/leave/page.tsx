"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AuthGate from "@/components/common/auth-gate";
import Button from "@/components/common/button";
import Card from "@/components/common/card";
import Input from "@/components/common/input";
import Select from "@/components/common/select";
import { getLeaveBalances, setLeaveBalance } from "@/api/admin";
import type { AdminLeaveBalance } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const QUERY_KEYS = {
  balances: (year: number) => ["admin-leave-balances", year] as const,
};

export default function LeaveBalancePage() {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  // Track inline edits: userId -> draftValue
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saveError, setSaveError] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const { data: balances = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.balances(selectedYear),
    queryFn: () => getLeaveBalances(selectedYear),
  });

  const saveMutation = useMutation({
    mutationFn: setLeaveBalance,
    onSuccess: (_, variables) => {
      setSavingId(null);
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.balances(selectedYear),
      });
      setDrafts((d) => {
        const next = { ...d };
        delete next[variables.user_id];
        return next;
      });
      setSaveError((e) => {
        const next = { ...e };
        delete next[variables.user_id];
        return next;
      });
    },
    onError: (err: unknown, variables) => {
      setSavingId(null);
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to save.";
      setSaveError((e) => ({ ...e, [variables.user_id]: msg }));
    },
  });

  function handleSave(balance: AdminLeaveBalance) {
    const raw = drafts[balance.user_id];
    const days = raw !== undefined ? Number(raw) : balance.allocated_days;
    if (!Number.isInteger(days) || days < 0) {
      setSaveError((e) => ({
        ...e,
        [balance.user_id]: "Must be a non-negative whole number.",
      }));
      return;
    }
    setSavingId(balance.user_id);
    saveMutation.mutate({
      user_id: balance.user_id,
      year: selectedYear,
      allocated_days: days,
    });
  }

  return (
    <AuthGate adminOnly>
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Leave Balances
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              Set annual leave allocation per worker
            </p>
          </div>
          <Select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setDrafts({});
              setSaveError({});
            }}
            className="w-[110px]"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>

        <Card overflow>
          {isLoading ? (
            <div className="p-8 text-center text-sm text-text-secondary">
              Loading…
            </div>
          ) : balances.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-2xl">👤</p>
              <p className="mt-2 text-sm text-text-secondary">No workers yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {[
                    "Worker",
                    "Allocated Days",
                    "Used Days",
                    "Remaining",
                    "",
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-secondary"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {balances.map((balance: AdminLeaveBalance) => {
                  const draftVal = drafts[balance.user_id];
                  const allocDisplay =
                    draftVal !== undefined
                      ? draftVal
                      : String(balance.allocated_days);
                  const used = Number(balance.used_days);
                  const alloc =
                    draftVal !== undefined
                      ? parseInt(draftVal) || 0
                      : balance.allocated_days;
                  const remaining = Math.max(0, alloc - used);
                  const isDirty = draftVal !== undefined;

                  return (
                    <tr
                      key={balance.user_id}
                      className="border-b border-border last:border-0 hover:bg-surface-alt"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">
                          {balance.name}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {balance.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={allocDisplay}
                            onChange={(e) =>
                              setDrafts((d) => ({
                                ...d,
                                [balance.user_id]: e.target.value,
                              }))
                            }
                            className="w-20"
                          />
                          {saveError[balance.user_id] && (
                            <span className="text-xs text-danger">
                              {saveError[balance.user_id]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-primary">{used}</td>
                      <td className="px-4 py-3 text-text-primary">
                        {remaining}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isDirty && (
                          <Button
                            size="sm"
                            onClick={() => handleSave(balance)}
                            disabled={
                              saveMutation.isPending &&
                              savingId === balance.user_id
                            }
                          >
                            Save
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </AuthGate>
  );
}
