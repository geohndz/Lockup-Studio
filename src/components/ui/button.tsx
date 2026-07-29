import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-[11px] border-0 bg-clip-padding font-semibold whitespace-nowrap transition-[filter,transform,background-color,color] outline-none select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--bk-ink)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[17px]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--bk-ink)] text-white",
        secondary:
          "bg-[var(--bk-tile)] text-[var(--bk-ink)]",
        outline:
          "bg-[var(--bk-card)] text-[var(--bk-ink)] shadow-[var(--bk-shadow-input)]",
        ghost:
          "bg-transparent text-[var(--bk-ink-2)] hover:bg-[var(--bk-tile)] hover:text-[var(--bk-ink)]",
        destructive:
          "bg-destructive/10 text-destructive",
        link: "bg-transparent text-[var(--bk-ink)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[54px] rounded-[var(--bk-radius-pill)] px-7 text-[15px]",
        sm: "h-12 rounded-[var(--bk-radius-pill)] px-[22px] text-sm gap-2.5 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-[54px] rounded-[var(--bk-radius-pill)] px-7 text-[15px]",
        secondary: "h-[52px] rounded-[var(--bk-radius-pill)] px-6 text-[15px]",
        icon: "size-10 rounded-[var(--bk-radius-pill)] gap-0 [&_svg:not([class*='size-'])]:size-[15px]",
        "icon-sm": "size-10 rounded-[var(--bk-radius-pill)] gap-0 [&_svg:not([class*='size-'])]:size-[15px]",
        "icon-lg": "size-10 rounded-[var(--bk-radius-pill)] gap-0",
        xs: "h-9 rounded-[var(--bk-radius-pill)] px-3.5 text-[13px] gap-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
