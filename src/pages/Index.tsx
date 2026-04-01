import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import MrWhite from "../components/MrWhite";

const subjects = [
  "Algebra", "Calculus", "Physics", "Chemistry", "Biology",
  "Statistics", "History", "Economics", "Coding", "English Lit",
];

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="inline-block text-[11px] font-medium tracking-[0.2em] uppercase text-primary mb-4">
          MEET MR. WHITE
        </span>
        <h1 className="text-[46px] leading-[1.15] font-light text-foreground mb-5">
          Your personal AI professor.
        </h1>
        <p className="text-muted-foreground max-w-[540px] mx-auto text-base leading-relaxed">
          Ask Mr. White any question and watch him draw out the answer — or import your class
          slides and let him guide you through every concept, one at a time.
        </p>
        <Link
          to="/ask"
          className="inline-flex items-center justify-center mt-6 px-6 py-3 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Ask Mr. White anything
        </Link>
      </section>

      {/* Mr. White greeting */}
      <div className="flex justify-center mb-10">
        <MrWhite state="excited" size={160} />
      </div>

      {/* Two Mode Cards */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-5">
          {/* Ask Card */}
          <div className="bg-card rounded-xl p-8 border border-border/60 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Ask Mr. White</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Type or speak any question. Mr. White draws the answer on his whiteboard in real time.
            </p>
            <Link
              to="/ask"
              className="inline-flex items-center justify-center w-full px-5 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Ask a question
            </Link>
          </div>

          {/* Slides Card */}
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
              Upload your class slides and Mr. White walks you through every concept — drawing, explaining, and quizzing you.
            </p>
            <Link
              to="/slides"
              className="inline-flex items-center justify-center w-full px-5 py-2.5 text-sm rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors"
            >
              Upload slides
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Free to start · No signup required · Works for any subject
        </p>
      </section>

      {/* Subject Chips */}
      <section id="subjects" className="max-w-3xl mx-auto px-6 pb-16">
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

      {/* How It Works */}
      <section id="how-it-works" className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-light text-foreground text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-sm font-medium text-primary mb-4 uppercase tracking-wider">Ask Anything</h3>
            <ol className="space-y-4 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                Type or speak your question
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                Mr. White draws the answer on his whiteboard
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                Ask follow-ups, go deeper, get quizzed
              </li>
            </ol>
          </div>
          <div>
            <h3 className="text-sm font-medium text-primary mb-4 uppercase tracking-wider">Import Slides</h3>
            <ol className="space-y-4 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                Upload your PDF or PowerPoint
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                Mr. White reads your slides
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                He guides you through — highlight anything to ask about it
              </li>
            </ol>
          </div>
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
          <div className="flex items-center gap-2">
            <MrWhite state="idle" size={20} />
            <span className="text-sm text-muted-foreground">Chalk</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Every student deserves a great teacher.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
