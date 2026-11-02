/** Contenus « Admissions » et parcours d'inscription. TODO: texte officiel (à valider). */

export type PaymentMethodId = "orange_money" | "mtn_momo" | "wave" | "moov_money" | "card";

export const paymentMethods: { id: PaymentMethodId; label: string; short: string; kind: "mobile_money" | "card" }[] = [
  { id: "orange_money", label: "Orange Money", short: "OM", kind: "mobile_money" },
  { id: "mtn_momo", label: "MTN MoMo", short: "MTN", kind: "mobile_money" },
  { id: "wave", label: "Wave", short: "W", kind: "mobile_money" },
  { id: "moov_money", label: "Moov Money", short: "MV", kind: "mobile_money" },
  { id: "card", label: "Carte bancaire", short: "CB", kind: "card" },
];

/** Les 7 étapes de l'inscription en ligne (EDS uniquement — les autres formations sont sur sélection). */
export const registrationSteps = [
  { id: "conditions", label: "Conditions d'admission", description: "Lecture et acceptation des conditions d'accès à l'EDS." },
  { id: "account", label: "Créer son compte", description: "Nom, prénom, e-mail, téléphone, pays et mot de passe." },
  { id: "form", label: "Remplir le formulaire", description: "Informations personnelles et questions du parcours." },
  { id: "appointment", label: "Prendre rendez-vous", description: "Jour et horaire de l'entretien d'admission." },
  { id: "registration", label: "Payer l'inscription", description: "Règlement des frais d'inscription." },
  { id: "access", label: "Recevoir ses accès", description: "Confirmation par e-mail et/ou WhatsApp, puis accès étudiant." },
  { id: "training", label: "Payer les cours", description: "Règlement des frais de formation." },
] as const;

/** Guide d'inscription : fenêtre « Comment s'inscrire ? » ouverte par le bouton « Suite » de /inscription. */
export const registrationGuide = [
  {
    title: "Prenez connaissance des conditions d'admission",
    text: "Lisez attentivement les conditions d'admission afin de vous assurer que vous remplissez les critères requis pour intégrer la formation.",
  },
  {
    title: "Créez votre compte et remplissez le formulaire",
    text: "Créez votre compte sur la plateforme, puis complétez le formulaire d'inscription avec les informations demandées.",
  },
  {
    title: "Prenez rendez-vous avec un conseiller étudiant",
    text: "Choisissez une date et une heure qui vous conviennent, en tenant compte de votre fuseau horaire. Cet entretien permettra d'échanger sur votre parcours, vos motivations et votre projet de formation.",
  },
  {
    title: "Recevez la confirmation de votre admission",
    text: "À l'issue de l'entretien, votre dossier sera évalué. Si vous êtes déclaré admissible, vous pourrez passer à l'étape suivante.",
  },
  {
    title: "Payez les frais d'inscription et accédez aux cours",
    text: "Après confirmation de votre admission, procédez au paiement des frais d'inscription. Ce paiement vous donnera accès à la plateforme de formation et aux cours.",
  },
  {
    title: "Réglez les frais de formation",
    text: "Une semaine après le début des cours, vous devrez procéder au paiement des frais de formation afin de poursuivre votre parcours dans les conditions prévues par l'établissement.",
  },
] as const;

export const paymentProcess = [
  { title: "Choisissez votre moyen de paiement", text: "Orange Money, MTN MoMo, Wave, Moov Money ou carte bancaire." },
  { title: "Saisissez votre numéro", text: "Le numéro qui recevra la demande de paiement." },
  { title: "Validez sur votre téléphone", text: "Confirmez le paiement avec votre code secret Mobile Money." },
  { title: "Recevez votre reçu", text: "Le reçu est envoyé par e-mail et disponible dans votre espace." },
];

export const paymentReassurance = [
  "Paiement traité par un prestataire agréé : CTF ACADEMY ne voit jamais votre code secret.",
  "Connexion chiffrée (HTTPS) sur toutes les pages.",
  "Reçu officiel pour chaque paiement confirmé.",
  "Une équipe joignable sur WhatsApp en cas de question.",
];

export const commonConditions = [
  "Disposer d'une adresse e-mail et d'un numéro de téléphone",
  "Remplir le formulaire d'inscription en ligne",
  "Régler les frais d'inscription et de formation",
];
