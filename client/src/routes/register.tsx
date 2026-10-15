import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Lock, Mail, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — Helix" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: formData.get("name"), email: formData.get("email"), password: formData.get("password") }),
      });
      toast.success("Account created! Please sign in.");
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="helix-auth-page">
      <div className="helix-auth-grid" aria-hidden="true" />
      <div className="helix-auth-orb violet" aria-hidden="true" />
      <div className="helix-auth-orb cyan" aria-hidden="true" />

      <header className="helix-auth-header">
        <Link to="/" className="synapse-logo" aria-label="Helix home">
          <span className="synapse-logo-mark" aria-hidden="true"><span /></span><span>Helix</span>
        </Link>
        <Link to="/" className="helix-back-link"><ArrowLeft size={14} /> Back to site</Link>
      </header>

      <div className="helix-auth-layout register">
        <section className="helix-auth-story">
          <span className="synapse-kicker">BEGIN WITH HELIX</span>
          <h1>Give every answer<br /><i>an advantage.</i></h1>
          <p>Connect your knowledge, deploy your AI support agent, and start learning from every conversation.</p>
          <div className="helix-benefit-list">
            <div><span><Check size={13} /></span><p><strong>Grounded intelligence</strong><small>Answers drawn from your trusted knowledge.</small></p></div>
            <div><span><Check size={13} /></span><p><strong>Context-rich handoffs</strong><small>Your team always knows what happened.</small></p></div>
            <div><span><Check size={13} /></span><p><strong>Built-in insight</strong><small>See friction before it becomes a trend.</small></p></div>
          </div>
        </section>

        <section className="helix-auth-card">
          <div className="helix-auth-card-glow" aria-hidden="true" />
          <div className="helix-auth-card-heading">
            <span><Sparkles size={11} /> START IN MINUTES</span>
            <h2>Create your account</h2>
            <p>Your intelligent support workspace awaits.</p>
          </div>
          <form onSubmit={onSubmit} className="helix-auth-form">
            <label htmlFor="name">Full name</label>
            <div className="helix-auth-input">
              <User size={16} />
              <input id="name" name="name" autoComplete="name" placeholder="Ada Lovelace" maxLength={100} required />
            </div>

            <label htmlFor="email">Work email</label>
            <div className="helix-auth-input">
              <Mail size={16} />
              <input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
            </div>

            <label htmlFor="password">Password</label>
            <div className="helix-auth-input">
              <Lock size={16} />
              <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="8+ characters" minLength={8} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}" title="Use at least 8 characters with uppercase, lowercase, and a number" required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="helix-password-hint">Use uppercase, lowercase, and at least one number.</p>

            <button className="helix-auth-submit" type="submit" disabled={loading}>
              <span>{loading ? "Creating account…" : "Create account"}</span><ArrowRight size={16} />
            </button>
          </form>
          <p className="helix-auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </section>
      </div>
    </main>
  );
}
