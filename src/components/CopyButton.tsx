"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  /** Text placed on the clipboard when clicked. */
  value: string;
  /** Visible label; falls back to "Copy". */
  label?: string;
  className?: string;
}

/** Small button that copies `value` to the clipboard and confirms briefly. */
export default function CopyButton({ value, label = "Copy", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); fail quietly.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
        copied
          ? "border-aurora-green/30 text-aurora-green bg-aurora-green/10"
          : "border-overlay/10 text-foreground/50 hover:text-foreground/80 bg-overlay/5 hover:bg-overlay/10",
        className
      )}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}
