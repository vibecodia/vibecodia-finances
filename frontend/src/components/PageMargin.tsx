import React from "react";

/** Margem vermelha vertical única, atravessa a página inteira como num caderno. */
export const PageMargin: React.FC = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-y-0 left-3 lg:left-5 w-px bg-pen/60"
  />
);

export default PageMargin;
