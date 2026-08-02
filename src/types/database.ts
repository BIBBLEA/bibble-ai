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
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
