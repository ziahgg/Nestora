
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
            "agent_hours": {
                  Row: {
                    "agent_id": string,"start_time": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "agent_id": string,"start_time": string,"weekday": number
                  }
                  Update: {
                    "agent_id"?: string,"start_time"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "agent_hours_agent_id_fkey"
      columns: ["agent_id"]
isOneToOne: false
      referencedRelation: "agents"
      referencedColumns: ["id"]
    }
                  ]
                },"agent_time_off": {
                  Row: {
                    "agent_id": string,"day": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agent_id": string,"day": string
                  }
                  Update: {
                    "agent_id"?: string,"day"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agent_time_off_agent_id_fkey"
      columns: ["agent_id"]
isOneToOne: false
      referencedRelation: "agents"
      referencedColumns: ["id"]
    }
                  ]
                },"agents": {
                  Row: {
                    "agency": string,"created_at": string,"email": string,"full_name": string,"id": string,"phone": string,"reply_hint": string,"title": string,"user_id": string | null,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "agency": string,"created_at"?: string,"email": string,"full_name": string,"id"?: string,"phone": string,"reply_hint"?: string,"title"?: string,"user_id"?: string | null,"verified"?: boolean
                  }
                  Update: {
                    "agency"?: string,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"phone"?: string,"reply_hint"?: string,"title"?: string,"user_id"?: string | null,"verified"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"amenities": {
                  Row: {
                    "icon": string,"id": string,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "icon": string,"id"?: string,"name": string,"slug": string
                  }
                  Update: {
                    "icon"?: string,"id"?: string,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"compare_items": {
                  Row: {
                    "created_at": string,"property_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"property_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"property_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "compare_items_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"favorites": {
                  Row: {
                    "created_at": string,"property_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"property_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"property_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"inquiries": {
                  Row: {
                    "agent_id": string,"created_at": string,"email": string,"full_name": string,"id": string,"idempotency_key": string,"message": string,"monthly_rent_snapshot": number,"phone": string | null,"preferred_contact": Database["public"]['Enums']["contact_method"],"property_id": string,"property_title_snapshot": string,"reference": string,"status": Database["public"]['Enums']["inquiry_status"],"topics": (string)[],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agent_id": string,"created_at"?: string,"email": string,"full_name": string,"id"?: string,"idempotency_key": string,"message": string,"monthly_rent_snapshot": number,"phone"?: string | null,"preferred_contact": Database["public"]['Enums']["contact_method"],"property_id": string,"property_title_snapshot": string,"reference"?: string,"status"?: Database["public"]['Enums']["inquiry_status"],"topics": (string)[],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "agent_id"?: string,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"idempotency_key"?: string,"message"?: string,"monthly_rent_snapshot"?: number,"phone"?: string | null,"preferred_contact"?: Database["public"]['Enums']["contact_method"],"property_id"?: string,"property_title_snapshot"?: string,"reference"?: string,"status"?: Database["public"]['Enums']["inquiry_status"],"topics"?: (string)[],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inquiries_agent_id_fkey"
      columns: ["agent_id"]
isOneToOne: false
      referencedRelation: "agents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inquiries_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"inquiry_events": {
                  Row: {
                    "actor": string,"body": string | null,"created_at": string,"id": string,"inquiry_id": string,"kind": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor": string,"body"?: string | null,"created_at"?: string,"id"?: string,"inquiry_id": string,"kind": string
                  }
                  Update: {
                    "actor"?: string,"body"?: string | null,"created_at"?: string,"id"?: string,"inquiry_id"?: string,"kind"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inquiry_events_inquiry_id_fkey"
      columns: ["inquiry_id"]
isOneToOne: false
      referencedRelation: "inquiries"
      referencedColumns: ["id"]
    }
                  ]
                },"neighborhoods": {
                  Row: {
                    "city": string,"id": string,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "city": string,"id"?: string,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "city"?: string,"id"?: string,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"inquiry_id": string | null,"kind": Database["public"]['Enums']["notification_kind"],"property_id": string | null,"read_at": string | null,"title": string,"user_id": string,"viewing_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"inquiry_id"?: string | null,"kind": Database["public"]['Enums']["notification_kind"],"property_id"?: string | null,"read_at"?: string | null,"title": string,"user_id": string,"viewing_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"inquiry_id"?: string | null,"kind"?: Database["public"]['Enums']["notification_kind"],"property_id"?: string | null,"read_at"?: string | null,"title"?: string,"user_id"?: string,"viewing_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_inquiry_id_fkey"
      columns: ["inquiry_id"]
isOneToOne: false
      referencedRelation: "inquiries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_viewing_id_fkey"
      columns: ["viewing_id"]
isOneToOne: false
      referencedRelation: "viewings"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"contact_email": string | null,"created_at": string,"full_name": string,"id": string,"notify_inquiry_replies": boolean,"notify_price_updates": boolean,"notify_viewing_updates": boolean,"phone": string | null,"preferred_contact": Database["public"]['Enums']["contact_method"],"preferred_move_in": string | null,"share_phone": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"contact_email"?: string | null,"created_at"?: string,"full_name"?: string,"id": string,"notify_inquiry_replies"?: boolean,"notify_price_updates"?: boolean,"notify_viewing_updates"?: boolean,"phone"?: string | null,"preferred_contact"?: Database["public"]['Enums']["contact_method"],"preferred_move_in"?: string | null,"share_phone"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"contact_email"?: string | null,"created_at"?: string,"full_name"?: string,"id"?: string,"notify_inquiry_replies"?: boolean,"notify_price_updates"?: boolean,"notify_viewing_updates"?: boolean,"phone"?: string | null,"preferred_contact"?: Database["public"]['Enums']["contact_method"],"preferred_move_in"?: string | null,"share_phone"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"properties": {
                  Row: {
                    "address_line": string,"agent_id": string,"area_sqft": number | null,"available_from": string | null,"bathrooms": number,"bedrooms": number,"city": string,"created_at": string,"currency": string,"description": string,"featured": boolean,"furnishing": Database["public"]['Enums']["furnishing"] | null,"id": string,"lease_months": number | null,"map_x": number,"map_y": number,"monthly_rent": number,"neighborhood_id": string,"parking": number | null,"pet_deposit": number | null,"pets": Database["public"]['Enums']["pets_policy"] | null,"postal_code": string,"property_type": Database["public"]['Enums']["property_type"],"published_at": string | null,"region": string,"search_text": string,"security_deposit": number | null,"slug": string,"status": Database["public"]['Enums']["listing_status"],"title": string,"updated_at": string,"utilities": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line": string,"agent_id": string,"area_sqft"?: number | null,"available_from"?: string | null,"bathrooms": number,"bedrooms": number,"city": string,"created_at"?: string,"currency"?: string,"description"?: string,"featured"?: boolean,"furnishing"?: Database["public"]['Enums']["furnishing"] | null,"id"?: string,"lease_months"?: number | null,"map_x"?: number,"map_y"?: number,"monthly_rent": number,"neighborhood_id": string,"parking"?: number | null,"pet_deposit"?: number | null,"pets"?: Database["public"]['Enums']["pets_policy"] | null,"postal_code": string,"property_type": Database["public"]['Enums']["property_type"],"published_at"?: string | null,"region"?: string,"search_text"?: string,"security_deposit"?: number | null,"slug": string,"status"?: Database["public"]['Enums']["listing_status"],"title": string,"updated_at"?: string,"utilities"?: string | null
                  }
                  Update: {
                    "address_line"?: string,"agent_id"?: string,"area_sqft"?: number | null,"available_from"?: string | null,"bathrooms"?: number,"bedrooms"?: number,"city"?: string,"created_at"?: string,"currency"?: string,"description"?: string,"featured"?: boolean,"furnishing"?: Database["public"]['Enums']["furnishing"] | null,"id"?: string,"lease_months"?: number | null,"map_x"?: number,"map_y"?: number,"monthly_rent"?: number,"neighborhood_id"?: string,"parking"?: number | null,"pet_deposit"?: number | null,"pets"?: Database["public"]['Enums']["pets_policy"] | null,"postal_code"?: string,"property_type"?: Database["public"]['Enums']["property_type"],"published_at"?: string | null,"region"?: string,"search_text"?: string,"security_deposit"?: number | null,"slug"?: string,"status"?: Database["public"]['Enums']["listing_status"],"title"?: string,"updated_at"?: string,"utilities"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "properties_agent_id_fkey"
      columns: ["agent_id"]
isOneToOne: false
      referencedRelation: "agents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "properties_neighborhood_id_fkey"
      columns: ["neighborhood_id"]
isOneToOne: false
      referencedRelation: "neighborhoods"
      referencedColumns: ["id"]
    }
                  ]
                },"property_amenities": {
                  Row: {
                    "amenity_id": string,"property_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amenity_id": string,"property_id": string
                  }
                  Update: {
                    "amenity_id"?: string,"property_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "property_amenities_amenity_id_fkey"
      columns: ["amenity_id"]
isOneToOne: false
      referencedRelation: "amenities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "property_amenities_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"property_images": {
                  Row: {
                    "alt": string,"caption": string | null,"id": string,"image_key": string,"property_id": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "alt": string,"caption"?: string | null,"id"?: string,"image_key": string,"property_id": string,"sort_order"?: number
                  }
                  Update: {
                    "alt"?: string,"caption"?: string | null,"id"?: string,"image_key"?: string,"property_id"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "property_images_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"recent_searches": {
                  Row: {
                    "created_at": string,"detail": string,"id": string,"label": string,"params": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"detail"?: string,"id"?: string,"label": string,"params": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"detail"?: string,"id"?: string,"label"?: string,"params"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"recently_viewed": {
                  Row: {
                    "property_id": string,"user_id": string,"viewed_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "property_id": string,"user_id": string,"viewed_at"?: string
                  }
                  Update: {
                    "property_id"?: string,"user_id"?: string,"viewed_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recently_viewed_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"viewings": {
                  Row: {
                    "agent_id": string,"cancel_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"created_at": string,"ends_at": string,"guests": number,"id": string,"idempotency_key": string,"inquiry_id": string | null,"note": string | null,"phone": string,"property_id": string,"reference": string,"reschedule_count": number,"starts_at": string,"status": Database["public"]['Enums']["viewing_status"],"updated_at": string,"user_id": string,"viewing_type": Database["public"]['Enums']["viewing_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "agent_id": string,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"created_at"?: string,"ends_at": string,"guests"?: number,"id"?: string,"idempotency_key": string,"inquiry_id"?: string | null,"note"?: string | null,"phone": string,"property_id": string,"reference"?: string,"reschedule_count"?: number,"starts_at": string,"status"?: Database["public"]['Enums']["viewing_status"],"updated_at"?: string,"user_id": string,"viewing_type": Database["public"]['Enums']["viewing_type"]
                  }
                  Update: {
                    "agent_id"?: string,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"created_at"?: string,"ends_at"?: string,"guests"?: number,"id"?: string,"idempotency_key"?: string,"inquiry_id"?: string | null,"note"?: string | null,"phone"?: string,"property_id"?: string,"reference"?: string,"reschedule_count"?: number,"starts_at"?: string,"status"?: Database["public"]['Enums']["viewing_status"],"updated_at"?: string,"user_id"?: string,"viewing_type"?: Database["public"]['Enums']["viewing_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "viewings_agent_id_fkey"
      columns: ["agent_id"]
isOneToOne: false
      referencedRelation: "agents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "viewings_inquiry_id_fkey"
      columns: ["inquiry_id"]
isOneToOne: false
      referencedRelation: "inquiries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "viewings_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_check_slot":
{ Args: { "p_agent": string,"p_ignore": string,"p_starts_at": string }; Returns: undefined
                           },
"_notify":
{ Args: { "p_body": string,"p_inquiry"?: string,"p_kind": Database["public"]['Enums']["notification_kind"],"p_property": string,"p_title": string,"p_user": string,"p_viewing"?: string }; Returns: undefined
                           },
"_require_user":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"_tz":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"_viewing_minutes":
{ Args: { "p_type": Database["public"]['Enums']["viewing_type"] }; Returns: number
                           },
"add_inquiry_message":
{ Args: { "p_body": string,"p_id": string }; Returns: undefined
                           },
"cancel_viewing":
{ Args: { "p_id": string,"p_reason": string }; Returns: undefined
                           },
"close_inquiry":
{ Args: { "p_id": string,"p_note": string }; Returns: undefined
                           },
"my_agent_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"request_viewing":
{ Args: { "p_guests": number,"p_key": string,"p_note": string,"p_phone": string,"p_property": string,"p_starts_at": string,"p_type": Database["public"]['Enums']["viewing_type"] }; Returns: string
                           },
"reschedule_viewing":
{ Args: { "p_id": string,"p_starts_at": string }; Returns: undefined
                           },
"send_inquiry":
{ Args: { "p_contact": Database["public"]['Enums']["contact_method"],"p_email": string,"p_full_name": string,"p_key": string,"p_message": string,"p_phone": string,"p_property": string,"p_topics": (string)[] }; Returns: string
                           },
"viewing_slots":
{ Args: { "p_days": number,"p_from": string,"p_property": string }; Returns: {
              "available": boolean,"day": string,"reason": string,"slot": string,"starts_at": string
            }[]
                           },
"withdraw_inquiry":
{ Args: { "p_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "contact_method": "email"|"phone","furnishing": "furnished"|"partly_furnished"|"unfurnished","inquiry_status": "awaiting_response"|"responded"|"viewing_scheduled"|"withdrawn"|"closed","listing_status": "draft"|"available"|"coming_soon"|"leased","notification_kind": "inquiry_reply"|"inquiry_update"|"viewing_update"|"viewing_reminder"|"price_update","pets_policy": "none"|"cats"|"dogs"|"cats_and_dogs","property_type": "apartment"|"house"|"studio"|"townhouse","viewing_status": "confirmed"|"cancelled","viewing_type": "in_person"|"video"
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
            "contact_method": ["email", "phone"],"furnishing": ["furnished", "partly_furnished", "unfurnished"],"inquiry_status": ["awaiting_response", "responded", "viewing_scheduled", "withdrawn", "closed"],"listing_status": ["draft", "available", "coming_soon", "leased"],"notification_kind": ["inquiry_reply", "inquiry_update", "viewing_update", "viewing_reminder", "price_update"],"pets_policy": ["none", "cats", "dogs", "cats_and_dogs"],"property_type": ["apartment", "house", "studio", "townhouse"],"viewing_status": ["confirmed", "cancelled"],"viewing_type": ["in_person", "video"]
          }
        }
} as const
