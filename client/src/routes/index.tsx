import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Bot, Check, ChevronRight, Cpu, DatabaseZap,
  GitBranch, Menu, MousePointer2, Orbit, PackageCheck, RotateCcw, Sparkles, User, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { TubesBackground } from "@/components/tubes-background";

export const Route = createFileRoute("/")({ component: Landing });

const metrics = [
  ["RESOLUTION RATE", "94.8%", "violet"],
  ["RESPONSE TIME", "1.4 SEC", "cyan"],
  ["CONVERSATIONS", "28.4K", "white"],
  ["UPTIME", "99.99%", "emerald"],
  ["CSAT SCORE", "4.9 / 5", "violet"],
];

const features = [
  {
    icon: Cpu, eyebrow: "01 / INTELLIGENCE", title: "Answers with depth.",
    description: "Helix reasons across your entire knowledge base to deliver responses that are precise, contextual, and unmistakably yours.",
    color: "violet",
  },
  {
    icon: GitBranch, eyebrow: "02 / ORCHESTRATION", title: "Every path, resolved.",
    description: "Design intelligent flows that know when to answer, when to act, and when to bring in the right person—with full context attached.",
    color: "cyan",
  },
  {
    icon: DatabaseZap, eyebrow: "03 / INSIGHT", title: "Signal over noise.",
    description: "Turn every conversation into structured intelligence. Spot emerging friction, measure impact, and improve continuously.",
    color: "emerald",
  },
];

function Logo() {
  return (
    <Link to="/" className="synapse-logo" aria-label="Helix home">
      <span className="synapse-logo-mark" aria-hidden="true"><span /></span>
      <span>Helix</span>
    </Link>
  );
}

function Navigation() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="synapse-nav" aria-label="Main navigation">
      <Logo />
      <div className="synapse-nav-links">
        <a href="#platform">Platform</a>
        <a href="#intelligence">Intelligence</a>
        <a href="#developers">Developers</a>
      </div>
      <div className="synapse-nav-auth">
        <Link to="/login" className="synapse-sign-in">Sign in</Link>
        <Link to="/register" className="synapse-nav-cta">Create account <ArrowRight size={13} /></Link>
      </div>
      <button type="button" className="synapse-menu-button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      {open && (
        <div className="synapse-mobile-menu">
          <a href="#platform" onClick={() => setOpen(false)}>Platform</a>
          <a href="#intelligence" onClick={() => setOpen(false)}>Intelligence</a>
          <a href="#developers" onClick={() => setOpen(false)}>Developers</a>
          <Link to="/login">Sign in <ArrowRight size={14} /></Link>
          <Link to="/register">Create account <ArrowRight size={14} /></Link>
        </div>
      )}
    </nav>
  );
}

function ShinyButton() {
  return <Link to="/chat" className="synapse-shiny-button"><span>Enter the interface <ArrowRight size={17} /></span></Link>;
}

function MetricsTicker() {
  const tickerItems = [...metrics, ...metrics];
  return (
    <section className="synapse-ticker" aria-label="Platform metrics">
      <div className="synapse-ticker-track">
        {tickerItems.map(([label, value, color], index) => (
          <div className="synapse-metric" key={`${label}-${index}`} aria-hidden={index >= metrics.length}>
            <span className="synapse-metric-label">{label}</span>
            <span className={`synapse-metric-value ${color}`}>{value}</span>
            <span className="synapse-metric-divider" />
          </div>
        ))}
      </div>
    </section>
  );
}

