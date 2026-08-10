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
  const requestId = useRef(0);
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
      requestId.current += 1;
      if (resetTimer.current !== null) {
        clearTimeout(resetTimer.current);
        resetTimer.current = null;
      }
    };
  }, []);

  async function copy() {
    const request = ++requestId.current;
    if (resetTimer.current !== null) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }

    try {
      await navigator.clipboard.writeText(text);
      if (!mounted.current || request !== requestId.current) return;
      if (resetTimer.current !== null) {
        clearTimeout(resetTimer.current);
        resetTimer.current = null;
      }
      setStatus("copied");
      const timer = setTimeout(() => {
        if (resetTimer.current === timer) resetTimer.current = null;
        if (mounted.current && request === requestId.current) {
          setStatus("idle");
        }
      }, 2_000);
      resetTimer.current = timer;
    } catch {
      if (!mounted.current || request !== requestId.current) return;
      if (resetTimer.current !== null) {
        clearTimeout(resetTimer.current);
        resetTimer.current = null;
      }
      setStatus("error");
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
