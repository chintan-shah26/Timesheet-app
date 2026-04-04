"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, addDays } from "date-fns";
import {
  getTimesheet,
  saveEntries,
  submitTimesheet,
  recallTimesheet,
} from "@/api/timesheets";
import Badge from "@/components/common/badge";
import Button from "@/components/common/button";
import Card from "@/components/common/card";
import Modal from "@/components/common/modal";
import Textarea from "@/components/common/textarea";
import DayRow, {
  type WeeklyTimesheetForm,
} from "@/components/pages/weekly-timesheet/day-row";
import type { TimesheetEntry } from "@/types";

function buildDefaultEntries(weekStart: string): TimesheetEntry[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: format(addDays(parseISO(weekStart), i), "yyyy-MM-dd"),
    is_present: false,
    hours: null,
    work_type: null,
    notes: null,
  }));
}

const QUERY_KEYS = {
  timesheet: (id: string) => ["timesheet", id] as const,
};

export default function WeeklyTimesheetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: sheet, isLoading } = useQuery({
    queryKey: QUERY_KEYS.timesheet(id),
    queryFn: () => getTimesheet(Number(id)),
  });

  const methods = useForm<WeeklyTimesheetForm>({
    defaultValues: { entries: [] },
  });

  const { reset, control, getValues } = methods;

  useEffect(() => {
    if (!sheet) return;
    reset({
      entries:
        sheet.entries.length > 0
          ? sheet.entries
          : buildDefaultEntries(sheet.week_start),
    });
  }, [sheet, reset]);

  const entries = useWatch({ control, name: "entries" });
  const readOnly = sheet?.status !== "draft";

  const saveMutation = useMutation({
    mutationFn: () => saveEntries(Number(id), getValues("entries")),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => alert("Failed to save. Please try again."),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      await saveEntries(Number(id), getValues("entries"));
      await submitTimesheet(Number(id));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.timesheet(id),
      });
      setShowSubmitModal(false);
    },
    onError: () => alert("Failed to submit. Please try again."),
  });

  const recallMutation = useMutation({
    mutationFn: () => recallTimesheet(Number(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.timesheet(id),
      });
    },
    onError: () => alert("Failed to recall timesheet. Please try again."),
  });

  if (isLoading || !sheet) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-secondary">
        Loading…
      </div>
    );
  }

  const mon = parseISO(sheet.week_start);
  const weekLabel = `${format(mon, "MMM d")} – ${format(addDays(mon, 6), "MMM d, yyyy")}`;
  const presentCount = entries.filter((e) => e.is_present).length;
  const totalHours = entries.reduce(
    (s, e) => s + (e.is_present && e.hours ? Number(e.hours) : 0),
    0,
  );

  return (
    <FormProvider {...methods}>
      <div>
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            ← Back
          </Button>
          <span className="text-text-disabled">|</span>
          <h1 className="text-base font-semibold text-text-primary">
            Week of {weekLabel}
          </h1>
          <Badge status={sheet.status} />
        </div>

        {/* Admin note */}
        {sheet.admin_note && (
          <div className="mb-4 rounded-md border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-text-primary">
            <strong>Note from admin:</strong> {sheet.admin_note}
          </div>
        )}

        {/* Stats */}
        <div className="mb-4 flex gap-6 text-sm text-text-secondary">
          <span>
            Present:{" "}
            <strong className="text-text-primary">{presentCount} days</strong>
          </span>
          <span>
            Total Hours:{" "}
            <strong className="text-text-primary">{totalHours}h</strong>
          </span>
        </div>

        {/* Day rows */}
        <Card className="mb-4">
          <div className="grid grid-cols-[140px_120px_90px_120px_1fr] gap-3 border-b border-border px-4 py-2">
            {["Day", "Presence", "Hours", "Type", "Notes"].map((h) => (
              <span
                key={h}
                className="text-xs font-medium uppercase tracking-wide text-text-secondary"
              >
                {h}
              </span>
            ))}
          </div>
          {entries.map((entry, i) => (
            <DayRow key={entry.date} index={i} readOnly={readOnly} />
          ))}
        </Card>

        {/* Recall button (submitted/rejected) */}
        {(sheet.status === "submitted" || sheet.status === "rejected") && (
          <div className="mb-4 flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => recallMutation.mutate()}
              disabled={recallMutation.isPending}
            >
              {recallMutation.isPending ? "Withdrawing…" : "Edit Timesheet"}
            </Button>
            <span className="text-xs text-text-secondary">
              This will withdraw your submission so you can make changes.
            </span>
          </div>
        )}

        {/* Draft actions */}
        {!readOnly && (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saved
                ? "✓ Saved!"
                : saveMutation.isPending
                  ? "Saving…"
                  : "Save Draft"}
            </Button>
            <Button
              onClick={() => setShowSubmitModal(true)}
              disabled={saveMutation.isPending}
            >
              Submit for Review
            </Button>
          </div>
        )}

        {/* Submit confirmation modal */}
        {showSubmitModal && (
          <Modal onClose={() => setShowSubmitModal(false)}>
            <h2 className="mb-2 text-base font-semibold text-text-primary">
              Submit timesheet?
            </h2>
            <p className="mb-5 text-sm text-text-secondary">
              Once submitted, you won&apos;t be able to edit this timesheet
              unless the admin rejects it.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting…" : "Confirm Submit"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowSubmitModal(false)}
              >
                Cancel
              </Button>
            </div>
          </Modal>
        )}
      </div>
    </FormProvider>
  );
}
