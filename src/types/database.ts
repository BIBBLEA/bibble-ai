export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          stripe_customer_id: string | null;
        };
        Insert: {
          id: string;
          stripe_customer_id?: string | null;
        };
        Update: {
          id?: string;
          stripe_customer_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      prices: {
        Row: {
          active: boolean | null;
          currency: string | null;
          id: string;
          interval: Database["public"]["Enums"]["pricing_plan_interval"] | null;
          interval_count: number | null;
          product_id: string | null;
          trial_period_days: number | null;
          type: Database["public"]["Enums"]["pricing_type"] | null;
          unit_amount: number | null;
        };
        Insert: {
          active?: boolean | null;
          currency?: string | null;
          id: string;
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null;
          interval_count?: number | null;
          product_id?: string | null;
          trial_period_days?: number | null;
          type?: Database["public"]["Enums"]["pricing_type"] | null;
          unit_amount?: number | null;
        };
        Update: {
          active?: boolean | null;
          currency?: string | null;
          id?: string;
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null;
          interval_count?: number | null;
          product_id?: string | null;
          trial_period_days?: number | null;
          type?: Database["public"]["Enums"]["pricing_type"] | null;
          unit_amount?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      products: {
        Row: {
          active: boolean | null;
          description: string | null;
          id: string;
          image: string | null;
          metadata: Json | null;
          name: string | null;
        };
        Insert: {
          active?: boolean | null;
          description?: string | null;
          id: string;
          image?: string | null;
          metadata?: Json | null;
          name?: string | null;
        };
        Update: {
          active?: boolean | null;
          description?: string | null;
          id?: string;
          image?: string | null;
          metadata?: Json | null;
          name?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at: string | null;
          cancel_at_period_end: boolean | null;
          canceled_at: string | null;
          created: string;
          current_period_end: string;
          current_period_start: string;
          ended_at: string | null;
          id: string;
          metadata: Json | null;
          price_id: string | null;
          plan: string | null;
          quantity: number | null;
          credits_per_period: number | null;
          status: Database["public"]["Enums"]["subscription_status"] | null;
          stripe_customer_id: string | null;
          stripe_price_id: string | null;
          stripe_subscription_id: string | null;
          trial_end: string | null;
          trial_start: string | null;
          user_id: string;
        };
        Insert: {
          cancel_at?: string | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: string | null;
          created?: string;
          current_period_end?: string;
          current_period_start?: string;
          ended_at?: string | null;
          id: string;
          metadata?: Json | null;
          price_id?: string | null;
          plan?: string | null;
          quantity?: number | null;
          credits_per_period?: number | null;
          status?: Database["public"]["Enums"]["subscription_status"] | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          trial_end?: string | null;
          trial_start?: string | null;
          user_id: string;
        };
        Update: {
          cancel_at?: string | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: string | null;
          created?: string;
          current_period_end?: string;
          current_period_start?: string;
          ended_at?: string | null;
          id?: string;
          metadata?: Json | null;
          price_id?: string | null;
          plan?: string | null;
          quantity?: number | null;
          credits_per_period?: number | null;
          status?: Database["public"]["Enums"]["subscription_status"] | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          trial_end?: string | null;
          trial_start?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_price_id_fkey";
            columns: ["price_id"];
            referencedRelation: "prices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          billing_address: Json | null;
          full_name: string | null;
          id: string;
          payment_method: Json | null;
          updatedat: string | null;
          credits: number | null;
          plan: string | null;
          stripe_customer_id: string | null;
          email: string | null;
          stripe_subscription_id: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          billing_address?: Json | null;
          full_name?: string | null;
          id: string;
          payment_method?: Json | null;
          updatedat?: string | null;
          credits?: number | null;
          plan?: string | null;
          stripe_customer_id?: string | null;
          email?: string | null;
          stripe_subscription_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          billing_address?: Json | null;
          full_name?: string | null;
          id?: string;
          payment_method?: Json | null;
          updatedat?: string | null;
          credits?: number | null;
          plan?: string | null;
          stripe_customer_id?: string | null;
          email?: string | null;
          stripe_subscription_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      video_generations: {
        Row: {
          id: string;
          user_id: string;
          heygen_video_id: string;
          script: string;
          avatar_id: string;
          voice_id: string;
          format: "9:16" | "16:9";
          status: "processing" | "completed" | "failed";
          created_at: string;
          video_url: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          heygen_video_id: string;
          script: string;
          avatar_id: string;
          voice_id: string;
          format: "9:16" | "16:9";
          status?: "processing" | "completed" | "failed";
          created_at?: string;
          video_url?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          heygen_video_id?: string;
          script?: string;
          avatar_id?: string;
          voice_id?: string;
          format?: "9:16" | "16:9";
          status?: "processing" | "completed" | "failed";
          created_at?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "video_generations_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          amount: number;
          balance_after: number;
          description: string | null;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          amount: number;
          balance_after: number;
          description?: string | null;
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
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
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      pricing_plan_interval: "day" | "week" | "month" | "year";
      pricing_type: "one_time" | "recurring";
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
        | "paused";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
