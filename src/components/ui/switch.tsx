"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-[var(--bk-radius-pill)] border-0 bg-[#DCDCDC] transition-colors outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--bk-ink)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--bk-ink)]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[26px] translate-x-[3px] rounded-[var(--bk-radius-pill)] bg-white shadow-[var(--bk-shadow-knob)] transition-transform duration-[140ms] ease-out data-[state=checked]:translate-x-[27px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
