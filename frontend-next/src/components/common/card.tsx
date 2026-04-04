import clsx from "clsx";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  overflow?: boolean;
}

export default function Card({ children, className, overflow }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-border bg-surface shadow-sm",
        overflow && "overflow-x-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}
