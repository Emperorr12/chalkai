import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const STRIPE_TIERS = {
  pro: {
    product_id: "prod_UGQs6sZAQvQaPb",
    price_id: "price_1THu10A2HxI9W9QxIDehoQpm",
    name: "Student Pro",
  },
  scholar: {
    product_id: "prod_UGQtuvygMOoZAJ",
    price_id: "price_1THu1KA2HxI9W9QxO4BDmnn7",
    name: "Scholar",
  },
} as const;

export type SubscriptionTier = "free" | "pro" | "scholar";

interface SubscriptionState {
  subscribed: boolean;
  tier: SubscriptionTier;
  subscriptionEnd: string | null;
  loading: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    tier: "free",
    subscriptionEnd: null,
    loading: false,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({ subscribed: false, tier: "free", subscriptionEnd: null, loading: false });
      return;
    }

    setState((s) => ({ ...s, loading: true }));
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;

      let tier: SubscriptionTier = "free";
      if (data.subscribed && data.product_id) {
        if (data.product_id === STRIPE_TIERS.scholar.product_id) tier = "scholar";
        else if (data.product_id === STRIPE_TIERS.pro.product_id) tier = "pro";
        else tier = "pro"; // fallback for any active sub
      }

      setState({
        subscribed: data.subscribed,
        tier,
        subscriptionEnd: data.subscription_end || null,
        loading: false,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const startCheckout = useCallback(async (priceId: string) => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  }, []);

  const openPortal = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  }, []);

  const isPro = state.tier === "pro" || state.tier === "scholar";

  return { ...state, isPro, startCheckout, openPortal, refresh: checkSubscription };
}
