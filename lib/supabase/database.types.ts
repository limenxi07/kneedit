export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string;
          details: NonNullable<Json>;
          id: string;
          kind: Database['public']['Enums']['alert_kind'];
          senior_id: string;
          source: Database['public']['Enums']['record_source'];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: NonNullable<Json>;
          id?: string;
          kind: Database['public']['Enums']['alert_kind'];
          senior_id: string;
          source: Database['public']['Enums']['record_source'];
        };
        Update: {
          created_at?: string;
          details?: NonNullable<Json>;
          id?: string;
          kind?: Database['public']['Enums']['alert_kind'];
          senior_id?: string;
          source?: Database['public']['Enums']['record_source'];
        };
        Relationships: [
          {
            foreignKeyName: 'alerts_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: false;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      app_settings: {
        Row: {
          id: boolean;
          paywall_enabled: boolean;
        };
        ComputedFields: never;
        Insert: {
          id?: boolean;
          paywall_enabled?: boolean;
        };
        Update: {
          id?: boolean;
          paywall_enabled?: boolean;
        };
        Relationships: [];
      };
      care_links: {
        Row: {
          id: string;
          member_id: string;
          requested_at: string;
          responded_at: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          role: Database['public']['Enums']['link_role'];
          senior_id: string;
          status: Database['public']['Enums']['link_status'];
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          member_id: string;
          requested_at?: string;
          responded_at?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role: Database['public']['Enums']['link_role'];
          senior_id: string;
          status?: Database['public']['Enums']['link_status'];
        };
        Update: {
          id?: string;
          member_id?: string;
          requested_at?: string;
          responded_at?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role?: Database['public']['Enums']['link_role'];
          senior_id?: string;
          status?: Database['public']['Enums']['link_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'care_links_member_id_fkey';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'care_links_revoked_by_fkey';
            columns: ['revoked_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'care_links_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: false;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      caregiver_notes: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          id: string;
          senior_id: string;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          senior_id: string;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          senior_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'caregiver_notes_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'caregiver_notes_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: false;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      daily_activity: {
        Row: {
          active_minutes: number | null;
          local_date: string;
          sedentary_minutes: number | null;
          senior_id: string;
          sit_to_stand_count: number | null;
          source: Database['public']['Enums']['record_source'];
          steps: number | null;
          walking_minutes: number | null;
        };
        ComputedFields: never;
        Insert: {
          active_minutes?: number | null;
          local_date: string;
          sedentary_minutes?: number | null;
          senior_id: string;
          sit_to_stand_count?: number | null;
          source: Database['public']['Enums']['record_source'];
          steps?: number | null;
          walking_minutes?: number | null;
        };
        Update: {
          active_minutes?: number | null;
          local_date?: string;
          sedentary_minutes?: number | null;
          senior_id?: string;
          sit_to_stand_count?: number | null;
          source?: Database['public']['Enums']['record_source'];
          steps?: number | null;
          walking_minutes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'daily_activity_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: false;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      default_routine_items: {
        Row: {
          exercise_id: string;
          frequency: Database['public']['Enums']['frequency'];
          position: number;
          reps: number;
        };
        ComputedFields: never;
        Insert: {
          exercise_id: string;
          frequency?: Database['public']['Enums']['frequency'];
          position: number;
          reps: number;
        };
        Update: {
          exercise_id?: string;
          frequency?: Database['public']['Enums']['frequency'];
          position?: number;
          reps?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'default_routine_items_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
        ];
      };
      exercises: {
        Row: {
          active: boolean;
          default_reps: number;
          focus_tag: string;
          id: string;
          name: NonNullable<Json>;
          position_tag: string;
          poster_path: string | null;
          review_status: Database['public']['Enums']['exercise_review_status'];
          sort_order: number;
          steps: NonNullable<Json>;
          video_path: string | null;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          default_reps: number;
          focus_tag: string;
          id: string;
          name: NonNullable<Json>;
          position_tag: string;
          poster_path?: string | null;
          review_status?: Database['public']['Enums']['exercise_review_status'];
          sort_order?: number;
          steps: NonNullable<Json>;
          video_path?: string | null;
        };
        Update: {
          active?: boolean;
          default_reps?: number;
          focus_tag?: string;
          id?: string;
          name?: NonNullable<Json>;
          position_tag?: string;
          poster_path?: string | null;
          review_status?: Database['public']['Enums']['exercise_review_status'];
          sort_order?: number;
          steps?: NonNullable<Json>;
          video_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'exercises_focus_tag_fkey';
            columns: ['focus_tag'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['key'];
          },
          {
            foreignKeyName: 'exercises_position_tag_fkey';
            columns: ['position_tag'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['key'];
          },
        ];
      };
      fall_events: {
        Row: {
          details: NonNullable<Json>;
          detected_at: string;
          id: string;
          senior_id: string;
          source: Database['public']['Enums']['record_source'];
        };
        ComputedFields: never;
        Insert: {
          details?: NonNullable<Json>;
          detected_at?: string;
          id?: string;
          senior_id: string;
          source: Database['public']['Enums']['record_source'];
        };
        Update: {
          details?: NonNullable<Json>;
          detected_at?: string;
          id?: string;
          senior_id?: string;
          source?: Database['public']['Enums']['record_source'];
        };
        Relationships: [
          {
            foreignKeyName: 'fall_events_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: false;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      friendships: {
        Row: {
          addressee_id: string;
          created_at: string;
          id: string;
          requester_id: string;
          responded_at: string | null;
          status: Database['public']['Enums']['friendship_status'];
        };
        ComputedFields: never;
        Insert: {
          addressee_id: string;
          created_at?: string;
          id?: string;
          requester_id: string;
          responded_at?: string | null;
          status?: Database['public']['Enums']['friendship_status'];
        };
        Update: {
          addressee_id?: string;
          created_at?: string;
          id?: string;
          requester_id?: string;
          responded_at?: string | null;
          status?: Database['public']['Enums']['friendship_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'friendships_addressee_id_fkey';
            columns: ['addressee_id'];
            isOneToOne: false;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
          {
            foreignKeyName: 'friendships_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      leaderboard_weeks: {
        Row: {
          includes_sample_data: boolean;
          senior_id: string;
          streak: number;
          week_rate: number;
          week_start: string;
        };
        ComputedFields: never;
        Insert: {
          includes_sample_data?: boolean;
          senior_id: string;
          streak: number;
          week_rate: number;
          week_start: string;
        };
        Update: {
          includes_sample_data?: boolean;
          senior_id?: string;
          streak?: number;
          week_rate?: number;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leaderboard_weeks_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: false;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      nudges: {
        Row: {
          created_at: string;
          id: string;
          seen_at: string | null;
          sender_id: string | null;
          senior_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          seen_at?: string | null;
          sender_id?: string | null;
          senior_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          seen_at?: string | null;
          sender_id?: string | null;
          senior_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'nudges_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'nudges_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: false;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      prescription_items: {
        Row: {
          exercise_id: string;
          frequency: Database['public']['Enums']['frequency'];
          id: string;
          position: number;
          prescription_id: string;
          reps: number;
          weekday: number | null;
        };
        ComputedFields: never;
        Insert: {
          exercise_id: string;
          frequency?: Database['public']['Enums']['frequency'];
          id?: string;
          position: number;
          prescription_id: string;
          reps: number;
          weekday?: number | null;
        };
        Update: {
          exercise_id?: string;
          frequency?: Database['public']['Enums']['frequency'];
          id?: string;
          position?: number;
          prescription_id?: string;
          reps?: number;
          weekday?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prescription_items_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prescription_items_prescription_id_fkey';
            columns: ['prescription_id'];
            isOneToOne: false;
            referencedRelation: 'prescriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      prescriptions: {
        Row: {
          created_at: string;
          id: string;
          physio_id: string | null;
          replaced_at: string | null;
          senior_id: string;
          start_date: string;
          variation: Database['public']['Enums']['prescription_variation'];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          physio_id?: string | null;
          replaced_at?: string | null;
          senior_id: string;
          start_date: string;
          variation?: Database['public']['Enums']['prescription_variation'];
        };
        Update: {
          created_at?: string;
          id?: string;
          physio_id?: string | null;
          replaced_at?: string | null;
          senior_id?: string;
          start_date?: string;
          variation?: Database['public']['Enums']['prescription_variation'];
        };
        Relationships: [
          {
            foreignKeyName: 'prescriptions_physio_id_fkey';
            columns: ['physio_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prescriptions_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: false;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          default_context: Database['public']['Enums']['app_context'] | null;
          display_name: string;
          id: string;
          is_demo: boolean;
          locale: string;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          default_context?: Database['public']['Enums']['app_context'] | null;
          display_name?: string;
          id: string;
          is_demo?: boolean;
          locale?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_context?: Database['public']['Enums']['app_context'] | null;
          display_name?: string;
          id?: string;
          is_demo?: boolean;
          locale?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          created_at: string;
          id: string;
          platform: Database['public']['Enums']['device_platform'];
          profile_id: string;
          token: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          platform: Database['public']['Enums']['device_platform'];
          profile_id?: string;
          token: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          platform?: Database['public']['Enums']['device_platform'];
          profile_id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      senior_clinical: {
        Row: {
          affected_knee: Database['public']['Enums']['knee_side'] | null;
          notes: string;
          senior_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          affected_knee?: Database['public']['Enums']['knee_side'] | null;
          notes?: string;
          senior_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          affected_knee?: Database['public']['Enums']['knee_side'] | null;
          notes?: string;
          senior_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'senior_clinical_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: true;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
          {
            foreignKeyName: 'senior_clinical_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      senior_link_codes: {
        Row: {
          code: string;
          created_at: string;
          senior_id: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          senior_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          senior_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'senior_link_codes_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: true;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      senior_stats: {
        Row: {
          as_of_date: string;
          consecutive_missed_days: number;
          includes_sample_data: boolean;
          missed_days_this_week: number;
          month_sessions: number;
          senior_id: string;
          streak: number;
          updated_at: string;
          week_done: number;
          week_prescribed: number;
          week_rate: number;
          week_start: string;
        };
        ComputedFields: never;
        Insert: {
          as_of_date: string;
          consecutive_missed_days?: number;
          includes_sample_data?: boolean;
          missed_days_this_week?: number;
          month_sessions?: number;
          senior_id: string;
          streak?: number;
          updated_at?: string;
          week_done?: number;
          week_prescribed?: number;
          week_rate?: number;
          week_start: string;
        };
        Update: {
          as_of_date?: string;
          consecutive_missed_days?: number;
          includes_sample_data?: boolean;
          missed_days_this_week?: number;
          month_sessions?: number;
          senior_id?: string;
          streak?: number;
          updated_at?: string;
          week_done?: number;
          week_prescribed?: number;
          week_rate?: number;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'senior_stats_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: true;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      seniors: {
        Row: {
          birth_year: number | null;
          created_at: string;
          friend_code: string;
          gender: Database['public']['Enums']['gender'] | null;
          plan: Database['public']['Enums']['plan_tier'];
          profile_id: string;
          reminder_time: string;
          share_fall_alerts: boolean;
          share_weekly_report: boolean;
          show_on_leaderboard: boolean;
        };
        ComputedFields: never;
        Insert: {
          birth_year?: number | null;
          created_at?: string;
          friend_code?: string;
          gender?: Database['public']['Enums']['gender'] | null;
          plan?: Database['public']['Enums']['plan_tier'];
          profile_id: string;
          reminder_time?: string;
          share_fall_alerts?: boolean;
          share_weekly_report?: boolean;
          show_on_leaderboard?: boolean;
        };
        Update: {
          birth_year?: number | null;
          created_at?: string;
          friend_code?: string;
          gender?: Database['public']['Enums']['gender'] | null;
          plan?: Database['public']['Enums']['plan_tier'];
          profile_id?: string;
          reminder_time?: string;
          share_fall_alerts?: boolean;
          share_weekly_report?: boolean;
          show_on_leaderboard?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'seniors_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      session_exercises: {
        Row: {
          completed_at: string;
          easy: boolean | null;
          exercise_id: string;
          form_score: number | null;
          hurt: boolean | null;
          id: string;
          position: number;
          reps_done: number | null;
          reps_target: number;
          sensor_summary: Json | null;
          session_id: string;
          source: Database['public']['Enums']['record_source'];
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string;
          easy?: boolean | null;
          exercise_id: string;
          form_score?: number | null;
          hurt?: boolean | null;
          id?: string;
          position: number;
          reps_done?: number | null;
          reps_target: number;
          sensor_summary?: Json | null;
          session_id: string;
          source?: Database['public']['Enums']['record_source'];
        };
        Update: {
          completed_at?: string;
          easy?: boolean | null;
          exercise_id?: string;
          form_score?: number | null;
          hurt?: boolean | null;
          id?: string;
          position?: number;
          reps_done?: number | null;
          reps_target?: number;
          sensor_summary?: Json | null;
          session_id?: string;
          source?: Database['public']['Enums']['record_source'];
        };
        Relationships: [
          {
            foreignKeyName: 'session_exercises_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_exercises_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      sessions: {
        Row: {
          ended_at: string | null;
          id: string;
          local_date: string;
          prescription_id: string | null;
          senior_id: string;
          source: Database['public']['Enums']['record_source'];
          started_at: string;
          status: Database['public']['Enums']['session_status'];
        };
        ComputedFields: never;
        Insert: {
          ended_at?: string | null;
          id?: string;
          local_date?: string;
          prescription_id?: string | null;
          senior_id: string;
          source?: Database['public']['Enums']['record_source'];
          started_at?: string;
          status?: Database['public']['Enums']['session_status'];
        };
        Update: {
          ended_at?: string | null;
          id?: string;
          local_date?: string;
          prescription_id?: string | null;
          senior_id?: string;
          source?: Database['public']['Enums']['record_source'];
          started_at?: string;
          status?: Database['public']['Enums']['session_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_prescription_id_fkey';
            columns: ['prescription_id'];
            isOneToOne: false;
            referencedRelation: 'prescriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sessions_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: false;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      sleeve_devices: {
        Row: {
          battery_pct: number | null;
          calibration_status: Database['public']['Enums']['calibration_status'];
          firmware: string | null;
          id: string;
          knee: Database['public']['Enums']['knee_side'];
          last_sync_at: string | null;
          senior_id: string;
          source: Database['public']['Enums']['record_source'];
          worn: boolean;
        };
        ComputedFields: never;
        Insert: {
          battery_pct?: number | null;
          calibration_status?: Database['public']['Enums']['calibration_status'];
          firmware?: string | null;
          id?: string;
          knee: Database['public']['Enums']['knee_side'];
          last_sync_at?: string | null;
          senior_id: string;
          source: Database['public']['Enums']['record_source'];
          worn?: boolean;
        };
        Update: {
          battery_pct?: number | null;
          calibration_status?: Database['public']['Enums']['calibration_status'];
          firmware?: string | null;
          id?: string;
          knee?: Database['public']['Enums']['knee_side'];
          last_sync_at?: string | null;
          senior_id?: string;
          source?: Database['public']['Enums']['record_source'];
          worn?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'sleeve_devices_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: false;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      tags: {
        Row: {
          key: string;
          kind: Database['public']['Enums']['tag_kind'];
          label: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          key: string;
          kind: Database['public']['Enums']['tag_kind'];
          label: NonNullable<Json>;
        };
        Update: {
          key?: string;
          kind?: Database['public']['Enums']['tag_kind'];
          label?: NonNullable<Json>;
        };
        Relationships: [];
      };
      visit_summaries: {
        Row: {
          body: NonNullable<Json>;
          generated_at: string;
          includes_sample_data: boolean;
          part: Database['public']['Enums']['visit_summary_part'];
          visit_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: NonNullable<Json>;
          generated_at?: string;
          includes_sample_data?: boolean;
          part: Database['public']['Enums']['visit_summary_part'];
          visit_id: string;
        };
        Update: {
          body?: NonNullable<Json>;
          generated_at?: string;
          includes_sample_data?: boolean;
          part?: Database['public']['Enums']['visit_summary_part'];
          visit_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'visit_summaries_visit_id_fkey';
            columns: ['visit_id'];
            isOneToOne: false;
            referencedRelation: 'visits';
            referencedColumns: ['id'];
          },
        ];
      };
      visits: {
        Row: {
          completed_at: string | null;
          created_at: string;
          duration_min: number;
          id: string;
          location: string;
          period_start: string | null;
          physio_id: string | null;
          scheduled_at: string;
          senior_id: string;
          status: Database['public']['Enums']['visit_status'];
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          duration_min?: number;
          id?: string;
          location?: string;
          period_start?: string | null;
          physio_id?: string | null;
          scheduled_at: string;
          senior_id: string;
          status?: Database['public']['Enums']['visit_status'];
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          duration_min?: number;
          id?: string;
          location?: string;
          period_start?: string | null;
          physio_id?: string | null;
          scheduled_at?: string;
          senior_id?: string;
          status?: Database['public']['Enums']['visit_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'visits_physio_id_fkey';
            columns: ['physio_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'visits_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: false;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      weekly_reports: {
        Row: {
          generated_at: string;
          id: string;
          includes_sample_data: boolean;
          report: NonNullable<Json>;
          senior_id: string;
          week_start: string;
        };
        ComputedFields: never;
        Insert: {
          generated_at?: string;
          id?: string;
          includes_sample_data?: boolean;
          report: NonNullable<Json>;
          senior_id: string;
          week_start: string;
        };
        Update: {
          generated_at?: string;
          id?: string;
          includes_sample_data?: boolean;
          report?: NonNullable<Json>;
          senior_id?: string;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'weekly_reports_senior_id_fkey';
            columns: ['senior_id'];
            isOneToOne: false;
            referencedRelation: 'seniors';
            referencedColumns: ['profile_id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_my_account: { Args: { p_confirmation: string }; Returns: undefined };
      get_friend_leaderboard: {
        Args: Record<PropertyKey, never>;
        Returns: {
          display_name: string;
          includes_sample_data: boolean;
          is_me: boolean;
          senior_id: string;
          streak: number;
          week_rate: number;
        }[];
      };
      list_friendships: {
        Args: Record<PropertyKey, never>;
        Returns: {
          direction: string;
          display_name: string;
          friend_id: string;
          friendship_id: string;
          status: Database['public']['Enums']['friendship_status'];
        }[];
      };
      mock_set_plan: {
        Args: { p_plan: Database['public']['Enums']['plan_tier']; p_senior: string };
        Returns: boolean;
      };
      redeem_link_code: {
        Args: { p_code: string; p_role: Database['public']['Enums']['link_role'] };
        Returns: string;
      };
      regenerate_link_code: { Args: Record<PropertyKey, never>; Returns: string };
      remove_friend: { Args: { p_friendship: string }; Returns: undefined };
      respond_to_friend_request: {
        Args: { p_accept: boolean; p_friendship: string };
        Returns: undefined;
      };
      respond_to_link: { Args: { p_accept: boolean; p_link: string }; Returns: undefined };
      revoke_link: { Args: { p_link: string }; Returns: undefined };
      save_prescription: {
        Args: {
          p_items: Json;
          p_senior: string;
          p_start_date: string;
          p_variation: Database['public']['Enums']['prescription_variation'];
        };
        Returns: string;
      };
      send_friend_request: { Args: { p_friend_code: string }; Returns: string };
    };
    Enums: {
      alert_kind: 'missed_days' | 'possible_fall';
      app_context: 'senior' | 'caregiver' | 'physio';
      calibration_status: 'not_started' | 'in_progress' | 'done';
      device_platform: 'ios' | 'android' | 'web';
      exercise_review_status: 'draft_pending_signoff' | 'signed_off';
      frequency: 'daily' | 'twice_daily' | 'alternate_days';
      friendship_status: 'pending' | 'accepted' | 'dismissed';
      gender: 'female' | 'male' | 'prefer_not_to_say';
      knee_side: 'left' | 'right' | 'both';
      link_role: 'caregiver' | 'physio';
      link_status: 'pending' | 'active' | 'revoked';
      plan_tier: 'free' | 'plus';
      prescription_variation: 'same_every_day' | 'by_weekday';
      record_source: 'fake' | 'manual' | 'sleeve';
      session_status: 'in_progress' | 'complete' | 'incomplete';
      tag_kind: 'focus' | 'position';
      visit_status: 'scheduled' | 'completed' | 'cancelled';
      visit_summary_part: 'adherence' | 'details';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      alert_kind: ['missed_days', 'possible_fall'],
      app_context: ['senior', 'caregiver', 'physio'],
      calibration_status: ['not_started', 'in_progress', 'done'],
      device_platform: ['ios', 'android', 'web'],
      exercise_review_status: ['draft_pending_signoff', 'signed_off'],
      frequency: ['daily', 'twice_daily', 'alternate_days'],
      friendship_status: ['pending', 'accepted', 'dismissed'],
      gender: ['female', 'male', 'prefer_not_to_say'],
      knee_side: ['left', 'right', 'both'],
      link_role: ['caregiver', 'physio'],
      link_status: ['pending', 'active', 'revoked'],
      plan_tier: ['free', 'plus'],
      prescription_variation: ['same_every_day', 'by_weekday'],
      record_source: ['fake', 'manual', 'sleeve'],
      session_status: ['in_progress', 'complete', 'incomplete'],
      tag_kind: ['focus', 'position'],
      visit_status: ['scheduled', 'completed', 'cancelled'],
      visit_summary_part: ['adherence', 'details'],
    },
  },
} as const;
