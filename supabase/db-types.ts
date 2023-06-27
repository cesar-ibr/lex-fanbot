export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      captions: {
        Row: {
          caption: string | null
          embedding: string | null
          id: number
          seconds: number | null
          video_id: string
        }
        Insert: {
          caption?: string | null
          embedding?: string | null
          id?: number
          seconds?: number | null
          video_id: string
        }
        Update: {
          caption?: string | null
          embedding?: string | null
          id?: number
          seconds?: number | null
          video_id?: string
        }
        Relationships: []
      }
      episode_statistics: {
        Row: {
          commentCount: number | null
          duration: string | null
          episode_number: number | null
          guest: string | null
          id: string
          likeCount: number | null
          publishedAt: string | null
          tags: string | null
          title: string | null
          topics: string | null
          viewCount: number | null
        }
        Insert: {
          commentCount?: number | null
          duration?: string | null
          episode_number?: number | null
          guest?: string | null
          id: string
          likeCount?: number | null
          publishedAt?: string | null
          tags?: string | null
          title?: string | null
          topics?: string | null
          viewCount?: number | null
        }
        Update: {
          commentCount?: number | null
          duration?: string | null
          episode_number?: number | null
          guest?: string | null
          id?: string
          likeCount?: number | null
          publishedAt?: string | null
          tags?: string | null
          title?: string | null
          topics?: string | null
          viewCount?: number | null
        }
        Relationships: []
      }
      episodes: {
        Row: {
          episode: string | null
          guest: string | null
          id: number
          link: string | null
          topics: string | null
          video_id: string
        }
        Insert: {
          episode?: string | null
          guest?: string | null
          id?: number
          link?: string | null
          topics?: string | null
          video_id: string
        }
        Update: {
          episode?: string | null
          guest?: string | null
          id?: number
          link?: string | null
          topics?: string | null
          video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_similarity: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          episode: string
          guest: string
          topics: string
          link: string
          seconds: number
          captions: string
          similarity: number
        }[]
      }
      match_captions: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          episode: string
          guest: string
          topics: string
          link: string
          seconds: number
          captions: string
          results: number
          similarity: number
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
