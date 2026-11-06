
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "custom_relationship_types": {
                  Row: {
                    "created_at": string,"id": string,"inverse_label": string,"label": string,"owner_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"inverse_label": string,"label": string,"owner_id"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"inverse_label"?: string,"label"?: string,"owner_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"duplicate_dismissals": {
                  Row: {
                    "created_at": string,"owner_id": string,"person_a_id": string,"person_b_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"owner_id"?: string,"person_a_id": string,"person_b_id": string
                  }
                  Update: {
                    "created_at"?: string,"owner_id"?: string,"person_a_id"?: string,"person_b_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "duplicate_dismissals_owner_id_person_a_id_fkey"
      columns: ["owner_id","person_a_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["owner_id","id"]
    },{
      foreignKeyName: "duplicate_dismissals_owner_id_person_b_id_fkey"
      columns: ["owner_id","person_b_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["owner_id","id"]
    }
                  ]
                },"event_persons": {
                  Row: {
                    "created_at": string,"event_id": string,"owner_id": string,"person_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event_id": string,"owner_id"?: string,"person_id": string
                  }
                  Update: {
                    "created_at"?: string,"event_id"?: string,"owner_id"?: string,"person_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_persons_owner_id_event_id_fkey"
      columns: ["owner_id","event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["owner_id","id"]
    },{
      foreignKeyName: "event_persons_owner_id_person_id_fkey"
      columns: ["owner_id","person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["owner_id","id"]
    }
                  ]
                },"events": {
                  Row: {
                    "created_at": string,"description": string | null,"event_date": string | null,"id": string,"location": string | null,"name": string,"network_id": string | null,"owner_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"event_date"?: string | null,"id"?: string,"location"?: string | null,"name": string,"network_id"?: string | null,"owner_id"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"event_date"?: string | null,"id"?: string,"location"?: string | null,"name"?: string,"network_id"?: string | null,"owner_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_owner_id_network_id_fkey"
      columns: ["owner_id","network_id"]
isOneToOne: false
      referencedRelation: "networks"
      referencedColumns: ["owner_id","id"]
    }
                  ]
                },"network_members": {
                  Row: {
                    "added_at": string,"network_id": string,"owner_id": string,"person_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"network_id": string,"owner_id"?: string,"person_id": string
                  }
                  Update: {
                    "added_at"?: string,"network_id"?: string,"owner_id"?: string,"person_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "network_members_owner_id_network_id_fkey"
      columns: ["owner_id","network_id"]
isOneToOne: false
      referencedRelation: "networks"
      referencedColumns: ["owner_id","id"]
    },{
      foreignKeyName: "network_members_owner_id_person_id_fkey"
      columns: ["owner_id","person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["owner_id","id"]
    }
                  ]
                },"networks": {
                  Row: {
                    "color": string | null,"created_at": string,"description": string | null,"id": string,"name": string,"owner_id": string,"type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"owner_id"?: string,"type": string,"updated_at"?: string
                  }
                  Update: {
                    "color"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"owner_id"?: string,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"persons": {
                  Row: {
                    "anniversary_date": string | null,"anniversary_reminder": boolean,"archived_at": string | null,"birthdate": string | null,"birthday_reminder": boolean,"company": string | null,"conversation_starters": string | null,"created_at": string,"department": string | null,"external_ids": NonNullable<Json>,"first_name": string,"fun_facts": string | null,"id": string,"import_source": string,"is_self": boolean,"job_title": string | null,"last_name": string | null,"location_city": string | null,"location_lat": number | null,"location_lng": number | null,"notes": string | null,"owner_id": string,"photo_path": string | null,"preferred_name": string | null,"pronouns": string | null,"tags": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anniversary_date"?: string | null,"anniversary_reminder"?: boolean,"archived_at"?: string | null,"birthdate"?: string | null,"birthday_reminder"?: boolean,"company"?: string | null,"conversation_starters"?: string | null,"created_at"?: string,"department"?: string | null,"external_ids"?: NonNullable<Json>,"first_name": string,"fun_facts"?: string | null,"id"?: string,"import_source"?: string,"is_self"?: boolean,"job_title"?: string | null,"last_name"?: string | null,"location_city"?: string | null,"location_lat"?: number | null,"location_lng"?: number | null,"notes"?: string | null,"owner_id"?: string,"photo_path"?: string | null,"preferred_name"?: string | null,"pronouns"?: string | null,"tags"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "anniversary_date"?: string | null,"anniversary_reminder"?: boolean,"archived_at"?: string | null,"birthdate"?: string | null,"birthday_reminder"?: boolean,"company"?: string | null,"conversation_starters"?: string | null,"created_at"?: string,"department"?: string | null,"external_ids"?: NonNullable<Json>,"first_name"?: string,"fun_facts"?: string | null,"id"?: string,"import_source"?: string,"is_self"?: boolean,"job_title"?: string | null,"last_name"?: string | null,"location_city"?: string | null,"location_lat"?: number | null,"location_lng"?: number | null,"notes"?: string | null,"owner_id"?: string,"photo_path"?: string | null,"preferred_name"?: string | null,"pronouns"?: string | null,"tags"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"id": string,"onboarding_complete": boolean,"settings": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"id": string,"onboarding_complete"?: boolean,"settings"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"id"?: string,"onboarding_complete"?: boolean,"settings"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"relationships": {
                  Row: {
                    "created_at": string,"custom_label": string | null,"id": string,"inverse_custom_label": string | null,"inverse_type": string,"notes": string | null,"owner_id": string,"source_person_id": string,"target_person_id": string,"type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"custom_label"?: string | null,"id"?: string,"inverse_custom_label"?: string | null,"inverse_type": string,"notes"?: string | null,"owner_id"?: string,"source_person_id": string,"target_person_id": string,"type": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"custom_label"?: string | null,"id"?: string,"inverse_custom_label"?: string | null,"inverse_type"?: string,"notes"?: string | null,"owner_id"?: string,"source_person_id"?: string,"target_person_id"?: string,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "relationships_owner_id_source_person_id_fkey"
      columns: ["owner_id","source_person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["owner_id","id"]
    },{
      foreignKeyName: "relationships_owner_id_target_person_id_fkey"
      columns: ["owner_id","target_person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["owner_id","id"]
    }
                  ]
                },"study_results": {
                  Row: {
                    "created_at": string,"id": string,"owner_id": string,"person_id": string,"prompt_type": string,"response_time_ms": number | null,"result": string,"session_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"owner_id"?: string,"person_id": string,"prompt_type": string,"response_time_ms"?: number | null,"result": string,"session_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"owner_id"?: string,"person_id"?: string,"prompt_type"?: string,"response_time_ms"?: number | null,"result"?: string,"session_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_results_owner_id_person_id_fkey"
      columns: ["owner_id","person_id"]
isOneToOne: false
      referencedRelation: "persons"
      referencedColumns: ["owner_id","id"]
    },{
      foreignKeyName: "study_results_owner_id_session_id_fkey"
      columns: ["owner_id","session_id"]
isOneToOne: false
      referencedRelation: "study_sessions"
      referencedColumns: ["owner_id","id"]
    }
                  ]
                },"study_sessions": {
                  Row: {
                    "created_at": string,"deck_params": NonNullable<Json>,"deck_type": string,"ended_at": string | null,"id": string,"owner_id": string,"started_at": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deck_params"?: NonNullable<Json>,"deck_type": string,"ended_at"?: string | null,"id"?: string,"owner_id"?: string,"started_at"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deck_params"?: NonNullable<Json>,"deck_type"?: string,"ended_at"?: string | null,"id"?: string,"owner_id"?: string,"started_at"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "delete_network":
{ Args: { "network_id": string }; Returns: number
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
