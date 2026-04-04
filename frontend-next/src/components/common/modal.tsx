"use client";

import type { ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}

export default function Modal({ children, onClose, wide }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full rounded-lg bg-surface p-6 shadow-md ${wide ? "max-w-2xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
