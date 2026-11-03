import { GoldCursor } from "@/components/effects/gold-cursor";
import { Splash } from "@/components/layout/splash";
import { WhatsAppFab } from "@/components/layout/whatsapp-fab";
import { PublicShell } from "@/components/shell/public-shell";
import { getSiteSettings } from "@/lib/site-settings";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  return (
    <>
      <Splash />
      <PublicShell>{children}</PublicShell>
      <WhatsAppFab number={settings.whatsappNumber} />
      <GoldCursor />
    </>
  );
}
