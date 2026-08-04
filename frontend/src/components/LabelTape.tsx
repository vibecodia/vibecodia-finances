import React from "react";

import { cn } from "../lib/utils";

interface LabelTapeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Graus de rotação da fita */
  rot?: number;
}

/** Fita adesiva (label tape) — identidade do header. */
export const LabelTape: React.FC<LabelTapeProps> = ({
  rot = -2,
  className,
  children,
  ...props
}) => (
  <span
    {...props}
    className={cn("tape inline-block px-4 py-1 rounded-[2px]", className)}
    style={{ transform: `rotate(${rot}deg)` }}
  >
    {children}
  </span>
);

export default LabelTape;
