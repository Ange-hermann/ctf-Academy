/** Questions fréquentes — miroir de la table Supabase `faq`. TODO: texte officiel (à valider). */

export type FaqCategory = "inscription" | "paiement" | "admission" | "formations";

export const faqCategories: { id: FaqCategory; label: string }[] = [
  { id: "inscription", label: "Inscription" },
  { id: "paiement", label: "Paiement" },
  { id: "admission", label: "Admission" },
  { id: "formations", label: "Formations" },
];

export type FaqItem = { id: string; category: FaqCategory; question: string; answer: string; featured?: boolean };

export const faq: FaqItem[] = [
  {
    id: "comment-inscrire",
    category: "inscription",
    featured: true,
    question: "Comment m'inscrire à une formation ?",
    answer:
      "Cliquez sur « S'inscrire », choisissez votre formation, remplissez le formulaire puis effectuez le paiement. Tout se fait en 5 étapes, depuis votre téléphone, en quelques minutes.",
  },
  {
    id: "brouillon",
    category: "inscription",
    question: "Puis-je interrompre mon inscription et la reprendre plus tard ?",
    answer:
      "Oui. Vos réponses sont enregistrées automatiquement sur votre appareil. Revenez sur la page d'inscription : vous reprendrez exactement là où vous vous êtes arrêté.",
  },
  {
    id: "aide",
    category: "inscription",
    question: "J'ai des difficultés avec le formulaire, qui peut m'aider ?",
    answer:
      "Appuyez sur le bouton WhatsApp présent sur toutes les pages : un membre de l'équipe vous accompagnera pas à pas.",
  },
  {
    id: "moyens-paiement",
    category: "paiement",
    featured: true,
    question: "Quels moyens de paiement sont acceptés ?",
    answer:
      "Vous pouvez payer par Mobile Money (Orange Money, MTN MoMo, Wave, Moov Money) et, selon disponibilité, par carte bancaire.",
  },
  {
    id: "recu",
    category: "paiement",
    question: "Vais-je recevoir un reçu ?",
    answer: "Oui. Dès que votre paiement est confirmé, un reçu vous est envoyé par e-mail et reste disponible dans votre espace.",
  },
  {
    id: "echec-paiement",
    category: "paiement",
    question: "Que faire si mon paiement échoue ?",
    answer:
      "Vérifiez votre solde et le numéro saisi, puis réessayez depuis « Suivre ma candidature ». Votre dossier n'est pas perdu. En cas de doute, contactez-nous sur WhatsApp.",
  },
  {
    id: "paiement-admission",
    category: "admission",
    featured: true,
    question: "Mon paiement confirmé signifie-t-il que je suis admis ?",
    answer:
      "Pas forcément. Le paiement, l'inscription et l'admission sont trois étapes distinctes. Pour l'EDM et la formation des diacres, une sélection préalable est réalisée : vous serez informé de la décision par e-mail.",
  },
  {
    id: "delai-reponse",
    category: "admission",
    question: "Combien de temps faut-il pour connaître la décision d'admission ?",
    answer:
      "Le délai dépend de la formation et de la période. Vous pouvez suivre l'avancement de votre dossier à tout moment dans « Suivre ma candidature ».",
  },
  {
    id: "liste-attente",
    category: "admission",
    question: "Que signifie « liste d'attente » ?",
    answer:
      "Votre dossier est retenu mais les places sont complètes pour le moment. Vous serez contacté dès qu'une place se libère ou pour la session suivante.",
  },
  {
    id: "choisir-formation",
    category: "formations",
    question: "Quelle formation choisir ?",
    answer:
      "L'EDS forme les serviteurs de l'Église, l'EDM forme les disciples qui accompagnent d'autres disciples, et la formation des diacres prépare au service diaconal. Comparez-les sur la page « Durées, objectifs et tarifs ».",
  },
  {
    id: "en-ligne",
    category: "formations",
    question: "Les cours sont-ils en ligne ?",
    answer:
      "Oui, les cours sont accessibles en ligne depuis votre espace étudiant (vidéos, documents, sessions en direct sur Zoom). Certaines activités peuvent avoir lieu en présentiel.",
  },
  {
    id: "telephone",
    category: "formations",
    question: "Puis-je suivre la formation uniquement avec mon téléphone ?",
    answer: "Oui. CTF ACADEMY est pensé d'abord pour le téléphone, même avec une connexion modeste.",
  },
];
