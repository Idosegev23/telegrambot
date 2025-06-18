export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      languages: {
        Row: {
          code: string
          name: string
          native_name: string
          direction: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          code: string
          name: string
          native_name: string
          direction?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          code?: string
          name?: string
          native_name?: string
          direction?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      regions: {
        Row: {
          id: string
          name: string
          country_code: string
          flag_emoji: string
          timezone: string | null
          primary_language: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          country_code: string
          flag_emoji: string
          timezone?: string | null
          primary_language?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          country_code?: string
          flag_emoji?: string
          timezone?: string | null
          primary_language?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      managers: {
        Row: {
          id: string
          user_id: string | null
          email: string
          name: string
          preferred_language: string | null
          timezone: string | null
          role: string | null
          email_notifications: boolean | null
          is_active: boolean | null
          last_login_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          email: string
          name: string
          preferred_language?: string | null
          timezone?: string | null
          role?: string | null
          email_notifications?: boolean | null
          is_active?: boolean | null
          last_login_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          email?: string
          name?: string
          preferred_language?: string | null
          timezone?: string | null
          role?: string | null
          email_notifications?: boolean | null
          is_active?: boolean | null
          last_login_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bots: {
        Row: {
          id: string
          manager_id: string | null
          name: string
          telegram_token_encrypted: string
          telegram_bot_username: string | null
          region_id: string | null
          language_code: string | null
          auto_post_enabled: boolean | null
          push_notifications: boolean | null
          max_posts_per_day: number | null
          preferred_post_times: string[] | null
          is_active: boolean | null
          last_post_at: string | null
          total_posts_sent: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          manager_id?: string | null
          name: string
          telegram_token_encrypted: string
          telegram_bot_username?: string | null
          region_id?: string | null
          language_code?: string | null
          auto_post_enabled?: boolean | null
          push_notifications?: boolean | null
          max_posts_per_day?: number | null
          preferred_post_times?: string[] | null
          is_active?: boolean | null
          last_post_at?: string | null
          total_posts_sent?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          manager_id?: string | null
          name?: string
          telegram_token_encrypted?: string
          telegram_bot_username?: string | null
          region_id?: string | null
          language_code?: string | null
          auto_post_enabled?: boolean | null
          push_notifications?: boolean | null
          max_posts_per_day?: number | null
          preferred_post_times?: string[] | null
          is_active?: boolean | null
          last_post_at?: string | null
          total_posts_sent?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      channels: {
        Row: {
          id: string
          bot_id: string | null
          name: string
          telegram_channel_id: string
          telegram_channel_username: string | null
          description: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          bot_id?: string | null
          name: string
          telegram_channel_id: string
          telegram_channel_username?: string | null
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          bot_id?: string | null
          name?: string
          telegram_channel_id?: string
          telegram_channel_username?: string | null
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          name_translations: Json | null
          external_id: string | null
          logo_url: string | null
          league: string | null
          country: string | null
          is_local: boolean | null
          region_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          name_translations?: Json | null
          external_id?: string | null
          logo_url?: string | null
          league?: string | null
          country?: string | null
          is_local?: boolean | null
          region_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          name_translations?: Json | null
          external_id?: string | null
          logo_url?: string | null
          league?: string | null
          country?: string | null
          is_local?: boolean | null
          region_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      translations: {
        Row: {
          id: string
          key: string
          context: string | null
          en: string
          am: string | null
          sw: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          key: string
          context?: string | null
          en: string
          am?: string | null
          sw?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          key?: string
          context?: string | null
          en?: string
          am?: string | null
          sw?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      posts: {
        Row: {
          id: string
          bot_id: string | null
          channel_id: string | null
          content: string
          content_translations: Json | null
          type: string | null
          status: string | null
          scheduled_for: string | null
          sent_at: string | null
          engagement_stats: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          bot_id?: string | null
          channel_id?: string | null
          content: string
          content_translations?: Json | null
          type?: string | null
          status?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          engagement_stats?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          bot_id?: string | null
          channel_id?: string | null
          content?: string
          content_translations?: Json | null
          type?: string | null
          status?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          engagement_stats?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      sports_apis: {
        Row: {
          id: string
          name: string
          api_url: string
          api_key: string | null
          rate_limit_per_hour: number | null
          daily_calls_used: number | null
          daily_calls_limit: number | null
          is_active: boolean | null
          priority: number | null
          last_called_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          api_url: string
          api_key?: string | null
          rate_limit_per_hour?: number | null
          daily_calls_used?: number | null
          daily_calls_limit?: number | null
          is_active?: boolean | null
          priority?: number | null
          last_called_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          api_url?: string
          api_key?: string | null
          rate_limit_per_hour?: number | null
          daily_calls_used?: number | null
          daily_calls_limit?: number | null
          is_active?: boolean | null
          priority?: number | null
          last_called_at?: string | null
          created_at?: string | null
        }
      }
    }
  }
}

// Helper types
export type Bot = Database['public']['Tables']['bots']['Row']
export type Manager = Database['public']['Tables']['managers']['Row']
export type Channel = Database['public']['Tables']['channels']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type Translation = Database['public']['Tables']['translations']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type Region = Database['public']['Tables']['regions']['Row']
export type Language = Database['public']['Tables']['languages']['Row']
export type SportsApi = Database['public']['Tables']['sports_apis']['Row'] 