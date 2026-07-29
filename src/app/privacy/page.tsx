import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy & Terms",
  description:
    "How Lockup Studio handles your files, colors, and exports — and the terms for using this playground.",
};

export default function PrivacyPage() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--bk-field)] text-[var(--bk-ink)]">
      <header className="sticky top-0 z-10 border-b border-[var(--bk-hairline)] bg-[var(--bk-card)]">
        <div className="mx-auto flex h-[80px] max-w-2xl items-center justify-between gap-4 px-6">
          <Link
            href="/studio"
            className="flex min-w-0 items-center gap-1.5 transition-opacity hover:opacity-80"
          >
            <img
              src="/logo-light.svg"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0"
              aria-hidden
            />
            <div className="flex min-w-0 flex-col justify-center leading-none">
              <span className="block text-lg font-semibold leading-none tracking-tight">
                Lockup Studio
              </span>
              <span className="mt-1.5 block text-[12px] font-medium leading-none text-[var(--bk-ink-3)]">
                Privacy & Terms
              </span>
            </div>
          </Link>
          <Link
            href="/studio"
            className="shrink-0 rounded-full bg-[var(--bk-ink)] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[var(--bk-ink)]/90"
          >
            Back to Studio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-10 px-6 py-10 pb-32">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Privacy & Terms
          </h1>
          <p className="text-[15px] leading-relaxed text-[var(--bk-ink-2)]">
            Lockup Studio is a local-first playground for trying lockup scale,
            color, and packaging. Work stays in your browser unless you choose to
            export or open an external link.
          </p>
          <p className="text-[13px] text-[var(--bk-ink-3)]">
            Last updated July 29, 2026
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Privacy</h2>
          <ul className="list-disc space-y-2.5 pl-5 text-[15px] leading-relaxed text-[var(--bk-ink-2)]">
            <li>
              <strong className="font-semibold text-[var(--bk-ink)]">
                Your files stay local.
              </strong>{" "}
              SVGs you upload, brand name, spacing, palette, and export settings
              are processed in your browser. They are not uploaded to our servers
              for storage or training.
            </li>
            <li>
              <strong className="font-semibold text-[var(--bk-ink)]">
                No accounts, no saved projects.
              </strong>{" "}
              There is no sign-in and no cloud project save. Refreshing or closing
              the tab clears the session.
            </li>
            <li>
              <strong className="font-semibold text-[var(--bk-ink)]">
                Exports stay on your device.
              </strong>{" "}
              ZIP packages and brand sheets are generated client-side and
              downloaded to you.
            </li>
            <li>
              <strong className="font-semibold text-[var(--bk-ink)]">
                Color lookups.
              </strong>{" "}
              Optional color-scheme suggestions may request a hex value through
              this app’s API, which proxies to The Color API. Only hex / scheme
              parameters are sent — not your logo files.
            </li>
            <li>
              <strong className="font-semibold text-[var(--bk-ink)]">
                Feedback form.
              </strong>{" "}
              The Feedback button opens a Google Form you choose. Anything you
              submit there is governed by Google’s terms and that form’s settings.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Terms</h2>
          <ul className="list-disc space-y-2.5 pl-5 text-[15px] leading-relaxed text-[var(--bk-ink-2)]">
            <li>
              Lockup Studio is provided as a free creative playground, as-is,
              without warranties of any kind.
            </li>
            <li>
              You are responsible for the assets you upload and for how you use
              exported files. Only use logos and marks you have rights to.
            </li>
            <li>
              Output is for your packaging workflow. Contrast scores (WCAG / APCA)
              are helpers, not legal or accessibility certification.
            </li>
            <li>
              The tool may change or go offline at any time. Desktop browsers are
              the intended environment.
            </li>
            <li>
              By using Lockup Studio you agree to these terms. Questions:{" "}
              <a
                href="https://geovanyhernandez.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--bk-ink)] underline underline-offset-2 hover:opacity-80"
              >
                geovanyhernandez.com
              </a>
              .
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
