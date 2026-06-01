import React from "react";
import { cn } from "../../lib/utils";

interface HighlightProps {
  text: string;
  searchTerm: string;
  className?: string;
  highlightClassName?: string;
}

export const Highlight = React.memo(
  ({ text, searchTerm, className, highlightClassName }: HighlightProps) => {
    if (!searchTerm || !text) return <span className={className}>{text}</span>;

    const parts = text.split(
      new RegExp(
        `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi",
      ),
    );

    return (
      <span className={className}>
        {parts.map((part, i) => (
          <span
            key={i}
            className={
              part.toLowerCase() === searchTerm.toLowerCase()
                ? cn(
                    "bg-amber-400/40 text-amber-950 font-black rounded-sm px-0.5 shadow-[0_0_8px_rgba(251,191,36,0.4)]",
                    highlightClassName,
                  )
                : ""
            }
          >
            {part}
          </span>
        ))}
      </span>
    );
  },
);
