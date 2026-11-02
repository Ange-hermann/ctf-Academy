import { GoldCursor } from "@/components/effects/gold-cursor";
import { SmoothScroll } from "@/components/layout/smooth-scroll";
import { Splash } from "@/components/layout/splash";
import { WhatsAppFab } from "@/components/layout/whatsapp-fab";
import { PublicShell } from "@/components/shell/public-shell";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Splash />
      <PublicShell>{children}</PublicShell>
      <WhatsAppFab />
      <GoldCursor />
      <SmoothScroll />
    </>
  );
}
