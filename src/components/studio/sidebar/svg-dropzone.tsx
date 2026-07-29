"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SvgDropzoneProps {
  label: string;
  description: string;
  fileName?: string | null;
  /** Raw SVG markup for the uploaded preview thumbnail. */
  previewSvg?: string | null;
  onUpload: (raw: string, fileName: string) => void;
  onClear: () => void;
  disabled?: boolean;
  disabledHint?: string;
}

function Thumbnail({ svg, label }: { svg: string; label: string }) {
  const html = useMemo(() => {
    return svg.replace(
      "<svg",
      '<svg preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;max-width:100%;max-height:100%;display:block;margin:auto"',
    );
  }, [svg]);

  return (
    <div
      className="flex h-14 w-full items-center justify-center overflow-hidden px-3 py-1 [&_svg]:mx-auto [&_svg]:max-h-9 [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: html }}
      aria-label={`${label} preview`}
    />
  );
}

export function SvgDropzone({
  label,
  description,
  fileName,
  previewSvg,
  onUpload,
  onClear,
  disabled = false,
  disabledHint,
}: SvgDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFile = Boolean(fileName && previewSvg);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file || disabled) return;
      setError(null);
      if (
        !file.name.toLowerCase().endsWith(".svg") &&
        file.type !== "image/svg+xml"
      ) {
        setError("Please upload an SVG file");
        return;
      }
      try {
        const raw = await file.text();
        if (!raw.includes("<svg")) {
          setError("File does not look like a valid SVG");
          return;
        }
        onUpload(raw, file.name);
      } catch {
        setError("Could not read file");
      }
    },
    [disabled, onUpload],
  );

  return (
    <div
      className={cn("space-y-2.5 transition-opacity", disabled && "opacity-45")}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-sm font-semibold text-[var(--bk-ink)]">{label}</p>
        {hasFile && !disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 text-[var(--bk-ink-2)]"
            onClick={onClear}
            aria-label={`Clear ${label}`}
          >
            <X className="size-[15px]" />
          </Button>
        ) : null}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) void handleFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--bk-radius-tile)] border-0 px-4 py-5 text-center transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--bk-ink)]",
          "disabled:pointer-events-none disabled:cursor-not-allowed",
          dragging
            ? "bg-[var(--bk-tile-2)]"
            : hasFile
              ? "bg-[var(--bk-tile)]"
              : "bg-[var(--bk-tile-2)] hover:bg-[var(--bk-tile)]",
        )}
      >
        {hasFile && previewSvg ? (
          <>
            <Thumbnail svg={previewSvg} label={label} />
            <span className="max-w-full truncate px-1 text-[12px] font-medium text-[var(--bk-ink-2)]">
              {fileName}
            </span>
            <span className="bk-meta">Click or drop to replace</span>
          </>
        ) : (
          <>
            <Upload className="size-4 text-[var(--bk-ink-2)]" aria-hidden />
            <span className="text-[13px] font-semibold text-[var(--bk-ink)]">
              Drop SVG or click to upload
            </span>
            <span className="bk-meta">{description}</span>
          </>
        )}
      </button>
      {disabled && disabledHint ? (
        <p className="bk-meta m-0">{disabledHint}</p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error ? (
        <p className="m-0 text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
