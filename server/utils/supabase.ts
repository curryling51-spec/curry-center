import { createClient } from '@supabase/supabase-js'

export type RecipeRow = {
  id: string
  name: string
  calories: string
  ingredients: string
  method: string
  link: string
  note: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type AdminUserRow = {
  id: string
  username: string
  password_hash: string
  role: 'super' | 'admin'
  is_active: boolean
  session_version: number
  last_login_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type PlanRow = {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type PlanCheckinRow = {
  id: string
  plan_id: string
  checkin_date: string
  completed_at: string
  created_at: string
}

export type KnowledgeCategoryRow = {
  id: string
  name: string
  slug: string
  description: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type KnowledgeArticleRow = {
  id: string
  category_id: string
  title: string
  slug: string
  content_markdown: string
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type KnowledgeArticleRevisionRow = {
  id: string
  article_id: string
  category_id: string
  title: string
  slug: string
  content_markdown: string
  status: 'draft' | 'published'
  published_at: string | null
  change_type: 'edit' | 'publish' | 'unpublish' | 'restore'
  changed_by_user_id: string | null
  changed_by_username: string
  created_at: string
}

export type FrontAccessRuleRow = {
  id: string
  access_key: string
  name: string
  pattern_hash: string
  is_active: boolean
  max_attempts: number
  lock_duration_hours: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type FrontAccessAttemptRow = {
  id: string
  rule_id: string
  client_hash: string
  failed_attempts: number
  locked_until: string | null
  updated_at: string
}

export type FoodOrderRow = {
  id: string
  customer_name: string
  scheduled_for: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type FoodOrderItemRow = {
  id: string
  order_id: string
  recipe_id: string | null
  recipe_name: string
  calories: string
  sort_order: number
  created_at: string
}

export const useSupabaseServer = () => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseSecretKey = config.supabaseSecretKey

  if (!supabaseUrl || !supabaseSecretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase environment variables are not configured'
    })
  }

  return createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

type Database = {
  public: {
    Tables: {
      recipes: {
        Row: RecipeRow
        Insert: Omit<RecipeRow, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Omit<RecipeRow, 'id' | 'created_at'>>
        Relationships: []
      }
      admin_users: {
        Row: AdminUserRow
        Insert: Omit<AdminUserRow, 'id' | 'last_login_at' | 'created_at' | 'updated_at' | 'deleted_at'> & {
          id?: string
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Omit<AdminUserRow, 'id' | 'created_at'>>
        Relationships: []
      }
      plans: {
        Row: PlanRow
        Insert: Omit<PlanRow, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Omit<PlanRow, 'id' | 'created_at'>>
        Relationships: []
      }
      plan_checkins: {
        Row: PlanCheckinRow
        Insert: Omit<PlanCheckinRow, 'id' | 'completed_at' | 'created_at'> & {
          id?: string
          completed_at?: string
          created_at?: string
        }
        Update: Partial<Omit<PlanCheckinRow, 'id' | 'plan_id' | 'checkin_date' | 'created_at'>>
        Relationships: []
      }
      knowledge_categories: {
        Row: KnowledgeCategoryRow
        Insert: Omit<KnowledgeCategoryRow, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Omit<KnowledgeCategoryRow, 'id' | 'created_at'>>
        Relationships: []
      }
      knowledge_articles: {
        Row: KnowledgeArticleRow
        Insert: Omit<KnowledgeArticleRow, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Omit<KnowledgeArticleRow, 'id' | 'created_at'>>
        Relationships: []
      }
      knowledge_article_revisions: {
        Row: KnowledgeArticleRevisionRow
        Insert: Omit<KnowledgeArticleRevisionRow, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<KnowledgeArticleRevisionRow, 'id' | 'article_id' | 'created_at'>>
        Relationships: []
      }
      front_access_rules: {
        Row: FrontAccessRuleRow
        Insert: Omit<FrontAccessRuleRow, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Omit<FrontAccessRuleRow, 'id' | 'created_at'>>
        Relationships: []
      }
      front_access_attempts: {
        Row: FrontAccessAttemptRow
        Insert: Omit<FrontAccessAttemptRow, 'id' | 'updated_at'> & {
          id?: string
          updated_at?: string
        }
        Update: Partial<Omit<FrontAccessAttemptRow, 'id'>>
        Relationships: []
      }
      food_orders: {
        Row: FoodOrderRow
        Insert: Omit<FoodOrderRow, 'id' | 'status' | 'created_at' | 'updated_at' | 'deleted_at'> & {
          id?: string
          status?: FoodOrderRow['status']
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Omit<FoodOrderRow, 'id' | 'created_at'>>
        Relationships: []
      }
      food_order_items: {
        Row: FoodOrderItemRow
        Insert: Omit<FoodOrderItemRow, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<FoodOrderItemRow, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_food_order: {
        Args: {
          p_customer_name: string
          p_scheduled_for: string
          p_recipe_ids: string[]
        }
        Returns: Array<{
          order_id: string
          customer_name: string
          scheduled_for: string
          status: FoodOrderRow['status']
          dishes: string[]
        }>
      }
      get_plan_checkin_stats: {
        Args: { p_month: string }
        Returns: Array<{
          plan_id: string
          checkin_count: number
          completed_today: boolean
          checkin_dates: string[]
        }>
      }
      record_front_access_failure: {
        Args: {
          p_rule_id: string
          p_client_hash: string
          p_max_attempts?: number
          p_lock_hours?: number
        }
        Returns: Array<{
          failed_attempts: number
          locked_until: string | null
        }>
      }
    }
  }
}
