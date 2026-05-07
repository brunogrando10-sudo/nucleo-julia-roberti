import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
}

const VARIANTS = {
  primary:
    "bg-brand-terracota hover:bg-brand-terracota/90 text-white",
  secondary:
    "bg-brand-medium hover:bg-brand-medium/90 text-white",
  ghost:
    "bg-transparent border border-brand-nude/40 text-brand-dark hover:bg-brand-light",
  danger:
    "bg-red-500 hover:bg-red-600 text-white",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  className = "",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {children}
    </button>
  );
}
