"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[9px] border-0 bg-white text-transparent shadow-[var(--bk-shadow-input)] outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--bk-ink)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--bk-ink)] data-[state=checked]:text-white data-[state=checked]:shadow-none",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current"
      >
        <CheckIcon className="size-[15px]" strokeWidth={2.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
