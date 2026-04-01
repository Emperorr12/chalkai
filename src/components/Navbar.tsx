import React from "react";
import { Link, useLocation } from "react-router-dom";
import MrWhite from "./MrWhite";

const Navbar: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <nav className="w-full border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <MrWhite state="idle" size={24} />
          <span className="text-lg font-medium text-foreground relative">
            Chalk
            <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-primary/40 rounded-full" />
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          {isHome && (
            <>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
              <a href="#subjects" className="hover:text-foreground transition-colors">Subjects</a>
            </>
          )}
          <Link to="/demo" className="hover:text-foreground transition-colors">Demo</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/ask"
            className="text-sm px-4 py-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Start learning
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
