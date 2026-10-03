export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          description: string
          title: string
        }
        Insert: {
          code: string
          description: string
          title: string
        }
        Update: {
          code?: string
          description?: string
          title?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          activity_type: string
          average_pace_sec_per_km: number | null
          created_at: string
          distance_meters: number
          elapsed_seconds: number
          elevation_gain_meters: number
          elevation_loss_meters: number
          ended_at: string
          hide_radius_meters: number
          id: string
          moving_seconds: number
          shared_route: Json
          started_at: string
          title: string
          user_id: string
          verification_status: string
          visibility: string
        }
        Insert: {
          activity_type: string
          average_pace_sec_per_km?: number | null
          created_at?: string
          distance_meters: number
          elapsed_seconds: number
          elevation_gain_meters?: number
          elevation_loss_meters?: number
          ended_at: string
          hide_radius_meters?: number
          id: string
          moving_seconds: number
          shared_route?: Json
          started_at: string
          title: string
          user_id: string
          verification_status?: string
          visibility?: string
        }
        Update: {
          activity_type?: string
          average_pace_sec_per_km?: number | null
          created_at?: string
          distance_meters?: number
          elapsed_seconds?: number
          elevation_gain_meters?: number
          elevation_loss_meters?: number
          ended_at?: string
          hide_radius_meters?: number
          id?: string
          moving_seconds?: number
          shared_route?: Json
          started_at?: string
          title?: string
          user_id?: string
          verification_status?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_participants: {
        Row: {
          activity_id: string
          host_id: string
          invited_at: string
          responded_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          activity_id: string
          host_id: string
          invited_at?: string
          responded_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          host_id?: string
          invited_at?: string
          responded_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_participants_activity_id_host_id_fkey"
            columns: ["activity_id", "host_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "activity_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_points: {
        Row: {
          accuracy: number | null
          activity_id: string
          altitude: number | null
          altitude_accuracy: number | null
          latitude: number
          longitude: number
          recorded_at: string
          sequence: number
          speed: number | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          activity_id: string
          altitude?: number | null
          altitude_accuracy?: number | null
          latitude: number
          longitude: number
          recorded_at: string
          sequence: number
          speed?: number | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          activity_id?: string
          altitude?: number | null
          altitude_accuracy?: number | null
          latitude?: number
          longitude?: number
          recorded_at?: string
          sequence?: number
          speed?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_points_activity_id_user_id_fkey"
            columns: ["activity_id", "user_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      activity_shares: {
        Row: {
          activity_id: string
          activity_type: string
          average_pace_sec_per_km: number | null
          best_10k_seconds: number | null
          best_5k_seconds: number | null
          distance_meters: number
          elapsed_seconds: number
          elevation_gain_meters: number
          ended_at: string
          moving_seconds: number
          run_score: number | null
          started_at: string
          title: string
          user_id: string
        }
        Insert: {
          activity_id: string
          activity_type: string
          average_pace_sec_per_km?: number | null
          best_10k_seconds?: number | null
          best_5k_seconds?: number | null
          distance_meters: number
          elapsed_seconds: number
          elevation_gain_meters: number
          ended_at: string
          moving_seconds: number
          run_score?: number | null
          started_at: string
          title: string
          user_id: string
        }
        Update: {
          activity_id?: string
          activity_type?: string
          average_pace_sec_per_km?: number | null
          best_10k_seconds?: number | null
          best_5k_seconds?: number | null
          distance_meters?: number
          elapsed_seconds?: number
          elevation_gain_meters?: number
          ended_at?: string
          moving_seconds?: number
          run_score?: number | null
          started_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_shares_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: true
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_splits: {
        Row: {
          activity_id: string
          elapsed_seconds: number
          kilometer: number
          moving_seconds: number
          user_id: string
        }
        Insert: {
          activity_id: string
          elapsed_seconds: number
          kilometer: number
          moving_seconds: number
          user_id: string
        }
        Update: {
          activity_id?: string
          elapsed_seconds?: number
          kilometer?: number
          moving_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_splits_activity_id_user_id_fkey"
            columns: ["activity_id", "user_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      battle_members: {
        Row: {
          battle_id: string
          joined_at: string
          status: string
          user_id: string
        }
        Insert: {
          battle_id: string
          joined_at?: string
          status: string
          user_id: string
        }
        Update: {
          battle_id?: string
          joined_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_members_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "run_battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_milestones: {
        Row: {
          battle_id: string
          reached_at: string
          user_id: string
        }
        Insert: {
          battle_id: string
          reached_at: string
          user_id: string
        }
        Update: {
          battle_id?: string
          reached_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_milestones_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "run_battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_members: {
        Row: {
          challenge_id: string
          joined_at: string
          status: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          joined_at?: string
          status: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          joined_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_members_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          creator_id: string | null
          ends_at: string | null
          id: string
          invited_ids: string[]
          is_official: boolean
          kind: string
          recurrence: string
          starts_at: string | null
          target_value: number
          title: string
        }
        Insert: {
          created_at?: string
          creator_id?: string | null
          ends_at?: string | null
          id?: string
          invited_ids?: string[]
          is_official?: boolean
          kind: string
          recurrence?: string
          starts_at?: string | null
          target_value: number
          title: string
        }
        Update: {
          created_at?: string
          creator_id?: string | null
          ends_at?: string | null
          id?: string
          invited_ids?: string[]
          is_official?: boolean
          kind?: string
          recurrence?: string
          starts_at?: string | null
          target_value?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          id: string
          kind: string
          period: string
          target_value: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          period: string
          target_value: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          period?: string
          target_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          dedupe_key: string | null
          entity_id: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body: string
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          id?: string
          kind: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          achieved_at: string
          activity_id: string
          record_type: string
          user_id: string
          value: number
        }
        Insert: {
          achieved_at: string
          activity_id: string
          record_type: string
          user_id: string
          value: number
        }
        Update: {
          achieved_at?: string
          activity_id?: string
          record_type?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          friend_code: string
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          friend_code?: string
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          friend_code?: string
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      runner_profiles: {
        Row: {
          user_id: string
          age: number | null
          weight_kg: number | null
          height_cm: number | null
          running_level: string | null
          runs_per_week: number | null
          updated_at: string
        }
        Insert: {
          user_id: string
          age?: number | null
          weight_kg?: number | null
          height_cm?: number | null
          running_level?: string | null
          runs_per_week?: number | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          age?: number | null
          weight_kg?: number | null
          height_cm?: number | null
          running_level?: string | null
          runs_per_week?: number | null
          updated_at?: string
        }
        Relationships: [{
          foreignKeyName: "runner_profiles_user_id_fkey"
          columns: ["user_id"]
          isOneToOne: true
          referencedRelation: "profiles"
          referencedColumns: ["id"]
        }]
      }
      run_battles: {
        Row: {
          created_at: string
          creator_id: string
          ends_at: string
          id: string
          kind: string
          participant_ids: string[]
          starts_at: string
          target_value: number | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          ends_at: string
          id?: string
          kind: string
          participant_ids: string[]
          starts_at?: string
          target_value?: number | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          ends_at?: string
          id?: string
          kind?: string
          participant_ids?: string[]
          starts_at?: string
          target_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "run_battles_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      run_scores: {
        Row: {
          activity_id: string
          consistency: number
          created_at: string
          endurance: number
          progress: number
          score: number
          user_id: string
        }
        Insert: {
          activity_id: string
          consistency: number
          created_at?: string
          endurance: number
          progress: number
          score: number
          user_id: string
        }
        Update: {
          activity_id?: string
          consistency?: number
          created_at?: string
          endurance?: number
          progress?: number
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_scores_activity_id_user_id_fkey"
            columns: ["activity_id", "user_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          activity_id: string | null
          awarded_at: string
          code: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          awarded_at?: string
          code: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          awarded_at?: string
          code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_friend_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      battle_progress: {
        Args: { p_battle_id: string }
        Returns: {
          best_10k_seconds: number
          best_5k_seconds: number
          distance_meters: number
          run_count: number
          status: string
          user_id: string
        }[]
      }
      challenge_progress: {
        Args: { p_challenge_id: string }
        Returns: {
          progress: number
          status: string
          user_id: string
        }[]
      }
      find_friend_by_code: {
        Args: { p_code: string }
        Returns: {
          display_name: string
          id: string
          username: string
        }[]
      }
      friend_leaderboard: {
        Args: { p_end: string; p_start: string }
        Returns: {
          distance_meters: number
          run_count: number
          user_id: string
        }[]
      }
      my_goal_progress: {
        Args: never
        Returns: {
          goal_id: string
          kind: string
          period: string
          period_end: string
          progress: number
          target_value: number
        }[]
      }
      my_running_totals: {
        Args: never
        Returns: {
          run_count: number
          total_distance_meters: number
          total_elapsed_seconds: number
        }[]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
