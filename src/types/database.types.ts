/**
 * Tipos de la base de datos de Supabase.
 *
 * ⚠️ Este fichero está escrito a mano como punto de partida y refleja
 * `supabase/migrations/0001_init.sql`. Una vez tengas el proyecto enlazado,
 * regénéralo automáticamente con:
 *
 *     pnpm db:types
 *
 * (equivale a `supabase gen types typescript --linked`)
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type CategoryKind = 'income' | 'expense'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          currency: string
          locale: string
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          currency?: string
          locale?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      family_members: {
        Row: {
          id: string
          owner_id: string
          name: string
          color: string
          avatar_icon: string
          is_self: boolean
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          color?: string
          avatar_icon?: string
          is_self?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['family_members']['Insert']>
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          owner_id: string
          name: string
          icon: string
          color: string
          kind: CategoryKind
          monthly_limit: number | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          icon: string
          color?: string
          kind: CategoryKind
          monthly_limit?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          owner_id: string
          family_member_id: string
          category_id: string
          kind: CategoryKind
          amount: number
          note: string | null
          occurred_on: string
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          family_member_id: string
          category_id: string
          kind: CategoryKind
          amount: number
          note?: string | null
          occurred_on?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      category_kind: CategoryKind
    }
  }
}

// Helpers de acceso rápido a las filas
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
