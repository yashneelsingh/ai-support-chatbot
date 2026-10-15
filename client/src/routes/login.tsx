import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Helix" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const data = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
      });
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Logged in successfully");
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err.message || "Login failed");
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

      <div className="helix-auth-layout">
        <section className="helix-auth-story">
          <span className="synapse-kicker">WELCOME BACK</span>
          <h1>Where better support<br /><i>takes shape.</i></h1>
          <p>Return to the intelligence layer behind every conversation, resolution, and customer insight.</p>
          <div className="helix-auth-proof">
            <span className="helix-proof-icon"><ShieldCheck size={19} /></span>
            <div><strong>Protected by design</strong><small>Encrypted sessions · Secure workspace access</small></div>
          </div>
          <div className="helix-auth-quote">
            <p>“Helix gives our team the context to move faster without losing the human touch.”</p>
            <span>— Support Operations, Northstar</span>
          </div>
        </section>

        <section className="helix-auth-card">
          <div className="helix-auth-card-glow" aria-hidden="true" />
          <div className="helix-auth-card-heading">
            <span>SECURE ACCESS</span>
            <h2>Sign in to Helix</h2>
            <p>Continue to your support workspace.</p>
          </div>
          <form onSubmit={onSubmit} className="helix-auth-form">
            <label htmlFor="email">Email address</label>
            <div className="helix-auth-input">
              <Mail size={16} />
              <input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
            </div>

            <div className="helix-auth-label-row">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
            <div className="helix-auth-input">
              <Lock size={16} />
              <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button className="helix-auth-submit" type="submit" disabled={loading}>
              <span>{loading ? "Signing in…" : "Sign in"}</span><ArrowRight size={16} />
            </button>
          </form>
          <div className="helix-auth-divider"><span>NEW TO HELIX?</span></div>
          <Link to="/register" className="helix-auth-secondary">Create your account <ArrowRight size={15} /></Link>
          <p className="helix-auth-legal"><Check size={11} /> By continuing, you agree to our Terms and Privacy Policy.</p>
        </section>
      </div>
    </main>
  );
}
