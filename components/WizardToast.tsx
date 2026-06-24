"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

type WizardToastProps = {
  message: string;
  subMessage?: string;
  onDismiss?: () => void;
  durationMs?: number;
};

export function WizardToast({
  message,
  subMessage,
  onDismiss,
  durationMs = 4500,
}: WizardToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!onDismiss) return;
    const t = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, onDismiss]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="wizard-toast"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        role="status"
        aria-live="polite"
      >
        <span className="wizard-toast-gem" aria-hidden>
          ✦
        </span>
        <div className="wizard-toast-body">
          <p className="wizard-toast-message">{message}</p>
          {subMessage ? <p className="wizard-toast-sub">{subMessage}</p> : null}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
