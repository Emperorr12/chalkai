import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import HeroWhiteboardDemo from "../components/HeroWhiteboardDemo";

const subjects = [
  "Algebra", "Calculus", "Physics", "Chemistry", "Biology",
  "Statistics", "History", "Economics", "Coding", "English Lit",
];

const Index: React.FC = () => {
  const [heroQuery, setHeroQuery] = useState("");
  const navigate = useNavigate();

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroQuery.trim();
    if (!q) return;
    navigate(`/ask?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center">
        <h1 className="text-[42px] md:text-[52px] leading-[1.1] font-semibold text-foreground mb-4 tracking-tight">
          Understand anything in seconds
          <br />
          <span className="text-primary">— explained visually</span>
        </h1>
        <p className="text-muted-foreground max-w-[480px] mx-auto text-base leading-relaxed mb-8">
          Ask any question and watch Mr.&nbsp;White draw the answer step-by-step on a whiteboard.
        </p>

        {/* Hero Input */}
        <form onSubmit={handleHeroSubmit} className="max-w-lg mx-auto mb-10">
          <div className="flex items-center gap-2 bg-card rounded-full px-5 py-3 border border-border focus-within:border-primary transition-colors shadow-lg shadow-primary/5">
            <input
              value={heroQuery}
              onChange={(e) => setHeroQuery(e.target.value)}
              placeholder='Ask anything… (e.g., What is supply and demand?)'
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={!heroQuery.trim()}
              className="bg-primary text-primary-foreground rounded-full p-2 disabled:opacity-30 transition-opacity"
              aria-label="Ask Mr. White"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            No sign-up needed — just ask and watch Mr. White explain it visually.
          </p>
        </form>

        {/* Interactive whiteboard demo */}
        <HeroWhiteboardDemo />
      </section>

      {/* Subject Chips */}
      <section id="subjects" className="max-w-3xl mx-auto px-6 pb-12">
        <p className="text-center text-[11px] text-muted-foreground tracking-[0.2em] uppercase mb-4">
          Works for any subject
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {subjects.map((s) => (
            <Link
              key={s}
              to={`/ask?subject=${encodeURIComponent(s)}`}
              className="text-xs px-4 py-2 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
            >
              {s}
            </Link>
          ))}
        </div>
      </section>

      {/* Two Mode Cards */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-card rounded-xl p-8 border border-border/60 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Ask Mr. White</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Type any question. Mr.&nbsp;White draws the answer on his whiteboard in real time.
            </p>
            <Link
              to="/ask"
              className="inline-flex items-center justify-center w-full px-5 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Ask a question
            </Link>
          </div>

          <div className="bg-card rounded-xl p-8 border border-border/60 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="8" y1="21" x2="16" y2="21" strokeLinecap="round" />
                <line x1="12" y1="17" x2="12" y2="21" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Import my slides</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Upload class slides and Mr.&nbsp;White walks you through every concept.
            </p>
            <Link
              to="/slides"
              className="inline-flex items-center justify-center w-full px-5 py-2.5 text-sm rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors"
            >
              Upload slides
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-light text-foreground text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {[
            { step: "1", title: "Ask anything", desc: "Type or speak your question" },
            { step: "2", title: "Watch it drawn", desc: "Mr. White draws the answer on his whiteboard" },
            { step: "3", title: "Go deeper", desc: "Ask follow-ups, get quizzed, master the topic" },
          ].map((item) => (
            <div key={item.step}>
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium mx-auto mb-3">
                {item.step}
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <p className="text-center text-xs text-muted-foreground mb-8 uppercase tracking-wider">
          Trusted by students at 100+ schools
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { quote: "Finally a study tool that actually explains things instead of just giving answers.", name: "Priya, UC Berkeley" },
            { quote: "Mr. White helped me understand thermodynamics better than my actual professor.", name: "Marcus, Georgia Tech" },
            { quote: "I use Chalk before every exam. The whiteboard drawings make everything click.", name: "Sana, NYU" },
          ].map((t) => (
            <div key={t.name} className="bg-card rounded-lg p-5 border border-border/60">
              <p className="text-sm text-foreground mb-3 leading-relaxed">"{t.quote}"</p>
              <p className="text-xs text-muted-foreground">— {t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Chalk</span>
          <p className="text-xs text-muted-foreground">
            Every student deserves a great teacher.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
