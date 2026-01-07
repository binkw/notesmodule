"use client";

import { forwardRef, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════
// BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const buttonStyles = {
  base: `
    inline-flex items-center justify-center gap-2
    font-medium rounded-[var(--radius-md)]
    transition-all duration-[var(--motion-fast)]
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98]
  `,
  variants: {
    primary: `
      bg-accent text-white
      hover:bg-accent-hover
      border border-transparent
    `,
    secondary: `
      bg-surface text-foreground
      border border-border
      hover:bg-surface-hover hover:border-border-hover
    `,
    ghost: `
      bg-transparent text-foreground
      border border-transparent
      hover:bg-surface-hover
    `,
    danger: `
      bg-error/10 text-error
      border border-error/20
      hover:bg-error/20
    `,
  },
  sizes: {
    sm: "h-8 px-3 text-[13px]",
    md: "h-10 px-4 text-[14px]",
    lg: "h-12 px-6 text-[15px]",
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", loading, icon, children, className = "", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${buttonStyles.base}
          ${buttonStyles.variants[variant]}
          ${buttonStyles.sizes[size]}
          ${className}
        `.trim().replace(/\s+/g, " ")}
        {...props}
      >
        {loading ? (
          <span className="animate-pulse">•••</span>
        ) : (
          <>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

// ═══════════════════════════════════════════════════════════════════
// INPUT COMPONENT
// ═══════════════════════════════════════════════════════════════════
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`
          h-10 w-full px-3
          bg-surface text-foreground
          border rounded-[var(--radius-md)]
          placeholder:text-muted
          transition-colors duration-[var(--motion-fast)]
          focus:outline-none focus:border-accent
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? "border-error" : "border-border hover:border-border-hover"}
          ${className}
        `.trim().replace(/\s+/g, " ")}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// ═══════════════════════════════════════════════════════════════════
// TEXTAREA COMPONENT
// ═══════════════════════════════════════════════════════════════════
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`
          w-full px-3 py-3
          bg-surface text-foreground
          border rounded-[var(--radius-md)]
          placeholder:text-muted
          transition-colors duration-[var(--motion-fast)]
          focus:outline-none focus:border-accent
          disabled:opacity-50 disabled:cursor-not-allowed
          resize-none
          leading-relaxed
          ${error ? "border-error" : "border-border hover:border-border-hover"}
          ${className}
        `.trim().replace(/\s+/g, " ")}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

// ═══════════════════════════════════════════════════════════════════
// PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════════
interface PanelProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  border?: boolean;
}

const panelPadding = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Panel({ children, className = "", padding = "md", border = true }: PanelProps) {
  return (
    <div
      className={`
        bg-surface rounded-[var(--radius-lg)]
        ${border ? "border border-border" : ""}
        ${panelPadding[padding]}
        ${className}
      `.trim().replace(/\s+/g, " ")}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ICON BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "secondary";
}

const iconButtonSizes = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = "md", variant = "ghost", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center
          rounded-[var(--radius-md)]
          transition-all duration-[var(--motion-fast)]
          disabled:opacity-50 disabled:cursor-not-allowed
          active:scale-[0.95]
          ${iconButtonSizes[size]}
          ${variant === "ghost" 
            ? "text-muted hover:text-foreground hover:bg-surface-hover" 
            : "bg-surface border border-border text-foreground hover:bg-surface-hover hover:border-border-hover"}
          ${className}
        `.trim().replace(/\s+/g, " ")}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";

// ═══════════════════════════════════════════════════════════════════
// BADGE / CHIP COMPONENT
// ═══════════════════════════════════════════════════════════════════
interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "accent" | "success" | "warning";
  className?: string;
}

const badgeVariants = {
  default: "bg-surface-hover text-text-secondary border-border",
  accent: "bg-accent-muted text-accent border-accent/20",
  success: "bg-success-muted text-success border-success/20",
  warning: "bg-warning-muted text-warning border-warning/20",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5
        text-[11px] font-medium
        rounded-full border
        ${badgeVariants[variant]}
        ${className}
      `.trim().replace(/\s+/g, " ")}
    >
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STATUS INDICATOR
// ═══════════════════════════════════════════════════════════════════
interface StatusProps {
  status: "idle" | "loading" | "success" | "error";
  text?: string;
}

export function Status({ status, text }: StatusProps) {
  const statusStyles = {
    idle: "text-muted",
    loading: "text-accent animate-pulse",
    success: "text-success",
    error: "text-error",
  };

  return (
    <span className={`text-[12px] font-medium ${statusStyles[status]}`}>
      {text || (status === "loading" ? "•••" : "")}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DIVIDER
// ═══════════════════════════════════════════════════════════════════
export function Divider({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-border ${className}`} />;
}

