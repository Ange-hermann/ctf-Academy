"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FloatingField, FloatingSelect, PasswordField, PhoneField } from "@/components/ui/floating-field";
import { useToast } from "@/components/ui/toast";

export function FieldsDemo() {
  const [pw, setPw] = useState("");
  return (
    <form className="grid max-w-2xl gap-5 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
      <FloatingField label="Prénom" name="firstName" autoComplete="given-name" required />
      <FloatingSelect
        label="Pays"
        name="country"
        defaultValue="CI"
        options={[
          { value: "CI", label: "Côte d'Ivoire" },
          { value: "SN", label: "Sénégal" },
        ]}
      />
      <PhoneField label="Téléphone" name="phone" dialCode="+225" />
      <FloatingField label="E-mail" type="email" defaultValue="adresse-invalide" error="Cette adresse e-mail n'est pas valide." />
      <PasswordField label="Mot de passe" showStrength value={pw} onChange={(e) => setPw(e.target.value)} className="sm:col-span-2" />
    </form>
  );
}

export function ToastDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => toast({ tone: "success", title: "Paiement confirmé", description: "Votre reçu a été envoyé par e-mail." })}>
        Succès
      </Button>
      <Button variant="outline" onClick={() => toast({ title: "Brouillon enregistré" })}>
        Info
      </Button>
      <Button variant="outline" onClick={() => toast({ tone: "error", title: "Paiement échoué", description: "Vérifiez votre solde Mobile Money." })}>
        Erreur
      </Button>
    </div>
  );
}
