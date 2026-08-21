/**
 * OTOMATİK ÜRETİLDİ — elle düzenlemeyin.
 *
 * Şemayı değiştirdikten sonra yeniden üretin:
 *   npm run db:local          (yerel şemayı kur)
 *   npm run db:types          (tipleri üret)
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      achievements: {
        Row: {
          id: string
          slug: string
          name: string
          description: string
          emoji: string
          criteria: Json
          points: number
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description: string
          emoji?: string
          criteria: Json
          points?: number
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string
          emoji?: string
          criteria?: Json
          points?: number
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_recommendations: {
        Row: {
          id: string
          user_id: string
          child_id: string | null
          mode: string | null
          prompt: string | null
          results: Json
          source: 'ai' | 'deterministic'
          model: string | null
          total_tokens: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          child_id?: string | null
          mode?: string | null
          prompt?: string | null
          results: Json
          source?: 'ai' | 'deterministic'
          model?: string | null
          total_tokens?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          child_id?: string | null
          mode?: string | null
          prompt?: string | null
          results?: Json
          source?: 'ai' | 'deterministic'
          model?: string | null
          total_tokens?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_recommendations_child_id_fkey'
            columns: ['child_id']
            isOneToOne: false
            referencedRelation: 'children'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_recommendations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      ai_usage_events: {
        Row: {
          id: string
          user_id: string
          feature: string
          model: string | null
          total_tokens: number | null
          succeeded: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature: string
          model?: string | null
          total_tokens?: number | null
          succeeded?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feature?: string
          model?: string | null
          total_tokens?: number | null
          succeeded?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_usage_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      book_contributors: {
        Row: {
          book_id: string
          person_id: string
          role: 'author' | 'illustrator' | 'translator' | 'editor'
          position: number
        }
        Insert: {
          book_id: string
          person_id: string
          role?: 'author' | 'illustrator' | 'translator' | 'editor'
          position?: number
        }
        Update: {
          book_id?: string
          person_id?: string
          role?: 'author' | 'illustrator' | 'translator' | 'editor'
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: 'book_contributors_book_id_fkey'
            columns: ['book_id']
            isOneToOne: false
            referencedRelation: 'books'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'book_contributors_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
        ]
      }
      book_interests: {
        Row: {
          book_id: string
          interest_id: string
          source: 'editorial' | 'auto'
        }
        Insert: {
          book_id: string
          interest_id: string
          source?: 'editorial' | 'auto'
        }
        Update: {
          book_id?: string
          interest_id?: string
          source?: 'editorial' | 'auto'
        }
        Relationships: [
          {
            foreignKeyName: 'book_interests_book_id_fkey'
            columns: ['book_id']
            isOneToOne: false
            referencedRelation: 'books'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'book_interests_interest_id_fkey'
            columns: ['interest_id']
            isOneToOne: false
            referencedRelation: 'interests'
            referencedColumns: ['id']
          },
        ]
      }
      book_topics: {
        Row: {
          book_id: string
          topic_id: string
          relevance: number
          source: 'editorial' | 'auto'
        }
        Insert: {
          book_id: string
          topic_id: string
          relevance?: number
          source?: 'editorial' | 'auto'
        }
        Update: {
          book_id?: string
          topic_id?: string
          relevance?: number
          source?: 'editorial' | 'auto'
        }
        Relationships: [
          {
            foreignKeyName: 'book_topics_book_id_fkey'
            columns: ['book_id']
            isOneToOne: false
            referencedRelation: 'books'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'book_topics_topic_id_fkey'
            columns: ['topic_id']
            isOneToOne: false
            referencedRelation: 'development_topics'
            referencedColumns: ['id']
          },
        ]
      }
      books: {
        Row: {
          id: string
          slug: string
          title: string
          subtitle: string | null
          original_title: string | null
          summary: string
          description: string | null
          language: 'tr' | 'en'
          age_min: number | null
          age_max: number | null
          page_count: number | null
          isbn13: string | null
          published_year: number | null
          publisher_id: string | null
          series_id: string | null
          series_position: number | null
          cover_path: string | null
          instagram_url: string | null
          instagram_shortcode: string | null
          like_count: number
          posted_at: string | null
          status: 'draft' | 'published' | 'archived'
          featured_at: string | null
          search_vector: unknown | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          subtitle?: string | null
          original_title?: string | null
          summary?: string
          description?: string | null
          language?: 'tr' | 'en'
          age_min?: number | null
          age_max?: number | null
          page_count?: number | null
          isbn13?: string | null
          published_year?: number | null
          publisher_id?: string | null
          series_id?: string | null
          series_position?: number | null
          cover_path?: string | null
          instagram_url?: string | null
          instagram_shortcode?: string | null
          like_count?: number
          posted_at?: string | null
          status?: 'draft' | 'published' | 'archived'
          featured_at?: string | null
          search_vector?: unknown | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          subtitle?: string | null
          original_title?: string | null
          summary?: string
          description?: string | null
          language?: 'tr' | 'en'
          age_min?: number | null
          age_max?: number | null
          page_count?: number | null
          isbn13?: string | null
          published_year?: number | null
          publisher_id?: string | null
          series_id?: string | null
          series_position?: number | null
          cover_path?: string | null
          instagram_url?: string | null
          instagram_shortcode?: string | null
          like_count?: number
          posted_at?: string | null
          status?: 'draft' | 'published' | 'archived'
          featured_at?: string | null
          search_vector?: unknown | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'books_publisher_id_fkey'
            columns: ['publisher_id']
            isOneToOne: false
            referencedRelation: 'publishers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'books_series_id_fkey'
            columns: ['series_id']
            isOneToOne: false
            referencedRelation: 'series'
            referencedColumns: ['id']
          },
        ]
      }
      child_achievements: {
        Row: {
          child_id: string
          achievement_id: string
          earned_at: string
        }
        Insert: {
          child_id: string
          achievement_id: string
          earned_at?: string
        }
        Update: {
          child_id?: string
          achievement_id?: string
          earned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'child_achievements_achievement_id_fkey'
            columns: ['achievement_id']
            isOneToOne: false
            referencedRelation: 'achievements'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'child_achievements_child_id_fkey'
            columns: ['child_id']
            isOneToOne: false
            referencedRelation: 'children'
            referencedColumns: ['id']
          },
        ]
      }
      child_focus_topics: {
        Row: {
          child_id: string
          topic_id: string
          priority: number
          created_at: string
        }
        Insert: {
          child_id: string
          topic_id: string
          priority?: number
          created_at?: string
        }
        Update: {
          child_id?: string
          topic_id?: string
          priority?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'child_focus_topics_child_id_fkey'
            columns: ['child_id']
            isOneToOne: false
            referencedRelation: 'children'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'child_focus_topics_topic_id_fkey'
            columns: ['topic_id']
            isOneToOne: false
            referencedRelation: 'development_topics'
            referencedColumns: ['id']
          },
        ]
      }
      child_interests: {
        Row: {
          child_id: string
          interest_id: string
        }
        Insert: {
          child_id: string
          interest_id: string
        }
        Update: {
          child_id?: string
          interest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'child_interests_child_id_fkey'
            columns: ['child_id']
            isOneToOne: false
            referencedRelation: 'children'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'child_interests_interest_id_fkey'
            columns: ['interest_id']
            isOneToOne: false
            referencedRelation: 'interests'
            referencedColumns: ['id']
          },
        ]
      }
      children: {
        Row: {
          id: string
          owner_id: string
          name: string
          birth_date: string | null
          gender: 'girl' | 'boy' | 'unspecified'
          avatar_character: string
          avatar_accessories: string[]
          notes: string | null
          position: number
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          birth_date?: string | null
          gender?: 'girl' | 'boy' | 'unspecified'
          avatar_character?: string
          avatar_accessories?: string[]
          notes?: string | null
          position?: number
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          birth_date?: string | null
          gender?: 'girl' | 'boy' | 'unspecified'
          avatar_character?: string
          avatar_accessories?: string[]
          notes?: string | null
          position?: number
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'children_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      custom_books: {
        Row: {
          id: string
          owner_id: string
          title: string
          author_name: string | null
          summary: string | null
          cover_path: string | null
          origin: 'catalog' | 'camera' | 'manual'
          matched_book_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          author_name?: string | null
          summary?: string | null
          cover_path?: string | null
          origin?: 'catalog' | 'camera' | 'manual'
          matched_book_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          author_name?: string | null
          summary?: string | null
          cover_path?: string | null
          origin?: 'catalog' | 'camera' | 'manual'
          matched_book_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'custom_books_matched_book_id_fkey'
            columns: ['matched_book_id']
            isOneToOne: false
            referencedRelation: 'books'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'custom_books_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      development_areas: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          emoji: string
          color: string
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          emoji?: string
          color?: string
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          emoji?: string
          color?: string
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      development_topics: {
        Row: {
          id: string
          area_id: string
          slug: string
          name: string
          label: string | null
          description: string | null
          keywords: string[]
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          area_id: string
          slug: string
          name: string
          label?: string | null
          description?: string | null
          keywords?: string[]
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          area_id?: string
          slug?: string
          name?: string
          label?: string | null
          description?: string | null
          keywords?: string[]
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'development_topics_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'development_areas'
            referencedColumns: ['id']
          },
        ]
      }
      donation_organizations: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          website: string | null
          is_active: boolean
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          website?: string | null
          is_active?: boolean
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          website?: string | null
          is_active?: boolean
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      donation_requests: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          full_name: string
          phone: string
          city: string
          address: string
          approximate_count: number | null
          note: string | null
          status: 'new' | 'forwarded' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          full_name: string
          phone: string
          city: string
          address: string
          approximate_count?: number | null
          note?: string | null
          status?: 'new' | 'forwarded' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          full_name?: string
          phone?: string
          city?: string
          address?: string
          approximate_count?: number | null
          note?: string | null
          status?: 'new' | 'forwarded' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'donation_requests_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'donation_organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'donation_requests_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      exchange_listings: {
        Row: {
          id: string
          owner_id: string
          book_id: string | null
          title: string
          author_name: string | null
          age_min: number | null
          age_max: number | null
          condition: 'new' | 'good' | 'worn'
          offer: string | null
          contact_name: string
          city: string
          district: string | null
          phone: string
          status: 'active' | 'closed'
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          book_id?: string | null
          title: string
          author_name?: string | null
          age_min?: number | null
          age_max?: number | null
          condition?: 'new' | 'good' | 'worn'
          offer?: string | null
          contact_name: string
          city: string
          district?: string | null
          phone: string
          status?: 'active' | 'closed'
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          book_id?: string | null
          title?: string
          author_name?: string | null
          age_min?: number | null
          age_max?: number | null
          condition?: 'new' | 'good' | 'worn'
          offer?: string | null
          contact_name?: string
          city?: string
          district?: string | null
          phone?: string
          status?: 'active' | 'closed'
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'exchange_listings_book_id_fkey'
            columns: ['book_id']
            isOneToOne: false
            referencedRelation: 'books'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'exchange_listings_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      feedback: {
        Row: {
          id: string
          user_id: string | null
          topic: 'feature' | 'bug' | 'book' | 'general'
          message: string
          status: 'new' | 'in_review' | 'resolved' | 'wont_fix'
          staff_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          topic: 'feature' | 'bug' | 'book' | 'general'
          message: string
          status?: 'new' | 'in_review' | 'resolved' | 'wont_fix'
          staff_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          topic?: 'feature' | 'bug' | 'book' | 'general'
          message?: string
          status?: 'new' | 'in_review' | 'resolved' | 'wont_fix'
          staff_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feedback_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      interests: {
        Row: {
          id: string
          slug: string
          name: string
          emoji: string
          keywords: string[]
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          emoji?: string
          keywords?: string[]
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          emoji?: string
          keywords?: string[]
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      library_items: {
        Row: {
          id: string
          child_id: string
          book_id: string | null
          custom_book_id: string | null
          status: 'to_read' | 'reading' | 'read' | 'abandoned'
          is_favorite: boolean
          rating: number
          times_read: number
          first_read_at: string | null
          last_read_at: string | null
          added_from: 'catalog' | 'camera' | 'manual'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          child_id: string
          book_id?: string | null
          custom_book_id?: string | null
          status?: 'to_read' | 'reading' | 'read' | 'abandoned'
          is_favorite?: boolean
          rating?: number
          times_read?: number
          first_read_at?: string | null
          last_read_at?: string | null
          added_from?: 'catalog' | 'camera' | 'manual'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          book_id?: string | null
          custom_book_id?: string | null
          status?: 'to_read' | 'reading' | 'read' | 'abandoned'
          is_favorite?: boolean
          rating?: number
          times_read?: number
          first_read_at?: string | null
          last_read_at?: string | null
          added_from?: 'catalog' | 'camera' | 'manual'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'library_items_book_id_fkey'
            columns: ['book_id']
            isOneToOne: false
            referencedRelation: 'books'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'library_items_child_id_fkey'
            columns: ['child_id']
            isOneToOne: false
            referencedRelation: 'children'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'library_items_custom_book_id_fkey'
            columns: ['custom_book_id']
            isOneToOne: false
            referencedRelation: 'custom_books'
            referencedColumns: ['id']
          },
        ]
      }
      pending_role_grants: {
        Row: {
          email: string
          role: 'member' | 'editor' | 'admin'
          note: string | null
          created_at: string
        }
        Insert: {
          email: string
          role?: 'member' | 'editor' | 'admin'
          note?: string | null
          created_at?: string
        }
        Update: {
          email?: string
          role?: 'member' | 'editor' | 'admin'
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          id: string
          slug: string
          display_name: string
          sort_name: string | null
          bio: string | null
          instagram_handle: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          display_name: string
          sort_name?: string | null
          bio?: string | null
          instagram_handle?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          display_name?: string
          sort_name?: string | null
          bio?: string | null
          instagram_handle?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          locale: string
          timezone: string
          onboarding_completed_at: string | null
          marketing_opt_in: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          locale?: string
          timezone?: string
          onboarding_completed_at?: string | null
          marketing_opt_in?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          locale?: string
          timezone?: string
          onboarding_completed_at?: string | null
          marketing_opt_in?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      publishers: {
        Row: {
          id: string
          slug: string
          name: string
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reading_notes: {
        Row: {
          id: string
          library_item_id: string
          body: string
          visibility: 'private' | 'family' | 'public'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          library_item_id: string
          body: string
          visibility?: 'private' | 'family' | 'public'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          library_item_id?: string
          body?: string
          visibility?: 'private' | 'family' | 'public'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reading_notes_library_item_id_fkey'
            columns: ['library_item_id']
            isOneToOne: false
            referencedRelation: 'library_items'
            referencedColumns: ['id']
          },
        ]
      }
      reading_sessions: {
        Row: {
          id: string
          library_item_id: string
          read_on: string
          minutes: number | null
          mood: 'loved' | 'liked' | 'ok' | 'disliked' | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          library_item_id: string
          read_on?: string
          minutes?: number | null
          mood?: 'loved' | 'liked' | 'ok' | 'disliked' | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          library_item_id?: string
          read_on?: string
          minutes?: number | null
          mood?: 'loved' | 'liked' | 'ok' | 'disliked' | null
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reading_sessions_library_item_id_fkey'
            columns: ['library_item_id']
            isOneToOne: false
            referencedRelation: 'library_items'
            referencedColumns: ['id']
          },
        ]
      }
      series: {
        Row: {
          id: string
          slug: string
          title: string
          description: string | null
          publisher_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description?: string | null
          publisher_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          description?: string | null
          publisher_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'series_publisher_id_fkey'
            columns: ['publisher_id']
            isOneToOne: false
            referencedRelation: 'publishers'
            referencedColumns: ['id']
          },
        ]
      }
      user_roles: {
        Row: {
          user_id: string
          role: 'member' | 'editor' | 'admin'
          granted_at: string
          granted_by: string | null
        }
        Insert: {
          user_id: string
          role: 'member' | 'editor' | 'admin'
          granted_at?: string
          granted_by?: string | null
        }
        Update: {
          user_id?: string
          role?: 'member' | 'editor' | 'admin'
          granted_at?: string
          granted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_roles_granted_by_fkey'
            columns: ['granted_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_roles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      book_details: {
        Row: {
          id: string | null
          slug: string | null
          title: string | null
          subtitle: string | null
          original_title: string | null
          summary: string | null
          description: string | null
          language: 'tr' | 'en' | null
          age_min: number | null
          age_max: number | null
          page_count: number | null
          isbn13: string | null
          published_year: number | null
          publisher_id: string | null
          series_id: string | null
          series_position: number | null
          cover_path: string | null
          instagram_url: string | null
          instagram_shortcode: string | null
          like_count: number | null
          posted_at: string | null
          status: 'draft' | 'published' | 'archived' | null
          featured_at: string | null
          search_vector: unknown | null
          created_at: string | null
          updated_at: string | null
          publisher_name: string | null
          publisher_slug: string | null
          series_title: string | null
          series_slug: string | null
          contributors: Json | null
          topics: Json | null
        }
        Relationships: []
      }
      catalog_books: {
        Row: {
          id: string | null
          slug: string | null
          title: string | null
          subtitle: string | null
          summary: string | null
          language: 'tr' | 'en' | null
          age_min: number | null
          age_max: number | null
          cover_path: string | null
          instagram_url: string | null
          like_count: number | null
          posted_at: string | null
          status: 'draft' | 'published' | 'archived' | null
          author_names: string[] | null
          topic_slugs: string[] | null
          area_slugs: string[] | null
          interest_slugs: string[] | null
        }
        Relationships: []
      }
      child_reading_stats: {
        Row: {
          child_id: string | null
          owner_id: string | null
          books_read: number | null
          books_to_read: number | null
          favorites: number | null
          rated_books: number | null
          average_rating: number | null
          total_sessions: number | null
          last_read_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ai_quota_remaining: {
        Args: {
          target_feature: string
          window_hours: number
          quota: number
        }
        Returns: number
      }
      apply_pending_role_grants: {
        Args: {
          target_user_id: unknown
        }
        Returns: number
      }
      build_search_query: {
        Args: {
          input: string
        }
        Returns: unknown
      }
      child_points: {
        Args: {
          target_child_id: string
        }
        Returns: number
      }
      child_reading_streak: {
        Args: {
          target_child_id: string
        }
        Returns: number
      }
      evaluate_child_achievements: {
        Args: {
          target_child_id: string
        }
        Returns: number
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_staff: {
        Args: Record<string, never>
        Returns: boolean
      }
      owns_child: {
        Args: {
          target_child_id: string
        }
        Returns: boolean
      }
      owns_library_item: {
        Args: {
          target_item_id: string
        }
        Returns: boolean
      }
      platform_stats: {
        Args: Record<string, never>
        Returns: Json
      }
      refresh_book_search_vector: {
        Args: {
          target_book_id: string
        }
        Returns: unknown
      }
      slugify: {
        Args: {
          value: string
        }
        Returns: string
      }
      sync_library_item_reading_stats: {
        Args: {
          target_item_id: string
        }
        Returns: unknown
      }
    }
    Enums: {
      ai_result_source: 'ai' | 'deterministic'
      app_role: 'member' | 'editor' | 'admin'
      book_condition: 'new' | 'good' | 'worn'
      book_origin: 'catalog' | 'camera' | 'manual'
      child_gender: 'girl' | 'boy' | 'unspecified'
      content_status: 'draft' | 'published' | 'archived'
      contributor_role: 'author' | 'illustrator' | 'translator' | 'editor'
      donation_status: 'new' | 'forwarded' | 'completed' | 'cancelled'
      feedback_status: 'new' | 'in_review' | 'resolved' | 'wont_fix'
      feedback_topic: 'feature' | 'bug' | 'book' | 'general'
      language_code: 'tr' | 'en'
      library_status: 'to_read' | 'reading' | 'read' | 'abandoned'
      listing_status: 'active' | 'closed'
      note_visibility: 'private' | 'family' | 'public'
      reading_mood: 'loved' | 'liked' | 'ok' | 'disliked'
      topic_source: 'editorial' | 'auto'
    }
    CompositeTypes: Record<string, never>
  }
}
