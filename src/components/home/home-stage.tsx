import { ChurchStageViewer } from "@/components/home/church-stage-viewer";
import { MediaCards } from "@/components/home/media-cards";
import { StageViewer } from "@/components/home/stage-viewer";

/**
 * Bloc « médias » de l'accueil : cartes-liens d'accès rapide + grande scène fixe.
 * `church` pour la page CTF CHURCH (`/`), `academy` pour `/ctf-academy`.
 */
export function HomeStage({ viewer = "academy" }: { viewer?: "academy" | "church" }) {
  return (
    <section aria-label="Médiathèque" className="px-4 pt-5 pb-7 sm:px-7">
      <MediaCards />
      {viewer === "church" ? <ChurchStageViewer /> : <StageViewer />}
    </section>
  );
}
