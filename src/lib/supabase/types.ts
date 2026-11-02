/**
 * Types de la base (sous-ensemble utilisé par le site public).
 * Peut être régénéré avec : npx supabase gen types typescript --linked > src/lib/supabase/types.ts
 */

export type RegistrationStatus = "draft" | "submitted" | "complete";
export type PaymentStatus = "pending" | "confirmed" | "failed" | "refunded" | "partial";
export type AdmissionStatus = "under_review" | "admitted" | "rejected" | "waitlisted";
export type SessionStatus = "open" | "soon" | "closed";
export type FaqCategory = "inscription" | "paiement" | "admission" | "formations";
export type PaymentMethod = "orange_money" | "mtn_momo" | "wave" | "moov_money" | "card";

type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
};

export type FormationRow = {
  id: string;
  slug: "eds" | "edm" | "diacres" | "pastorale";
  acronym: string;
  name: string;
  tagline: string;
  description: string;
  duration_label: string;
  levels_count: number | null;
  registration_fee: number;
  training_fee: number;
  currency: string;
  requires_selection: boolean;
  is_example: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SessionRow = {
  id: string;
  formation_id: string;
  label: string;
  start_date: string;
  end_date: string;
  registration_deadline: string | null;
  status: SessionStatus;
  is_example: boolean;
  created_at: string;
};

export type FaqRow = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  featured: boolean;
  is_published: boolean;
  sort_order: number;
};

export type ApplicationRow = {
  id: string;
  reference: string;
  user_id: string;
  formation_id: string;
  session_id: string | null;
  registration_status: RegistrationStatus;
  payment_status: PaymentStatus;
  admission_status: AdmissionStatus;
  draft: Record<string, unknown>;
  answers: Record<string, unknown>;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  application_id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  provider: string;
  provider_reference: string | null;
  phone: string | null;
  status: PaymentStatus;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AccessTokenRow = { application_id: string; token_hash: string; created_at: string };

/* ───────── Médiathèque & événements (migration 20261019000001) ───────── */
export type VideoSource = "upload" | "youtube" | "vimeo";
export type VideoCategory = "cultes" | "formations" | "temoignages" | "evenements";
export type EventType = "culte" | "conference" | "formation" | "ceremonie" | "retraite" | "concert";
export type EventStatus = "brouillon" | "publie" | "annule";

export type MediaAlbumRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover: string;
  year: number;
  is_published: boolean;
  is_example: boolean;
  sort_order: number;
  created_at: string;
};

export type MediaPhotoRow = {
  id: string;
  album_id: string;
  title: string;
  caption: string;
  storage_path: string;
  width: number;
  height: number;
  taken_at: string | null;
  featured: boolean;
  sort_order: number;
  is_published: boolean;
  is_example: boolean;
  created_at: string;
};

export type MediaVideoRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  source: VideoSource;
  url: string;
  poster: string;
  duration_sec: number;
  category: VideoCategory;
  published_at: string;
  featured: boolean;
  is_published: boolean;
  is_example: boolean;
  created_at: string;
};

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: EventType;
  starts_at: string;
  ends_at: string | null;
  place: string;
  address: string;
  cover: string;
  register_url: string | null;
  featured: boolean;
  status: EventStatus;
  is_example: boolean;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      formations: Table<FormationRow>;
      sessions: Table<SessionRow>;
      faq: Table<FaqRow>;
      applications: Table<
        ApplicationRow,
        Pick<ApplicationRow, "reference" | "user_id" | "formation_id"> & Partial<ApplicationRow>
      >;
      application_access_tokens: Table<AccessTokenRow, Pick<AccessTokenRow, "application_id" | "token_hash">>;
      payments: Table<
        PaymentRow,
        Pick<PaymentRow, "application_id" | "user_id" | "amount" | "method" | "provider"> & Partial<PaymentRow>
      >;
      media_albums: Table<MediaAlbumRow>;
      media_photos: Table<MediaPhotoRow>;
      media_videos: Table<MediaVideoRow>;
      events: Table<EventRow>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      registration_status: RegistrationStatus;
      payment_status: PaymentStatus;
      admission_status: AdmissionStatus;
      session_status: SessionStatus;
      faq_category: FaqCategory;
    };
    CompositeTypes: Record<never, never>;
  };
};
