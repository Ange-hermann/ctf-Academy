import "server-only";
import { siteConfig } from "@/config/site";
import { churchVision } from "@/content/identity";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * E-mail de confirmation d'inscription et de reçu de paiement.
 * Les clients e-mail n'acceptent que des styles en ligne : les couleurs de la charte sont donc écrites ici.
 */
export function registrationConfirmationEmail({
  firstName,
  formationName,
  reference,
  amountLabel,
  requiresSelection,
}: {
  firstName: string;
  formationName: string;
  reference: string;
  amountLabel: string;
  requiresSelection: boolean;
}) {
  const admission = requiresSelection
    ? "Cette formation comporte une sélection préalable : votre dossier va être étudié et vous recevrez la décision d'admission par e-mail."
    : "Votre dossier va être vérifié par l'équipe des admissions. Vous recevrez la confirmation de votre admission par e-mail.";
  const link = `${siteConfig.url}/compte/candidature`;
  const subject = `Votre inscription à ${formationName} — dossier ${reference}`;
  const text = [
    `Bonjour ${firstName},`,
    `Votre inscription à ${formationName} est bien enregistrée et votre paiement de ${amountLabel} est confirmé.`,
    `Référence du dossier : ${reference}`,
    admission,
    `Suivre ma candidature : ${link}`,
    `« ${churchVision.text} »`,
    `${siteConfig.church} — ${siteConfig.name}`,
  ].join("\n\n");

  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#0A0A0A;font-family:Arial,Helvetica,sans-serif;color:#FAFAF9">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#141414;border:1px solid rgba(201,162,39,0.25);border-radius:24px;padding:32px">
    <tr><td style="font-size:12px;letter-spacing:4px;color:#E5C158;text-transform:uppercase">${escape(siteConfig.name)}</td></tr>
    <tr><td style="padding-top:16px;font-size:24px;font-family:Georgia,serif;color:#FAFAF9">Bienvenue, ${escape(firstName)} !</td></tr>
    <tr><td style="padding-top:16px;font-size:16px;line-height:1.6;color:rgba(250,250,249,0.8)">
      Votre inscription à <strong style="color:#E5C158">${escape(formationName)}</strong> est bien enregistrée
      et votre paiement de <strong>${escape(amountLabel)}</strong> est confirmé. Ce message vaut reçu.</td></tr>
    <tr><td style="padding-top:16px;font-size:14px;color:rgba(250,250,249,0.6)">Référence du dossier : <strong style="color:#FAFAF9">${escape(reference)}</strong></td></tr>
    <tr><td style="padding-top:16px;font-size:16px;line-height:1.6;color:rgba(250,250,249,0.8)">${escape(admission)}</td></tr>
    <tr><td style="padding-top:24px"><a href="${link}" style="display:inline-block;background:#C9A227;color:#0A0A0A;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:16px">Suivre ma candidature</a></td></tr>
    <tr><td style="padding-top:28px;font-family:Georgia,serif;font-size:15px;line-height:1.6;color:rgba(250,250,249,0.75);border-top:1px solid rgba(201,162,39,0.15)">« ${escape(churchVision.text)} »</td></tr>
    <tr><td style="padding-top:12px;font-size:12px;color:rgba(250,250,249,0.5)">${escape(siteConfig.church)}</td></tr>
  </table></td></tr></table></body></html>`;

  return { subject, html, text };
}
