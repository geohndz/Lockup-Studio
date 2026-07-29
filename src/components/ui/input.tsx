import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[52px] w-full min-w-0 rounded-[14px] border-0 bg-[var(--bk-tile)] px-5 text-base font-medium text-[var(--bk-ink)] shadow-none transition-[box-shadow,filter] outline-none placeholder:font-normal placeholder:text-[var(--bk-ink-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--bk-ink)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
