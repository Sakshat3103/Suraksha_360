export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          city: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      emergency_contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          relation: string;
          phone: string;
          email: string | null;
          is_primary: boolean;
          notify_sms: boolean;
          notify_call: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          relation: string;
          phone: string;
          email?: string | null;
          is_primary?: boolean;
          notify_sms?: boolean;
          notify_call?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          relation?: string;
          phone?: string;
          email?: string | null;
          is_primary?: boolean;
          notify_sms?: boolean;
          notify_call?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          theme: string;
          push_notifications: boolean;
          email_notifications: boolean;
          sos_gesture_enabled: boolean;
          silent_mode: boolean;
          anomaly_sensitivity: number;
          location_sharing: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme?: string;
          push_notifications?: boolean;
          email_notifications?: boolean;
          sos_gesture_enabled?: boolean;
          silent_mode?: boolean;
          anomaly_sensitivity?: number;
          location_sharing?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          theme?: string;
          push_notifications?: boolean;
          email_notifications?: boolean;
          sos_gesture_enabled?: boolean;
          silent_mode?: boolean;
          anomaly_sensitivity?: number;
          location_sharing?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type EmergencyContact = Database["public"]["Tables"]["emergency_contacts"]["Row"];
export type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];
