import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Sparkles, GraduationCap, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { STRIPE_TIERS } from "@/hooks/useSubscription";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPro?: boolean;
  currentTier?: string;
  onStartCheckout?: (priceId: string) => Promise<void>;
}

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "",
    icon: GraduationCap,
    description: "Get started learning",
    features: [
      "5 questions per day",
      "Basic whiteboard visualizations",
      "Core subjects",
    ],
    tierKey: "free" as const,
    highlight: false,
  },
  {
    name: "Student Pro",
    price: "$9",
    period: "/month",
    icon: Sparkles,
    description: "For serious learners",
    features: [
      "Unlimited questions",
      "Full whiteboard graphics",
      "Lesson history and replay",
      "Exam prep mode",
      "Session memory",
    ],
    tierKey: "pro" as const,
    highlight: true,
  },
  {
    name: "Scholar",
    price: "$19",
    period: "/month",
    icon: Crown,
    description: "The full experience",
    features: [
      "Everything in Student Pro",
      "Unlimited slide imports",
      "Learning analytics dashboard",
      "Study card PDF export",
      "Priority Mr. White responses",
    ],
    tierKey: "scholar" as const,
    highlight: false,
  },
];

const PricingModal: React.FC<PricingModalProps> = ({ open, onOpenChange, isPro, currentTier = "free", onStartCheckout }) => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleCheckout = async (tierKey: string) => {
    if (!user) {
      toast.error("Please sign in first to upgrade.");
      return;
    }
    const priceId = tierKey === "pro" ? STRIPE_TIERS.pro.price_id : STRIPE_TIERS.scholar.price_id;
    setCheckoutLoading(tierKey);
    try {
      if (onStartCheckout) {
        await onStartCheckout(priceId);
      }
    } catch {
      toast.error("Could not start checkout. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("email_captures")
        .insert({ email: email.trim(), source: "pricing_modal" });
      if (error) {
        if (error.code === "23505") toast.info("You're already on the list!");
        else throw error;
      } else {
        toast.success("You're on the list! We'll be in touch.");
      }
      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getCtaLabel = (tierKey: string) => {
    if (tierKey === "free") return currentTier === "free" ? "Current plan" : "Current plan";
    if (tierKey === currentTier) return "Current plan";
    return tierKey === "pro" ? "Start Pro" : "Start Scholar";
  };

  const isDisabled = (tierKey: string) => {
    return tierKey === "free" || tierKey === currentTier;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">Chalk Pro</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Unlock your full learning potential with Mr. White
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const isCurrent = tier.tierKey === currentTier;
            return (
              <div
                key={tier.name}
                className={`rounded-xl border p-4 flex flex-col gap-3 ${
                  tier.highlight
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border"
                } ${isCurrent ? "ring-2 ring-primary" : ""}`}
              >
                {isCurrent && (
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Your Plan</span>
                )}
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm text-foreground">{tier.name}</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-foreground">{tier.price}</span>
                  <span className="text-muted-foreground text-sm">{tier.period}</span>
                </div>
                <p className="text-xs text-muted-foreground">{tier.description}</p>
                <ul className="space-y-1.5 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                      <Check className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={tier.highlight ? "default" : "outline"}
                  disabled={isDisabled(tier.tierKey) || checkoutLoading === tier.tierKey}
                  className="w-full text-xs"
                  onClick={() => handleCheckout(tier.tierKey)}
                >
                  {checkoutLoading === tier.tierKey ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    getCtaLabel(tier.tierKey)
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {!isPro && (
          <div className="border-t border-border pt-4">
            {submitted ? (
              <p className="text-sm text-center text-primary font-medium">
                🎉 You're on the list — we'll give you 2 weeks free when Pro launches!
              </p>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-2">
                <p className="text-sm text-center text-muted-foreground">
                  Get notified about new features — we'll give you 2 weeks free.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="text-sm"
                  />
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? "..." : "Notify me"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;
