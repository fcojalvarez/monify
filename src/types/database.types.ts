export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          kind: Database['public']['Enums']['category_kind']
          monthly_limit: number | null
          name: string
          owner_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          kind: Database['public']['Enums']['category_kind']
          monthly_limit?: number | null
          name: string
          owner_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          kind?: Database['public']['Enums']['category_kind']
          monthly_limit?: number | null
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categories_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      family_members: {
        Row: {
          avatar_icon: string
          color: string
          created_at: string
          id: string
          is_self: boolean
          name: string
          owner_id: string
        }
        Insert: {
          avatar_icon?: string
          color?: string
          created_at?: string
          id?: string
          is_self?: boolean
          name: string
          owner_id?: string
        }
        Update: {
          avatar_icon?: string
          color?: string
          created_at?: string
          id?: string
          is_self?: boolean
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'family_members_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          display_name: string
          id: string
          locale: string
          savings_enabled: boolean
        }
        Insert: {
          created_at?: string
          currency?: string
          display_name?: string
          id: string
          locale?: string
          savings_enabled?: boolean
        }
        Update: {
          created_at?: string
          currency?: string
          display_name?: string
          id?: string
          locale?: string
          savings_enabled?: boolean
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          family_member_id: string
          gross: number | null
          id: string
          kind: Database['public']['Enums']['category_kind']
          note: string | null
          occurred_on: string
          owner_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          family_member_id: string
          gross?: number | null
          id?: string
          kind: Database['public']['Enums']['category_kind']
          note?: string | null
          occurred_on?: string
          owner_id?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          family_member_id?: string
          gross?: number | null
          id?: string
          kind?: Database['public']['Enums']['category_kind']
          note?: string | null
          occurred_on?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_family_member_id_fkey'
            columns: ['family_member_id']
            isOneToOne: false
            referencedRelation: 'family_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      savings: {
        Row: {
          balance: number
          color: string
          created_at: string
          id: string
          name: string
          owner_id: string
          target: number | null
        }
        Insert: {
          balance?: number
          color?: string
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          target?: number | null
        }
        Update: {
          balance?: number
          color?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'savings_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      savings_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          occurred_on: string
          owner_id: string
          savings_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          occurred_on?: string
          owner_id?: string
          savings_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          occurred_on?: string
          owner_id?: string
          savings_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'savings_transactions_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'savings_transactions_savings_id_fkey'
            columns: ['savings_id']
            isOneToOne: false
            referencedRelation: 'savings'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      category_kind: 'income' | 'expense'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      category_kind: ['income', 'expense'],
    },
  },
} as const

export type CategoryKind = Enums<'category_kind'>
