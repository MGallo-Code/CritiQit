"use client";

import { useRef, useEffect, KeyboardEvent, ClipboardEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * OTP Input Component
 *
 * A fully accessible 6-digit OTP input with individual fields for each digit.
 *
 * Features:
 * - Auto-advance on type
 * - Auto-backspace on delete
 * - Paste support (fills all 6 digits)
 * - Auto-focus on mount
 * - Full keyboard navigation
 * - WCAG 2.2 compliant
 * - Screen reader support with ARIA labels
 *
 * Accessibility:
 * - Each input has descriptive aria-label
 * - inputmode="numeric" for mobile number keyboards
 * - pattern="[0-9]" for validation
 * - Proper tab order
 * - Screen reader announces position ("Digit 1 of 6")
 */

export interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  /**
   * Auto-focus the first input when component mounts
   * @default true
   */
  autoFocus?: boolean;
}

export function OTPInput({
  value,
  onChange,
  disabled = false,
  error = false,
  className,
  autoFocus = true,
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const LENGTH = 6;

  // Split value into array of 6 characters (pad with empty strings if needed)
  const digits = value.padEnd(LENGTH, "").slice(0, LENGTH).split("");

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  /**
   * Handle input change for a specific digit
   */
  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Only allow single digit
    if (inputValue.length > 1) {
      return;
    }

    // Only allow numbers
    if (inputValue && !/^\d$/.test(inputValue)) {
      return;
    }

    // Update the digit at this index
    const newDigits = [...digits];
    newDigits[index] = inputValue;
    const newValue = newDigits.join("").replace(/\s/g, ""); // Remove padding spaces

    onChange(newValue);

    // Auto-advance to next input if digit was entered
    if (inputValue && index < LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Backspace: move to previous input if current is empty
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Left arrow: move to previous input
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    // Right arrow: move to next input
    if (e.key === "ArrowRight" && index < LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }

    // Home: move to first input
    if (e.key === "Home") {
      e.preventDefault();
      inputRefs.current[0]?.focus();
    }

    // End: move to last input
    if (e.key === "End") {
      e.preventDefault();
      inputRefs.current[LENGTH - 1]?.focus();
    }
  };

  /**
   * Handle paste event - fill all inputs from clipboard
   */
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    const pastedData = e.clipboardData.getData("text/plain").trim();

    // Only accept numeric paste data
    if (!/^\d+$/.test(pastedData)) {
      return;
    }

    // Take first 6 digits from pasted data
    const pastedDigits = pastedData.slice(0, LENGTH).padEnd(LENGTH, "").split("");

    onChange(pastedDigits.join("").replace(/\s/g, ""));

    // Focus the last filled input or the first empty one
    const lastFilledIndex = Math.min(pastedData.length - 1, LENGTH - 1);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  /**
   * Handle focus - select all text in input
   */
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className={cn("flex gap-1 sm:gap-3 justify-center", className)} role="group" aria-label="Verification code input">
      {Array.from({ length: LENGTH }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          value={digits[index] || ""}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={handleFocus}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          className={cn(
            "w-9 h-9 sm:w-12 sm:h-12 text-center text-base sm:text-2xl font-semibold",
            "rounded-md border-2 transition-all duration-200",
            "focus:outline-none",
            "text-foreground caret-star-yellow",
            // Normal state
            !error && !disabled && "bg-background border-warm-red-muted/40",
            // Focused state - golden outline
            !error && !disabled && "focus:border-star-yellow focus:ring-2 focus:ring-star-yellow/30",
            // Error state
            error && "border-error bg-error/5 focus:ring-error/20",
            // Disabled state
            disabled && "bg-muted opacity-50 cursor-not-allowed border-warm-red-muted/20",
            // Hover state - gold accent on hover
            !disabled && !error && "hover:border-star-yellow/60"
          )}
        />
      ))}
    </div>
  );
}
