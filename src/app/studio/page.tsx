import { StudioShell } from "@/components/studio/studio-shell";

export const metadata = {
  title: {
    absolute: "Lockup Studio",
  },
  description: "Compose lockups and export a client-ready logo package.",
};

export default function StudioPage() {
  return <StudioShell />;
}
