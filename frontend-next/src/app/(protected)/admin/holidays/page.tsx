"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, getYear } from "date-fns";
import AuthGate from "@/components/common/auth-gate";
import Button from "@/components/common/button";
import Card from "@/components/common/card";
import Input from "@/components/common/input";
import Select from "@/components/common/select";
import { getHolidays, createHoliday, deleteHoliday } from "@/api/admin";
import type { PublicHoliday } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const QUERY_KEYS = {
  holidays: (year: number) => ["admin-holidays", year] as const,
};

export default function HolidaysPage() {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.holidays(selectedYear),
    queryFn: () => getHolidays(selectedYear),
  });

  const createMutation = useMutation({
    mutationFn: createHoliday,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.holidays(selectedYear),
      });
      setNewDate("");
      setNewName("");
      setFormError("");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to create holiday.";
      setFormError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      setDeletingId(null);
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.holidays(selectedYear),
      });
    },
    onError: () => {
      setDeletingId(null);
      alert("Failed to delete holiday.");
    },
  });

  function handleAdd() {
    setFormError("");
    if (!newDate || !newName.trim()) {
      setFormError("Date and name are required.");
      return;
    }
    const year = getYear(parseISO(newDate));
    if (year !== selectedYear) {
      setFormError(`Date must be in ${selectedYear}.`);
      return;
    }
    createMutation.mutate({ date: newDate, name: newName.trim() });
  }

  return (
    <AuthGate adminOnly>
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Public Holidays
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              Holidays are pre-filled automatically when workers create new
              timesheets
            </p>
          </div>
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-[110px]"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>

        {/* Add holiday form */}
        <Card className="mb-6">
          <div className="p-4">
            <h2 className="mb-3 text-sm font-medium text-text-primary">
              Add Holiday
            </h2>
            {formError && (
              <p className="mb-3 text-sm text-danger">{formError}</p>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Date
                </label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="min-w-[200px] flex-1">
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Holiday Name
                </label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. New Year's Day"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={createMutation.isPending}
                size="sm"
              >
                {createMutation.isPending ? "Adding…" : "Add Holiday"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Holidays list */}
        <Card overflow>
          {isLoading ? (
            <div className="p-8 text-center text-sm text-text-secondary">
              Loading…
            </div>
          ) : holidays.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-2xl">📅</p>
              <p className="mt-2 text-sm text-text-secondary">
                No holidays for {selectedYear}
              </p>
              <p className="text-xs text-text-disabled">
                Add holidays above to pre-fill worker timesheets
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Date", "Name", ""].map((h, i) => (
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
                {holidays.map((holiday: PublicHoliday) => (
                  <tr
                    key={holiday.id}
                    className="border-b border-border last:border-0 hover:bg-surface-alt"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {format(parseISO(holiday.date), "EEE, MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-text-primary">
                      {holiday.name}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setDeletingId(holiday.id);
                          deleteMutation.mutate(holiday.id);
                        }}
                        disabled={
                          deleteMutation.isPending && deletingId === holiday.id
                        }
                      >
                        {deleteMutation.isPending && deletingId === holiday.id
                          ? "Deleting…"
                          : "Delete"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </AuthGate>
  );
}
