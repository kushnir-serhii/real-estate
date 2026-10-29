export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          user_id?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          created_at: string
          email: string | null
          external_id: string | null
          id: string
          is_active: boolean
          name: string
          phones: string[]
          photo_url: string | null
          source: Database["public"]["Enums"]["property_source"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          phones?: string[]
          photo_url?: string | null
          source: Database["public"]["Enums"]["property_source"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phones?: string[]
          photo_url?: string | null
          source?: Database["public"]["Enums"]["property_source"]
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          client_request_id: string
          consent_at: string
          created_at: string
          email: string | null
          id: string
          kind: Database["public"]["Enums"]["lead_kind"]
          message: string | null
          name: string
          page_url: string | null
          payload: Json | null
          phone: string
          plektan_alerted_at: string | null
          plektan_attempts: number
          plektan_error: string | null
          plektan_item_id: string | null
          plektan_next_attempt_at: string | null
          plektan_status: Database["public"]["Enums"]["delivery_status"]
          property_id: string | null
          telegram_attempts: number
          telegram_error: string | null
          telegram_next_attempt_at: string | null
          telegram_status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
          utm: Json | null
        }
        Insert: {
          client_request_id: string
          consent_at: string
          created_at?: string
          email?: string | null
          id?: string
          kind: Database["public"]["Enums"]["lead_kind"]
          message?: string | null
          name: string
          page_url?: string | null
          payload?: Json | null
          phone: string
          plektan_alerted_at?: string | null
          plektan_attempts?: number
          plektan_error?: string | null
          plektan_item_id?: string | null
          plektan_next_attempt_at?: string | null
          plektan_status?: Database["public"]["Enums"]["delivery_status"]
          property_id?: string | null
          telegram_attempts?: number
          telegram_error?: string | null
          telegram_next_attempt_at?: string | null
          telegram_status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
          utm?: Json | null
        }
        Update: {
          client_request_id?: string
          consent_at?: string
          created_at?: string
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["lead_kind"]
          message?: string | null
          name?: string
          page_url?: string | null
          payload?: Json | null
          phone?: string
          plektan_alerted_at?: string | null
          plektan_attempts?: number
          plektan_error?: string | null
          plektan_item_id?: string | null
          plektan_next_attempt_at?: string | null
          plektan_status?: Database["public"]["Enums"]["delivery_status"]
          property_id?: string | null
          telegram_attempts?: number
          telegram_error?: string | null
          telegram_next_attempt_at?: string | null
          telegram_status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          body: string
          created_at: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          agent_id: string | null
          area_kitchen: number | null
          area_life: number | null
          area_lot: number | null
          area_total: number | null
          created_at: string
          currency: Database["public"]["Enums"]["currency"] | null
          deal: Database["public"]["Enums"]["deal"]
          description: string | null
          district: string | null
          external_id: string | null
          hidden_at: string | null
          house: string | null
          housing_class: string | null
          id: string
          is_newbuilding: boolean
          lat: number | null
          lng: number | null
          locality: string | null
          price_amount: number | null
          price_per_m2: number | null
          price_usd: number | null
          prop_kind: string | null
          property_type: Database["public"]["Enums"]["property_type"]
          published_at: string | null
          raw: Json | null
          repair: string | null
          room_count: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          source: Database["public"]["Enums"]["property_source"]
          source_updated_at: string | null
          status: Database["public"]["Enums"]["property_status"]
          storey: number | null
          storeys: number | null
          street: string | null
          synced_at: string | null
          title: string
          updated_at: string
          wall_material: string | null
        }
        Insert: {
          agent_id?: string | null
          area_kitchen?: number | null
          area_life?: number | null
          area_lot?: number | null
          area_total?: number | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"] | null
          deal: Database["public"]["Enums"]["deal"]
          description?: string | null
          district?: string | null
          external_id?: string | null
          hidden_at?: string | null
          house?: string | null
          housing_class?: string | null
          id?: string
          is_newbuilding?: boolean
          lat?: number | null
          lng?: number | null
          locality?: string | null
          price_amount?: number | null
          price_per_m2?: number | null
          price_usd?: number | null
          prop_kind?: string | null
          property_type: Database["public"]["Enums"]["property_type"]
          published_at?: string | null
          raw?: Json | null
          repair?: string | null
          room_count?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          source: Database["public"]["Enums"]["property_source"]
          source_updated_at?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          storey?: number | null
          storeys?: number | null
          street?: string | null
          synced_at?: string | null
          title: string
          updated_at?: string
          wall_material?: string | null
        }
        Update: {
          agent_id?: string | null
          area_kitchen?: number | null
          area_life?: number | null
          area_lot?: number | null
          area_total?: number | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"] | null
          deal?: Database["public"]["Enums"]["deal"]
          description?: string | null
          district?: string | null
          external_id?: string | null
          hidden_at?: string | null
          house?: string | null
          housing_class?: string | null
          id?: string
          is_newbuilding?: boolean
          lat?: number | null
          lng?: number | null
          locality?: string | null
          price_amount?: number | null
          price_per_m2?: number | null
          price_usd?: number | null
          prop_kind?: string | null
          property_type?: Database["public"]["Enums"]["property_type"]
          published_at?: string | null
          raw?: Json | null
          repair?: string | null
          room_count?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          source?: Database["public"]["Enums"]["property_source"]
          source_updated_at?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          storey?: number | null
          storeys?: number | null
          street?: string | null
          synced_at?: string | null
          title?: string
          updated_at?: string
          wall_material?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      property_photos: {
        Row: {
          created_at: string
          height: number | null
          id: string
          position: number
          property_id: string
          r2_key: string
          sizes: Json | null
          source_url: string | null
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          position: number
          property_id: string
          r2_key: string
          sizes?: Json | null
          source_url?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          property_id?: string
          r2_key?: string
          sizes?: Json | null
          source_url?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          exchange_rates: Json
          id: boolean
          last_sync_at: string | null
          properties_source: Database["public"]["Enums"]["property_source"]
          sync_cursor: string | null
          updated_at: string
        }
        Insert: {
          exchange_rates?: Json
          id?: boolean
          last_sync_at?: string | null
          properties_source?: Database["public"]["Enums"]["property_source"]
          sync_cursor?: string | null
          updated_at?: string
        }
        Update: {
          exchange_rates?: Json
          id?: boolean
          last_sync_at?: string | null
          properties_source?: Database["public"]["Enums"]["property_source"]
          sync_cursor?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      save_exchange_rates: {
        Args: { p_eur: number; p_uah: number }
        Returns: number
      }
    }
    Enums: {
      currency: "UAH" | "USD" | "EUR"
      deal: "sell" | "rent_long" | "rent_day"
      delivery_status: "pending" | "sent" | "failed" | "skipped"
      lead_kind: "property_request" | "general" | "ai"
      property_source: "plektan" | "admin"
      property_status: "published" | "hidden"
      property_type: "flat" | "house" | "commercial" | "plot"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      currency: ["UAH", "USD", "EUR"],
      deal: ["sell", "rent_long", "rent_day"],
      delivery_status: ["pending", "sent", "failed", "skipped"],
      lead_kind: ["property_request", "general", "ai"],
      property_source: ["plektan", "admin"],
      property_status: ["published", "hidden"],
      property_type: ["flat", "house", "commercial", "plot"],
    },
  },
} as const

