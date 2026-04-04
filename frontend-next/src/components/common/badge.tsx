"use client";

import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const badge = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize",
  {
    variants: {
      variant: {
        draft: "bg-surface text-text-secondary border border-border",
        submitted: "bg-accent-subtle text-accent border border-accent/30",
        approved: "bg-success-subtle text-success border border-success/30",
        rejected: "bg-danger-subtle text-danger border border-danger/30",
      },
    },
    defaultVariants: { variant: "draft" },
  },
);

interface BadgeProps extends VariantProps<typeof badge> {
  className?: string;
  children?: React.ReactNode;
  status?: "draft" | "submitted" | "approved" | "rejected";
}

export default function Badge({
  variant,
  status,
  className,
  children,
}: BadgeProps) {
  const v = variant ?? status;
  return (
    <span className={clsx(badge({ variant: v }), className)}>
      {children ?? status}
    </span>
  );
}
