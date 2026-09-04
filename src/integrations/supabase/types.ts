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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_otp_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_otps: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      ai_cache: {
        Row: {
          book_id: string
          created_at: string
          id: string
          question: string
          question_hash: string
          response: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          question: string
          question_hash: string
          response: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          question?: string
          question_hash?: string
          response?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_cache_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_logs: {
        Row: {
          ai_response: string
          book_id: string | null
          book_title: string | null
          cached: boolean
          created_at: string
          id: string
          provider_name: string | null
          status: string
          user_id: string | null
          user_question: string
        }
        Insert: {
          ai_response: string
          book_id?: string | null
          book_title?: string | null
          cached?: boolean
          created_at?: string
          id?: string
          provider_name?: string | null
          status?: string
          user_id?: string | null
          user_question: string
        }
        Update: {
          ai_response?: string
          book_id?: string | null
          book_title?: string | null
          cached?: boolean
          created_at?: string
          id?: string
          provider_name?: string | null
          status?: string
          user_id?: string | null
          user_question?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_audit_logs: {
        Row: {
          action: string
          admin_email: string | null
          admin_user_id: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          provider: string | null
          status: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          provider?: string | null
          status?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          provider?: string | null
          status?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      ai_provider_settings: {
        Row: {
          connection_status: string | null
          enabled: boolean
          encrypted_key: string | null
          health_status: string | null
          key_last4: string | null
          last_error: string | null
          last_tested_at: string | null
          priority: number
          provider: string
          remaining_credits: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          connection_status?: string | null
          enabled?: boolean
          encrypted_key?: string | null
          health_status?: string | null
          key_last4?: string | null
          last_error?: string | null
          last_tested_at?: string | null
          priority?: number
          provider: string
          remaining_credits?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          connection_status?: string | null
          enabled?: boolean
          encrypted_key?: string | null
          health_status?: string | null
          key_last4?: string | null
          last_error?: string | null
          last_tested_at?: string | null
          priority?: number
          provider?: string
          remaining_credits?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_readiness_scores: {
        Row: {
          agent_readiness: number
          ai_maturity: number
          ai_visibility: number
          created_at: string
          id: string
          notes: Json
          scored_at: string
        }
        Insert: {
          agent_readiness: number
          ai_maturity: number
          ai_visibility: number
          created_at?: string
          id?: string
          notes?: Json
          scored_at?: string
        }
        Update: {
          agent_readiness?: number
          ai_maturity?: number
          ai_visibility?: number
          created_at?: string
          id?: string
          notes?: Json
          scored_at?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          api_key_encrypted: string
          base_url: string | null
          created_at: string
          id: string
          is_active: boolean
          model_name: string
          provider_name: string
          updated_at: string
        }
        Insert: {
          api_key_encrypted: string
          base_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          model_name: string
          provider_name: string
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string
          base_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          model_name?: string
          provider_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_errors: {
        Row: {
          ai_diagnosis: string | null
          auto_fix: string | null
          created_at: string
          emailed_at: string | null
          fingerprint: string
          id: string
          last_seen_at: string
          message: string
          needs_ai: boolean
          occurrences: number
          route: string | null
          severity: string
          source: string
          stack: string | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          ai_diagnosis?: string | null
          auto_fix?: string | null
          created_at?: string
          emailed_at?: string | null
          fingerprint: string
          id?: string
          last_seen_at?: string
          message: string
          needs_ai?: boolean
          occurrences?: number
          route?: string | null
          severity?: string
          source?: string
          stack?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          ai_diagnosis?: string | null
          auto_fix?: string | null
          created_at?: string
          emailed_at?: string | null
          fingerprint?: string
          id?: string
          last_seen_at?: string
          message?: string
          needs_ai?: boolean
          occurrences?: number
          route?: string | null
          severity?: string
          source?: string
          stack?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      book_chapters: {
        Row: {
          approval_notes: string | null
          approval_status: Database["public"]["Enums"]["approval_status_t"]
          book_id: string
          chapter_number: number
          content: string | null
          created_at: string
          id: string
          is_preview: boolean
          last_edited_at: string | null
          last_edited_by: string | null
          originality_checked_at: string | null
          originality_report: Json | null
          originality_score: number | null
          permission_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          source_citation: string | null
          source_type: Database["public"]["Enums"]["source_type_t"] | null
          title: string
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status_t"]
          book_id: string
          chapter_number?: number
          content?: string | null
          created_at?: string
          id?: string
          is_preview?: boolean
          last_edited_at?: string | null
          last_edited_by?: string | null
          originality_checked_at?: string | null
          originality_report?: Json | null
          originality_score?: number | null
          permission_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          source_citation?: string | null
          source_type?: Database["public"]["Enums"]["source_type_t"] | null
          title: string
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status_t"]
          book_id?: string
          chapter_number?: number
          content?: string | null
          created_at?: string
          id?: string
          is_preview?: boolean
          last_edited_at?: string | null
          last_edited_by?: string | null
          originality_checked_at?: string | null
          originality_report?: Json | null
          originality_score?: number | null
          permission_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          source_citation?: string | null
          source_type?: Database["public"]["Enums"]["source_type_t"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_files: {
        Row: {
          book_id: string
          created_at: string
          file_url: string
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          file_url: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          file_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_files_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_knowledge: {
        Row: {
          author: string | null
          book_id: string | null
          concepts: string[] | null
          created_at: string
          entities: string[] | null
          faqs: Json | null
          id: string
          keywords: string[] | null
          summary: string | null
          title: string | null
          topics: string[] | null
          updated_at: string
        }
        Insert: {
          author?: string | null
          book_id?: string | null
          concepts?: string[] | null
          created_at?: string
          entities?: string[] | null
          faqs?: Json | null
          id?: string
          keywords?: string[] | null
          summary?: string | null
          title?: string | null
          topics?: string[] | null
          updated_at?: string
        }
        Update: {
          author?: string | null
          book_id?: string | null
          concepts?: string[] | null
          created_at?: string
          entities?: string[] | null
          faqs?: Json | null
          id?: string
          keywords?: string[] | null
          summary?: string | null
          title?: string | null
          topics?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_knowledge_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_reviews: {
        Row: {
          book_id: string
          created_at: string
          id: string
          is_approved: boolean
          is_verified_purchase: boolean
          rating: number
          review: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          is_approved?: boolean
          is_verified_purchase?: boolean
          rating: number
          review: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          is_verified_purchase?: boolean
          rating?: number
          review?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          book_id: string
          book_slug: string
          book_title: string
          chapter_id: string
          chapter_number: number
          chapter_slug: string
          chapter_title: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          book_slug?: string
          book_title?: string
          chapter_id: string
          chapter_number?: number
          chapter_slug?: string
          chapter_title?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          book_slug?: string
          book_title?: string
          chapter_id?: string
          chapter_number?: number
          chapter_slug?: string
          chapter_title?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "book_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          access_validity_days: number | null
          author: string
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          file_type: string | null
          id: string
          is_featured: boolean
          is_free: boolean
          preview_chapters: number
          price: number
          purchase_count: number
          referral_commission_percent: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          access_validity_days?: number | null
          author?: string
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_type?: string | null
          id?: string
          is_featured?: boolean
          is_free?: boolean
          preview_chapters?: number
          price?: number
          purchase_count?: number
          referral_commission_percent?: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          access_validity_days?: number | null
          author?: string
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_type?: string | null
          id?: string
          is_featured?: boolean
          is_free?: boolean
          preview_chapters?: number
          price?: number
          purchase_count?: number
          referral_commission_percent?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chapter_notes: {
        Row: {
          book_id: string
          chapter_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_id: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_notes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_notes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "book_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_enquiries: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          source_ip: string | null
          status: string
          subject: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          source_ip?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          source_ip?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      content_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          payload: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          payload?: Json | null
        }
        Relationships: []
      }
      coupon_books: {
        Row: {
          book_id: string
          coupon_id: string
          id: string
        }
        Insert: {
          book_id: string
          coupon_id: string
          id?: string
        }
        Update: {
          book_id?: string
          coupon_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_books_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          repurchase_only: boolean
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          repurchase_only?: boolean
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          repurchase_only?: boolean
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      custom_scripts: {
        Row: {
          content: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          placement: string
          position: number
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          placement: string
          position?: number
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          placement?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_run_log: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          keyword: string | null
          keyword_score: number | null
          originality_score: number | null
          post_id: string | null
          readability_score: number | null
          run_date: string
          self_check: Json | null
          seo_score: number | null
          started_at: string
          status: string
          steps: Json | null
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          keyword?: string | null
          keyword_score?: number | null
          originality_score?: number | null
          post_id?: string | null
          readability_score?: number | null
          run_date?: string
          self_check?: Json | null
          seo_score?: number | null
          started_at?: string
          status?: string
          steps?: Json | null
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          keyword?: string | null
          keyword_score?: number | null
          originality_score?: number | null
          post_id?: string | null
          readability_score?: number | null
          run_date?: string
          self_check?: Json | null
          seo_score?: number | null
          started_at?: string
          status?: string
          steps?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_run_log_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          currency: string
          donor_email: string | null
          donor_name: string | null
          id: string
          payment_gateway: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          payment_gateway?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          payment_gateway?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      editorial_agent_runs: {
        Row: {
          created_at: string
          details: Json | null
          error: string | null
          id: string
          keyword: string | null
          originality_score: number | null
          post_id: string | null
          quality_score: number | null
          revisions: number | null
          status: string
          topic: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          error?: string | null
          id?: string
          keyword?: string | null
          originality_score?: number | null
          post_id?: string | null
          quality_score?: number | null
          revisions?: number | null
          status?: string
          topic?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          error?: string | null
          id?: string
          keyword?: string | null
          originality_score?: number | null
          post_id?: string | null
          quality_score?: number | null
          revisions?: number | null
          status?: string
          topic?: string | null
        }
        Relationships: []
      }
      lsi_keywords: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          priority: number
          related_terms: string[] | null
          term: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          related_terms?: string[] | null
          term: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          related_terms?: string[] | null
          term?: string
          updated_at?: string
        }
        Relationships: []
      }
      otp_providers: {
        Row: {
          channel: string
          config_json: Json
          created_at: string
          id: string
          is_active: boolean
          provider_name: string
          updated_at: string
        }
        Insert: {
          channel: string
          config_json?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          provider_name: string
          updated_at?: string
        }
        Update: {
          channel?: string
          config_json?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          provider_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number
          channel: string
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          used: boolean
        }
        Insert: {
          attempts?: number
          channel: string
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          used?: boolean
        }
        Update: {
          attempts?: number
          channel?: string
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          used?: boolean
        }
        Relationships: []
      }
      post_revisions: {
        Row: {
          content: string | null
          created_at: string
          excerpt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          post_id: string
          reason: string | null
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          post_id: string
          reason?: string | null
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          post_id?: string
          reason?: string | null
          title?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          approval_notes: string | null
          approval_status: Database["public"]["Enums"]["approval_status_t"]
          author: string | null
          canonical_url: string | null
          category: string | null
          content: string | null
          content_score: number | null
          cover_url: string | null
          created_at: string
          excerpt: string | null
          external_references: Json
          featured_image_alt: string | null
          featured_image_caption: string | null
          featured_image_title: string | null
          gsc_clicks: number
          gsc_ctr: number
          gsc_impressions: number
          gsc_position: number | null
          id: string
          indexing_submitted_at: string | null
          internal_links: Json
          is_published: boolean
          keyword_difficulty: number | null
          last_edited_at: string | null
          last_edited_by: string | null
          last_rewritten_at: string | null
          manually_edited: boolean
          meta_description: string | null
          meta_title: string | null
          originality_checked_at: string | null
          originality_report: Json | null
          originality_score: number | null
          permission_notes: string | null
          post_type: string
          primary_keyword: string | null
          publish_status: string
          quality_passed: boolean | null
          readability_score: number | null
          reading_time_min: number | null
          report_sent_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rewrite_count: number
          scheduled_at: string | null
          schema_type: string
          search_intent: string | null
          secondary_keywords: string[]
          self_check: Json | null
          slug: string
          social_caption: string | null
          social_captions: Json
          social_excerpt: string | null
          source_book_ids: string[] | null
          source_citation: string | null
          source_type: Database["public"]["Enums"]["source_type_t"] | null
          tags: string[]
          timezone: string
          title: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status_t"]
          author?: string | null
          canonical_url?: string | null
          category?: string | null
          content?: string | null
          content_score?: number | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          external_references?: Json
          featured_image_alt?: string | null
          featured_image_caption?: string | null
          featured_image_title?: string | null
          gsc_clicks?: number
          gsc_ctr?: number
          gsc_impressions?: number
          gsc_position?: number | null
          id?: string
          indexing_submitted_at?: string | null
          internal_links?: Json
          is_published?: boolean
          keyword_difficulty?: number | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          last_rewritten_at?: string | null
          manually_edited?: boolean
          meta_description?: string | null
          meta_title?: string | null
          originality_checked_at?: string | null
          originality_report?: Json | null
          originality_score?: number | null
          permission_notes?: string | null
          post_type?: string
          primary_keyword?: string | null
          publish_status?: string
          quality_passed?: boolean | null
          readability_score?: number | null
          reading_time_min?: number | null
          report_sent_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rewrite_count?: number
          scheduled_at?: string | null
          schema_type?: string
          search_intent?: string | null
          secondary_keywords?: string[]
          self_check?: Json | null
          slug: string
          social_caption?: string | null
          social_captions?: Json
          social_excerpt?: string | null
          source_book_ids?: string[] | null
          source_citation?: string | null
          source_type?: Database["public"]["Enums"]["source_type_t"] | null
          tags?: string[]
          timezone?: string
          title: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status_t"]
          author?: string | null
          canonical_url?: string | null
          category?: string | null
          content?: string | null
          content_score?: number | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          external_references?: Json
          featured_image_alt?: string | null
          featured_image_caption?: string | null
          featured_image_title?: string | null
          gsc_clicks?: number
          gsc_ctr?: number
          gsc_impressions?: number
          gsc_position?: number | null
          id?: string
          indexing_submitted_at?: string | null
          internal_links?: Json
          is_published?: boolean
          keyword_difficulty?: number | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          last_rewritten_at?: string | null
          manually_edited?: boolean
          meta_description?: string | null
          meta_title?: string | null
          originality_checked_at?: string | null
          originality_report?: Json | null
          originality_score?: number | null
          permission_notes?: string | null
          post_type?: string
          primary_keyword?: string | null
          publish_status?: string
          quality_passed?: boolean | null
          readability_score?: number | null
          reading_time_min?: number | null
          report_sent_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rewrite_count?: number
          scheduled_at?: string | null
          schema_type?: string
          search_intent?: string | null
          secondary_keywords?: string[]
          self_check?: Json | null
          slug?: string
          social_caption?: string | null
          social_captions?: Json
          social_excerpt?: string | null
          source_book_ids?: string[] | null
          source_citation?: string | null
          source_type?: Database["public"]["Enums"]["source_type_t"] | null
          tags?: string[]
          timezone?: string
          title?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birthday: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          reading_goal_minutes: number
          spiritual_intention: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          reading_goal_minutes?: number
          spiritual_intention?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          reading_goal_minutes?: number
          spiritual_intention?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number | null
          book_id: string
          claim_token: string | null
          coupon_id: string | null
          coupon_redeemed_at: string | null
          created_at: string
          currency: string
          guest_email: string | null
          guest_name: string | null
          id: string
          payment_gateway: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          referrer_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          book_id: string
          claim_token?: string | null
          coupon_id?: string | null
          coupon_redeemed_at?: string | null
          created_at?: string
          currency?: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          payment_gateway?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          referrer_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          book_id?: string
          claim_token?: string | null
          coupon_id?: string | null
          coupon_redeemed_at?: string | null
          created_at?: string
          currency?: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          payment_gateway?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          referrer_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          book_id: string
          chapter_id: string
          chapter_number: number
          id: string
          scroll_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_id: string
          chapter_number?: number
          id?: string
          scroll_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_id?: string
          chapter_number?: number
          id?: string
          scroll_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "book_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          admin_notes: string | null
          book_id: string
          buyer_user_id: string | null
          commission_amount: number
          commission_percent: number
          created_at: string
          id: string
          purchase_id: string | null
          referrer_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          book_id: string
          buyer_user_id?: string | null
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          id?: string
          purchase_id?: string | null
          referrer_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          book_id?: string
          buyer_user_id?: string | null
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          id?: string
          purchase_id?: string | null
          referrer_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_events: {
        Row: {
          created_at: string
          event: string
          id: string
          ip_address: string | null
          path: string | null
          payload: Json
          referrer: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          ip_address?: string | null
          path?: string | null
          payload?: Json
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          ip_address?: string | null
          path?: string | null
          payload?: Json
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      seo_agent_alerts: {
        Row: {
          created_at: string
          emailed: boolean
          error_type: string
          extra: Json | null
          http_status: number | null
          id: string
          message: string | null
          provider: string | null
          recovered: boolean
          retry_count: number | null
          severity: string
          step: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          emailed?: boolean
          error_type: string
          extra?: Json | null
          http_status?: number | null
          id?: string
          message?: string | null
          provider?: string | null
          recovered?: boolean
          retry_count?: number | null
          severity?: string
          step?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          emailed?: boolean
          error_type?: string
          extra?: Json | null
          http_status?: number | null
          id?: string
          message?: string | null
          provider?: string | null
          recovered?: boolean
          retry_count?: number | null
          severity?: string
          step?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      seo_agent_logs: {
        Row: {
          action: string | null
          content_score: number | null
          created_at: string | null
          error: string | null
          external_links: Json | null
          focus_keyword: string | null
          id: string
          internal_links: Json | null
          matched_slug: string | null
          meta: Json | null
          post_id: string | null
          reading_time_min: number | null
          run_at: string
          seo_score: number | null
          similarity_score: number | null
          slug: string | null
          sources: Json | null
          status: string
          topic: string | null
          word_count: number | null
        }
        Insert: {
          action?: string | null
          content_score?: number | null
          created_at?: string | null
          error?: string | null
          external_links?: Json | null
          focus_keyword?: string | null
          id?: string
          internal_links?: Json | null
          matched_slug?: string | null
          meta?: Json | null
          post_id?: string | null
          reading_time_min?: number | null
          run_at?: string
          seo_score?: number | null
          similarity_score?: number | null
          slug?: string | null
          sources?: Json | null
          status?: string
          topic?: string | null
          word_count?: number | null
        }
        Update: {
          action?: string | null
          content_score?: number | null
          created_at?: string | null
          error?: string | null
          external_links?: Json | null
          focus_keyword?: string | null
          id?: string
          internal_links?: Json | null
          matched_slug?: string | null
          meta?: Json | null
          post_id?: string | null
          reading_time_min?: number | null
          run_at?: string
          seo_score?: number | null
          similarity_score?: number | null
          slug?: string | null
          sources?: Json | null
          status?: string
          topic?: string | null
          word_count?: number | null
        }
        Relationships: []
      }
      seo_job_runs: {
        Row: {
          attempt: number
          created_at: string
          dispatched_by: string | null
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          fn: string
          http_status: number | null
          id: string
          max_attempts: number
          payload: Json | null
          result: Json | null
          run_date: string
          started_at: string
          status: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          dispatched_by?: string | null
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          fn: string
          http_status?: number | null
          id?: string
          max_attempts?: number
          payload?: Json | null
          result?: Json | null
          run_date?: string
          started_at?: string
          status?: string
        }
        Update: {
          attempt?: number
          created_at?: string
          dispatched_by?: string | null
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          fn?: string
          http_status?: number | null
          id?: string
          max_attempts?: number
          payload?: Json | null
          result?: Json | null
          run_date?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      seo_keyword_queue: {
        Row: {
          competition_score: number | null
          discovered_at: string
          estimated_volume: number | null
          id: string
          keyword: string
          keyword_difficulty: number | null
          matched_book_ids: string[] | null
          opportunity_score: number | null
          post_id: string | null
          reject_reason: string | null
          relevance_score: number | null
          search_intent: string | null
          secondary_keywords: string[]
          source: string | null
          sources: Json | null
          status: string
          trend_score: number | null
          used_at: string | null
        }
        Insert: {
          competition_score?: number | null
          discovered_at?: string
          estimated_volume?: number | null
          id?: string
          keyword: string
          keyword_difficulty?: number | null
          matched_book_ids?: string[] | null
          opportunity_score?: number | null
          post_id?: string | null
          reject_reason?: string | null
          relevance_score?: number | null
          search_intent?: string | null
          secondary_keywords?: string[]
          source?: string | null
          sources?: Json | null
          status?: string
          trend_score?: number | null
          used_at?: string | null
        }
        Update: {
          competition_score?: number | null
          discovered_at?: string
          estimated_volume?: number | null
          id?: string
          keyword?: string
          keyword_difficulty?: number | null
          matched_book_ids?: string[] | null
          opportunity_score?: number | null
          post_id?: string | null
          reject_reason?: string | null
          relevance_score?: number | null
          search_intent?: string | null
          secondary_keywords?: string[]
          source?: string | null
          sources?: Json | null
          status?: string
          trend_score?: number | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_keyword_queue_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_notifications: {
        Row: {
          created_at: string
          fn: string | null
          id: string
          job_run_id: string | null
          level: string
          message: string | null
          read_at: string | null
          title: string
        }
        Insert: {
          created_at?: string
          fn?: string | null
          id?: string
          job_run_id?: string | null
          level?: string
          message?: string | null
          read_at?: string | null
          title: string
        }
        Update: {
          created_at?: string
          fn?: string | null
          id?: string
          job_run_id?: string | null
          level?: string
          message?: string | null
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_notifications_job_run_id_fkey"
            columns: ["job_run_id"]
            isOneToOne: false
            referencedRelation: "seo_job_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_provider_health: {
        Row: {
          consecutive_failures: number
          last_error: string | null
          last_http_status: number | null
          paused_until: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number
          last_error?: string | null
          last_http_status?: number | null
          paused_until?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number
          last_error?: string | null
          last_http_status?: number | null
          paused_until?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_report_runs: {
        Row: {
          created_at: string
          id: string
          kind: string
          report_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          report_date: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          report_date?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          is_public: boolean
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      team_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          member_id: string | null
          priority: string
          progress: number
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          member_id?: string | null
          priority?: string
          progress?: number
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          member_id?: string | null
          priority?: string
          progress?: number
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_tasks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      text_highlights: {
        Row: {
          book_id: string
          chapter_id: string
          color: string
          created_at: string
          end_offset: number
          id: string
          paragraph_index: number
          selected_text: string
          start_offset: number
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_id: string
          color?: string
          created_at?: string
          end_offset?: number
          id?: string
          paragraph_index?: number
          selected_text: string
          start_offset?: number
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_id?: string
          color?: string
          created_at?: string
          end_offset?: number
          id?: string
          paragraph_index?: number
          selected_text?: string
          start_offset?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "text_highlights_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "text_highlights_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "book_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitor_logs: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          device_type: string | null
          id: string
          ip_address: string | null
          isp: string | null
          landing_path: string | null
          language: string | null
          latitude: number | null
          longitude: number | null
          os: string | null
          referrer: string | null
          region: string | null
          screen: string | null
          timezone: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          isp?: string | null
          landing_path?: string | null
          language?: string | null
          latitude?: number | null
          longitude?: number | null
          os?: string | null
          referrer?: string | null
          region?: string | null
          screen?: string | null
          timezone?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          isp?: string | null
          landing_path?: string | null
          language?: string | null
          latitude?: number | null
          longitude?: number | null
          os?: string | null
          referrer?: string | null
          region?: string | null
          screen?: string | null
          timezone?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_db_storage_stats: { Args: never; Returns: Json }
      admin_export_columns: { Args: never; Returns: Json }
      admin_export_schema: { Args: never; Returns: Json }
      admin_get_book_file_url: { Args: { _book_id: string }; Returns: string }
      admin_get_chapter_full: {
        Args: { _chapter_id: string }
        Returns: {
          book_id: string
          chapter_number: number
          content: string
          created_at: string
          id: string
          is_preview: boolean
          slug: string
          title: string
          updated_at: string
        }[]
      }
      admin_set_book_file_url: {
        Args: { _book_id: string; _file_url: string }
        Returns: undefined
      }
      apply_coupon:
        | { Args: { _code: string; _order_amount: number }; Returns: Json }
        | {
            Args: { _book_id?: string; _code: string; _order_amount: number }
            Returns: Json
          }
      get_book_chapter_index: {
        Args: { _book_id: string }
        Returns: {
          book_id: string
          chapter_number: number
          created_at: string
          id: string
          is_preview: boolean
          slug: string
          title: string
          updated_at: string
        }[]
      }
      get_chapter_content: {
        Args: { _chapter_id: string }
        Returns: {
          content: string
        }[]
      }
      get_guest_book_file_url: { Args: { _token: string }; Returns: string }
      get_guest_purchase_by_token: {
        Args: { _token: string }
        Returns: {
          amount: number
          book_cover: string
          book_id: string
          book_slug: string
          book_title: string
          created_at: string
          guest_email: string
          guest_name: string
          id: string
          status: string
        }[]
      }
      get_user_donations: {
        Args: { _user_id: string }
        Returns: {
          amount: number
          created_at: string
          donor_email: string
          donor_name: string
          id: string
          status: string
        }[]
      }
      get_user_purchases: {
        Args: { _user_id: string }
        Returns: {
          access_validity_days: number
          amount: number
          book_id: string
          created_at: string
          currency: string
          expires_at: string
          id: string
          is_expired: boolean
          status: string
        }[]
      }
      has_admin_access: { Args: { _user_id: string }; Returns: boolean }
      has_admin_area: {
        Args: { _area: string; _user_id: string }
        Returns: boolean
      }
      has_purchased_book: {
        Args: { _book_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_usage: {
        Args: { _coupon_id: string }
        Returns: undefined
      }
      increment_purchase_count: {
        Args: { _book_id: string }
        Returns: undefined
      }
      is_admin_otp_verified: { Args: { _user_id: string }; Returns: boolean }
      publish_scheduled_posts: { Args: never; Returns: undefined }
      review_chapter: {
        Args: { _chapter_id: string; _decision: string; _notes?: string }
        Returns: undefined
      }
      review_post: {
        Args: { _decision: string; _notes?: string; _post_id: string }
        Returns: undefined
      }
      submit_chapter_for_review: {
        Args: { _chapter_id: string }
        Returns: undefined
      }
      submit_post_for_review: { Args: { _post_id: string }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "books_manager"
        | "seo_manager"
        | "payments_manager"
        | "users_manager"
        | "support"
      approval_status_t:
        | "draft"
        | "pending_review"
        | "flagged"
        | "approved"
        | "rejected"
        | "needs_rewrite"
      source_type_t:
        | "original"
        | "translation"
        | "public_domain"
        | "licensed"
        | "quoted_excerpt"
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
  public: {
    Enums: {
      app_role: [
        "admin",
        "user",
        "books_manager",
        "seo_manager",
        "payments_manager",
        "users_manager",
        "support",
      ],
      approval_status_t: [
        "draft",
        "pending_review",
        "flagged",
        "approved",
        "rejected",
        "needs_rewrite",
      ],
      source_type_t: [
        "original",
        "translation",
        "public_domain",
        "licensed",
        "quoted_excerpt",
      ],
    },
  },
} as const
