"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Custom styled dropdown replacing native <select>, since browsers render
 * the OPEN option list using OS/system styling that ignores site CSS
 * entirely — this is the same fix applied to the CMS a while back, now
 * shared so the public site's Search filters get it too.
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onClick);
    return () => document.removeEventListener("pointerdown", onClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="focus-ring flex w-full items-center justify-between rounded-xl border border-black/10 bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition hover:border-black/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/20"
      >
        <span className={selected ? "text-ink dark:text-white" : "text-ink/40 dark:text-white/40"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-ink/40 transition-transform dark:text-white/40 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="glass-strong absolute inset-x-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl p-1.5">
          {options.length === 0 && (
            <p className="px-3 py-2 text-sm text-ink/40 dark:text-white/40">No options available.</p>
          )}
          {options.map((opt) => (
            <button
              key={opt.value || "__empty__"}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-signal/10 ${
                opt.value === value ? "text-signal" : "text-ink/80 dark:text-white/80"
              }`}
            >
              {opt.label}
              {opt.value === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
