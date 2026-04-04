"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { format, parseISO } from "date-fns";
import Input from "@/components/common/input";
import Select from "@/components/common/select";
import type { TimesheetEntry } from "@/types";

const WORK_TYPES = [
  { value: "", label: "—" },
  { value: "Remote", label: "Remote" },
  { value: "On-site", label: "On-site" },
  { value: "Leave", label: "Leave" },
  { value: "Holiday", label: "Holiday" },
];

interface DayRowProps {
  index: number;
  readOnly?: boolean;
}

export interface WeeklyTimesheetForm {
  entries: TimesheetEntry[];
}

export default function DayRow({ index, readOnly = false }: DayRowProps) {
  const { register, control } = useFormContext<WeeklyTimesheetForm>();

  const date = useWatch({ control, name: `entries.${index}.date` });
  const isPresent = useWatch({ control, name: `entries.${index}.is_present` });

  const dayLabel = date ? format(parseISO(date), "EEE, MMM d") : "";
  const absent = !isPresent;

  return (
    <div
      className={`grid grid-cols-[140px_120px_90px_120px_1fr] items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 ${absent ? "opacity-60" : ""}`}
    >
      <span className="text-sm font-medium text-text-primary">{dayLabel}</span>

      {/* Presence toggle */}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          className="sr-only"
          disabled={readOnly}
          {...register(`entries.${index}.is_present`)}
        />
        <span
          className={`flex h-5 w-9 items-center rounded-full transition-colors ${isPresent ? "bg-accent" : "bg-border-strong"} ${readOnly ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`ml-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isPresent ? "translate-x-4" : ""}`}
          />
        </span>
        <span
          className={`text-xs ${isPresent ? "font-medium text-accent" : "text-text-secondary"}`}
        >
          {isPresent ? "Present" : "Absent"}
        </span>
      </label>

      {/* Hours */}
      <Input
        type="number"
        min={0.5}
        max={24}
        step={0.5}
        placeholder="Hours"
        disabled={absent || readOnly}
        className="w-20"
        {...register(`entries.${index}.hours`, { valueAsNumber: true })}
      />

      {/* Work type */}
      <Select
        disabled={absent || readOnly}
        {...register(`entries.${index}.work_type`)}
      >
        {WORK_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>

      {/* Notes */}
      <Input
        type="text"
        placeholder="Notes (optional)"
        disabled={readOnly}
        {...register(`entries.${index}.notes`)}
      />
    </div>
  );
}
