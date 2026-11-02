import { HeartPulse, Sparkles, Star, Sunrise, Users, type LucideProps } from "lucide-react";
import type { KeyWord } from "@/content/identity";

const map = { sunrise: Sunrise, sparkles: Sparkles, "heart-pulse": HeartPulse, users: Users, star: Star };

export function KeyWordIcon({ icon, ...props }: { icon: KeyWord["icon"] } & LucideProps) {
  const Icon = map[icon];
  return <Icon strokeWidth={1.5} aria-hidden {...props} />;
}
