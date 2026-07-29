"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex h-[22px] w-full touch-none items-center select-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-2 w-full grow overflow-hidden rounded-[var(--bk-radius-pill)] bg-[var(--bk-tile-2)]"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full bg-[var(--bk-ink)]"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="block size-[22px] shrink-0 rounded-[var(--bk-radius-pill)] border-0 bg-[var(--bk-ink)] shadow-[var(--bk-shadow-knob)] outline-none transition-[box-shadow] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--bk-ink)] focus-visible:shadow-[0_0_0_4px_rgba(10,10,10,0.12),var(--bk-shadow-knob)]"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
