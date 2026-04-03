import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PricingModal from "./PricingModal";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown } from "lucide-react";

const Navbar: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { user, signOut } = useAuth();
  const { isPro, tier, startCheckout } = useSubscription();
  const [showPricing, setShowPricing] = useState(false);

  return (
    <>
      <nav className="w-full border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-medium text-foreground relative">
              Chalk
              <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-primary/40 rounded-full" />
            </span>
            {isPro && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                <Crown className="w-3 h-3" />
                PRO
              </span>
            )}
          </Link>

          <div className="hidden sm:flex items-center gap-8 text-sm text-muted-foreground">
            {isHome && (
              <>
                <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
                <a href="#subjects" className="hover:text-foreground transition-colors">Subjects</a>
              </>
            )}
            {!isHome && (
              <>
                <Link to="/exam-prep" className="hover:text-foreground transition-colors">Exam Prep</Link>
                {user && <Link to="/concepts" className="hover:text-foreground transition-colors">My Concepts</Link>}
                {user && <Link to="/lessons" className="hover:text-foreground transition-colors">My Lessons</Link>}
                {user && <Link to="/progress" className="hover:text-foreground transition-colors">Progress</Link>}
                <Link to="/demo" className="hover:text-foreground transition-colors">Demo</Link>
              </>
            )}
            {!isPro && (
              <button
                onClick={() => setShowPricing(true)}
                className="hover:text-foreground transition-colors text-primary font-medium"
              >
                Upgrade
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/ask"
                  className="text-sm px-4 py-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Start learning
                </Link>
                <button
                  onClick={signOut}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/ask"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Try it free
                </Link>
                <Link
                  to="/auth"
                  className="text-sm px-4 py-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <PricingModal
        open={showPricing}
        onOpenChange={setShowPricing}
        isPro={isPro}
        currentTier={tier}
        onStartCheckout={startCheckout}
      />
    </>
  );
};

export default Navbar;
