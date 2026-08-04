import React from "react";

import { cn } from "../lib/utils";

/** Traço de caneta/lápis sob um número — o "rabisco" do caderno. */
export const PencilUnderline: React.FC<{ className?: string }> = ({
  className,
}) => (
  <svg
    viewBox="0 0 200 12"
    preserveAspectRatio="none"
    aria-hidden
    className={cn("h-3 w-full text-pencil", className)}
  >
    <path
      d="M2 9 Q25 3 50 8 T100 7 T150 8 T198 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.65"
    />
  </svg>
);

export default PencilUnderline;
