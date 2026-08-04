// Types générés à partir du schéma Supabase
// Ces types reflètent exactement la structure des tables en base

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: "starter" | "growth" | "pro" | null;
          credits: number;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: "starter" | "growth" | "pro" | null;
          credits?: number;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: "starter" | "growth" | "pro" | null;
          credits?: number;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      video_generations: {
        Row: {
          id: string;
          user_id: string;
          heygen_video_id: string | null;
          script: string;
          avatar_id: string;
          voice_id: string;
          format: "9:16" | "16:9";
          status: "pending" | "processing" | "completed" | "failed";
          video_url: string | null;
          thumbnail_url: string | null;
          duration_seconds: number | null;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          heygen_video_id?: string | null;
          script: string;
          avatar_id: string;
          voice_id: string;
          format: "9:16" | "16:9";
          status?: "pending" | "processing" | "completed" | "failed";
          video_url?: string | null;
          thumbnail_url?: string | null;
          duration_seconds?: number | null;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          heygen_video_id?: string | null;
          script?: string;
          avatar_id?: string;
          voice_id?: string;
          format?: "9:16" | "16:9";
          status?: "pending" | "processing" | "completed" | "failed";
          video_url?: string | null;
          thumbnail_url?: string | null;
          duration_seconds?: number | null;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "video_generations_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          type: "subscription_credit" | "usage_debit" | "manual_credit" | "expiration";
          amount: number;
          balance_after: number;
          description: string | null;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "subscription_credit" | "usage_debit" | "manual_credit" | "expiration";
          amount: number;
          balance_after: number;
          description?: string | null;
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "subscription_credit" | "usage_debit" | "manual_credit" | "expiration";
          amount?: number;
          balance_after?: number;
          description?: string | null;
          reference_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      site_settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      stripe_events: {
        // Journal de déduplication des webhooks Stripe (migration 005).
        // `id` est l'identifiant de l'événement Stripe (evt_…), pas un UUID.
        Row: {
          id: string;
          type: string | null;
          processed_at: string;
        };
        Insert: {
          id: string;
          type?: string | null;
          processed_at?: string;
        };
        Update: {
          id?: string;
          type?: string | null;
          processed_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        // Compteurs de limitation de débit (migration 008).
        // Clé composée (bucket, subject, window_start), aucune clé technique.
        Row: {
          bucket: string;
          subject: string;
          window_start: string;
          count: number;
        };
        Insert: {
          bucket: string;
          subject: string;
          window_start: string;
          count?: number;
        };
        Update: {
          bucket?: string;
          subject?: string;
          window_start?: string;
          count?: number;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string;
          stripe_price_id: string;
          plan: "starter" | "growth" | "pro";
          credits_per_period: number;
          status: "active" | "canceled" | "past_due" | "incomplete" | "trialing";
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_subscription_id: string;
          stripe_price_id: string;
          plan: "starter" | "growth" | "pro";
          credits_per_period: number;
          status?: "active" | "canceled" | "past_due" | "incomplete" | "trialing";
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_subscription_id?: string;
          stripe_price_id?: string;
          plan?: "starter" | "growth" | "pro";
          credits_per_period?: number;
          status?: "active" | "canceled" | "past_due" | "incomplete" | "trialing";
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {
      // 004_credits_atomiques.sql — débit atomique d'un crédit
      consume_credit: {
        Args: {
          p_user_id: string;
          p_video_id?: string | null;
        };
        Returns: {
          success: boolean;
          reason: "ok" | "insufficient_credits" | "profile_not_found";
          balance: number | null;
        };
      };
      // 004_credits_atomiques.sql — attribution de crédits ('reset' ou 'add')
      grant_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_mode?: "reset" | "add";
          p_description?: string | null;
          p_reference_id?: string | null;
        };
        Returns: {
          success: boolean;
          reason: "ok" | "profile_not_found" | "invalid_mode";
          balance: number | null;
          previous_balance: number | null;
        };
      };
      // 008_limitation_debit.sql — compteur de limitation de débit
      check_rate_limit: {
        Args: {
          p_bucket: string;
          p_subject: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: {
          allowed: boolean;
          reason: "ok" | "rate_limited" | "invalid_quota";
          limit: number;
          remaining: number;
          /** Fin de la fenêtre, ISO 8601. */
          reset_at: string;
          /** Secondes avant réouverture, à recopier dans Retry-After. */
          retry_after: number;
        };
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};
