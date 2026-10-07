"use client";
import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

/** Native select (best mobile/screen-reader behaviour) restyled to match inputs, 44px tall. */
export const SelectField = forwardRef<HTMLSelectElement, Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">>(
  function SelectField(props, ref) {
    return (
      <div className="relative">
        <select ref={ref} {...props} className="input !min-h-11 cursor-pointer appearance-none !pr-10" />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
      </div>
    );
  },
);
