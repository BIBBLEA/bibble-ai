// Types utilisateur
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: "starter" | "growth" | "pro" | null;
  credits: number;
  created_at: string;
  updated_at: string;
}

// Types vidéo
export interface VideoGeneration {
  id: string;
  user_id: string;
  heygen_video_id: string;
  script: string;
  avatar_id: string;
  voice_id: string;
  format: "9:16" | "16:9";
  status: "pending" | "processing" | "completed" | "failed";
  video_url: string | null;
  created_at: string;
}

// Types pour la génération
export interface GenerateVideoRequest {
  script: string;
  avatarId: string;
  voiceId: string;
  format: "9:16" | "16:9";
}

// Types pour les plans
export interface Plan {
  name: string;
  price: string;
  credits: number;
  priceId: string;
  description: string;
  popular?: boolean;
  features: string[];
}
