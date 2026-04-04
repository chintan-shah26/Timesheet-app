"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSetting } from "@/api/admin";
import AuthGate from "@/components/common/auth-gate";
import Button from "@/components/common/button";
import Card from "@/components/common/card";
import Input from "@/components/common/input";

const QUERY_KEYS = {
  settings: ["admin-settings"] as const,
};

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [threshold, setThreshold] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: QUERY_KEYS.settings,
    queryFn: getSettings,
  });

  // Sync local state once settings load
  useEffect(() => {
    if (settings) setThreshold(settings.overtime_threshold_hours ?? "8");
  }, [settings]);

  const displayThreshold =
    threshold !== "" ? threshold : (settings?.overtime_threshold_hours ?? "8");

  const updateMutation = useMutation({
    mutationFn: () =>
      updateSetting("overtime_threshold_hours", displayThreshold),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => alert("Failed to save settings. Please try again."),
  });

  return (
    <AuthGate adminOnly>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Configure application-wide defaults
          </p>
        </div>

        <Card>
          <div className="px-5 py-4">
            <h2 className="mb-4 text-sm font-semibold text-text-primary">
              Overtime
            </h2>

            {isLoading ? (
              <p className="text-sm text-text-secondary">Loading…</p>
            ) : (
              <div className="flex max-w-xs flex-col gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    Overtime threshold (hours/day)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={displayThreshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-32"
                  />
                  <p className="mt-1 text-xs text-text-disabled">
                    Entries exceeding this value per day are flagged as
                    overtime. Default: 8h.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                  >
                    {saved
                      ? "✓ Saved!"
                      : updateMutation.isPending
                        ? "Saving…"
                        : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AuthGate>
  );
}
