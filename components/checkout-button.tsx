"use client";

import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
  }
}

type CheckoutButtonProps = {
  href: string;
  className?: string;
  label: string;
};

export function CheckoutButton({ href, className, label }: CheckoutButtonProps) {
  useEffect(() => {
    window.createLemonSqueezy?.();
  }, []);

  return (
    <a href={href} data-lemonsqueezy="true" className={cn(buttonVariants({ size: "lg" }), className)}>
      {label}
      <ArrowRight className="h-4 w-4" />
    </a>
  );
}
