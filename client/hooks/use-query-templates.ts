import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { QueryTemplate } from "@shared/api";

export function useQueryTemplates(category?: string) {
  const [templates, setTemplates] = useState<QueryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [category]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("query_templates")
        .select("*")
        .order("created_at", { ascending: true });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch templates",
      );
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (
    title: string,
    template: string,
    category: string,
  ): Promise<QueryTemplate | null> => {
    try {
      const { data, error } = await supabase
        .from("query_templates")
        .insert({
          title,
          template,
          category,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setTemplates((prev) => [...prev, data]);
      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create template",
      );
      return null;
    }
  };

  const updateTemplate = async (
    id: string,
    updates: Partial<QueryTemplate>,
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("query_templates")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setTemplates((prev) =>
        prev.map((template) =>
          template.id === id ? { ...template, ...updates } : template,
        ),
      );
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update template",
      );
      return false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("query_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Remove from local state
      setTemplates((prev) => prev.filter((template) => template.id !== id));
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete template",
      );
      return false;
    }
  };

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
