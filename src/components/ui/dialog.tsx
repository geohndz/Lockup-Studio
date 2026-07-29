"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-50 bg-[var(--bk-scrim)]", className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-full max-w-[calc(100%-2rem)] max-h-[min(90vh,720px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden rounded-[var(--bk-radius-dialog)] bg-[var(--bk-card)] text-[15px] text-[var(--bk-ink)] shadow-[var(--bk-shadow-dialog)] sm:max-w-md",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close asChild>
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 z-10 text-[var(--bk-ink-2)]"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex shrink-0 flex-col gap-2 px-[var(--bk-pad-card)] pt-[var(--bk-pad-card)] pr-14 pb-5",
        className
      )}
      {...props}
    />
  )
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto px-[var(--bk-pad-card)] py-5",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2.5 border-t border-[var(--bk-hairline)] px-[var(--bk-pad-card)] py-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-[22px] font-semibold tracking-[-0.02em] text-[var(--bk-ink)]",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm leading-relaxed text-[var(--bk-ink-3)]", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
}
