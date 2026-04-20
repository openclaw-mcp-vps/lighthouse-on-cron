import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3fb950] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-[#0d1117]",
  {
    variants: {
      variant: {
        default: "bg-[#2ea043] text-[#04110a] hover:bg-[#3fb950]",
        secondary: "bg-[#1f2630] text-[#f0f6fc] hover:bg-[#283142]",
        outline: "border border-[#2f3947] bg-transparent text-[#f0f6fc] hover:bg-[#161b22]",
        ghost: "text-[#f0f6fc] hover:bg-[#1a212c]"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 px-6 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
