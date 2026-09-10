import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
};

export default function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const variantClassName =
    variant === "primary" ? "bg-accent text-white" : "border border-accent-border bg-transparent text-accent";

  return (
    <button
      className={`
        rounded-full px-5 py-2 text-sm font-medium transition-opacity
        hover:opacity-80 ${variantClassName} ${className}
      `}
      {...props}
    />
  );
}
