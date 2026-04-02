import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Json } from "@/integrations/supabase/types";

export interface SavedConcept {
  id: string;
  question: string;
  explanation: string;
  whiteboard_data: Json | null;
  subject: string;
  topic: string | null;
  mastered: boolean;
  created_at: string;
  updated_at: string;
}

export function useSavedConcepts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: concepts = [], isLoading } = useQuery({
    queryKey: ["saved_concepts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_concepts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SavedConcept[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (concept: {
      question: string;
      explanation: string;
      whiteboard_data?: any;
      subject: string;
      topic?: string;
    }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("saved_concepts").insert({
        user_id: user.id,
        question: concept.question,
        explanation: concept.explanation,
        whiteboard_data: concept.whiteboard_data || null,
        subject: concept.subject,
        topic: concept.topic || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_concepts"] });
      toast.success("Concept saved!");
    },
    onError: () => toast.error("Failed to save concept"),
  });

  const toggleMastered = useMutation({
    mutationFn: async ({ id, mastered }: { id: string; mastered: boolean }) => {
      const { error } = await supabase
        .from("saved_concepts")
        .update({ mastered })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved_concepts"] }),
  });

  const deleteConcept = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_concepts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved_concepts"] });
      toast.success("Concept removed");
    },
  });

  return {
    concepts,
    isLoading,
    saveConcept: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    toggleMastered: toggleMastered.mutate,
    deleteConcept: deleteConcept.mutate,
  };
}