function DemoChat() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const delays = [900, 1200, 2100, 1200, 2200, 1500, 4200];
    const timer = window.setTimeout(
      () => setStep((current) => (current >= 6 ? 0 : current + 1)),
      delays[step],
    );
    return () => window.clearTimeout(timer);
  }, [step]);

  return (
    <div className="synapse-demo-window">
      <div className="synapse-demo-toolbar">
        <div className="synapse-demo-agent">
          <span className="synapse-demo-avatar"><Bot size={16} /><span /></span>
          <div><strong>Helix Support</strong><small>Online · replies instantly</small></div>
        </div>
        <button type="button" onClick={() => setStep(0)} aria-label="Replay conversation">
          <RotateCcw size={14} /> Replay
        </button>
      </div>

      <div className="synapse-demo-body" aria-live="polite">
        {step >= 0 && (
          <div className="synapse-chat-row customer">
            <div className="synapse-chat-avatar"><User size={13} /></div>
            <div><span className="synapse-chat-name">Maya · 10:42 AM</span><div className="synapse-chat-bubble">My order was due yesterday. Can you check #1042?</div></div>
          </div>
        )}
        {step === 1 && <div className="synapse-typing"><span /><span /><span /><small>Helix is reasoning</small></div>}
        {step >= 2 && (
          <div className="synapse-chat-row agent">
            <div className="synapse-chat-avatar"><Bot size={13} /></div>
            <div><span className="synapse-chat-name">Helix · 10:42 AM</span><div className="synapse-chat-bubble">I found it. Your package reached the local courier this morning and is scheduled for delivery by 6 PM.</div></div>
          </div>
        )}
        {step >= 3 && (
          <div className="synapse-chat-row customer second">
            <div className="synapse-chat-avatar"><User size={13} /></div>
            <div><span className="synapse-chat-name">Maya · 10:43 AM</span><div className="synapse-chat-bubble">Perfect—can you send me the tracking link?</div></div>
          </div>
        )}
        {step === 4 && <div className="synapse-typing lower"><span /><span /><span /><small>Calling order API</small></div>}
        {step >= 5 && (
          <div className="synapse-chat-row agent final">
            <div className="synapse-chat-avatar"><Bot size={13} /></div>
            <div className="synapse-order-card">
              <span className="synapse-order-icon"><PackageCheck size={18} /></span>
              <div><small>ORDER #1042</small><strong>Out for delivery</strong><span>Arriving today by 6 PM</span></div>
              <ArrowRight size={15} />
            </div>
          </div>
        )}
      </div>

      <div className="synapse-demo-status">
        <span><span className="status-dot" /> LIVE DEMO</span>
        <div className="synapse-demo-progress" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((item) => <span className={item <= step ? "active" : ""} key={item} />)}
        </div>
        <span>{step >= 6 ? "RESOLVED" : "34MS"}</span>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="synapse-page">
      <Navigation />
      <main>
        <TubesBackground className="helix-landing-tubes">
        <section className="synapse-hero">
          <div className="synapse-ambient violet-orb" aria-hidden="true" />
          <div className="synapse-ambient cyan-orb" aria-hidden="true" />
          <div className="synapse-orbit-mark orbit-one" aria-hidden="true"><Orbit /></div>
          <div className="synapse-orbit-mark orbit-two" aria-hidden="true"><Sparkles /></div>
          <div className="synapse-eyebrow synapse-reveal delay-1"><span className="pulse-dot" /> The intelligence layer for customer experience</div>
          <h1 className="synapse-reveal delay-2">Support, evolved<br /><span>beyond answers.</span></h1>
          <p className="synapse-hero-copy synapse-reveal delay-3">Helix turns every customer conversation into a moment of understanding—reasoning across your knowledge, acting with precision, and learning without pause.</p>
          <div className="synapse-hero-actions synapse-reveal delay-4">
            <ShinyButton />
            <a href="#platform" className="synapse-text-link">See how it works <ChevronRight size={15} /></a>
          </div>
          <div className="synapse-scroll-cue" aria-hidden="true"><span /></div>
          <div className="synapse-tubes-hint" aria-hidden="true">
            <MousePointer2 size={13} />
            <span>Move to explore · Click to shift color</span>
          </div>
        </section>
        </TubesBackground>

        <MetricsTicker />

        <section className="synapse-section" id="platform">
          <div className="synapse-section-heading">
            <div><span className="synapse-kicker">THE PLATFORM</span><h2>Built to understand.<br /><i>Designed to act.</i></h2></div>
            <p>A single intelligence layer that connects your knowledge, conversations, and team—so every interaction gets smarter than the last.</p>
          </div>
          <div className="synapse-feature-grid" id="intelligence">
            {features.map(({ icon: Icon, eyebrow, title, description, color }) => (
              <article className={`synapse-feature-card ${color}`} key={title}>
                <div className="synapse-card-topline"><span>{eyebrow}</span><ArrowRight size={15} /></div>
                <div className="synapse-feature-icon"><Icon size={23} /></div>
                <h3>{title}</h3><p>{description}</p>
                <div className="synapse-card-visual" aria-hidden="true"><span /><span /><span /><span /></div>
              </article>
            ))}
          </div>
        </section>

        <section className="synapse-developer-section" id="developers">
          <div className="synapse-developer-copy">
            <span className="synapse-kicker">FOR DEVELOPERS</span>
            <h2>One interface.<br /><i>Infinite potential.</i></h2>
            <p>From first import to production in minutes. A typed SDK, clean primitives, and an infrastructure layer engineered to disappear.</p>
            <ul>
              <li><Check size={14} /> Ship with five lines of code</li>
              <li><Check size={14} /> Framework-agnostic by design</li>
              <li><Check size={14} /> Observability built into every call</li>
            </ul>
            <a href="#docs">Read the documentation <ArrowRight size={15} /></a>
          </div>
          <DemoChat />
        </section>

        <section className="synapse-cta-section">
          <div className="synapse-cta-orb" aria-hidden="true" />
          <span className="synapse-kicker">READY WHEN YOU ARE</span>
          <h2>Your next conversation<br />starts <i>here.</i></h2>
          <p>Build an AI support experience your customers will remember.</p>
          <ShinyButton />
        </section>
      </main>

      <footer className="synapse-footer">
        <div className="synapse-footer-main">
          <div className="synapse-footer-brand"><Logo /><p>Intelligence for every conversation.</p></div>
          <div className="synapse-footer-links">
            <div><span>PRODUCT</span><a href="#platform">Platform</a><a href="#intelligence">Intelligence</a><a href="#developers">Developers</a></div>
            <div><span>COMPANY</span><a href="#about">About</a><a href="#careers">Careers</a><a href="#contact">Contact</a></div>
            <div><span>CONNECT</span><a href="#x">X / Twitter</a><a href="#github">GitHub</a><a href="#linkedin">LinkedIn</a></div>
          </div>
        </div>
        <div className="synapse-footer-bottom">
          <span>© 2026 Helix Systems, Inc.</span>
          <span className="synapse-system-status"><span /> All systems operational</span>
          <div><a href="#privacy">Privacy</a><a href="#terms">Terms</a></div>
        </div>
      </footer>
    </div>
  );
}
