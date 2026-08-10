import { useEffect, useRef, useState } from "react";

type CopyStatus = "idle" | "copied" | "error";

interface CopyButtonProps {
  text: string;
  idleLabel: string;
  copiedLabel: string;
  errorLabel: string;
}

export function CopyButton({
  text,
  idleLabel,
  copiedLabel,
  errorLabel
}: CopyButtonProps) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const currentLabel =
    status === "copied"
      ? copiedLabel
      : status === "error"
        ? errorLabel
        : idleLabel;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    };
  }, []);

  async function copy() {
    if (resetTimer.current !== null) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }

    try {
      await navigator.clipboard.writeText(text);
      if (!mounted.current) return;
      setStatus("copied");
      resetTimer.current = setTimeout(() => {
        setStatus("idle");
        resetTimer.current = null;
      }, 2_000);
    } catch {
      if (mounted.current) setStatus("error");
    }
  }

  return (
    <>
      <button
        className="example-action copy-button"
        onClick={() => void copy()}
        type="button"
      >
        {currentLabel}
      </button>
      <span
        aria-atomic="true"
        aria-live="polite"
        className="sr-status"
        role="status"
      >
        {status === "idle" ? "" : currentLabel}
      </span>
    </>
  );
}
