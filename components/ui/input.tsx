import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-xl border border-[#2f3947] bg-[#0d1117] px-3 py-2 text-sm text-[#f0f6fc] placeholder:text-[#7d8590] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3fb950] focus-visible:ring-offset-2 ring-offset-[#0d1117] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
