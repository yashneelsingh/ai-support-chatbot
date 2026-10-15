import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — Helix" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const email = new FormData(event.currentTarget).get("email");
    try {
      const data = await fetchApi("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (data.delivery === "screen" && data.resetToken) {
        navigate({ to: "/reset-password", search: { token: data.resetToken } });
        return;
      }
      setSubmitted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request a reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="helix-auth-page helix-recovery-page">
      <div className="helix-auth-grid" aria-hidden="true" />
      <div className="helix-auth-orb violet" aria-hidden="true" />
      <div className="helix-auth-orb cyan" aria-hidden="true" />
      <header className="helix-auth-header">
        <Link to="/" className="synapse-logo"><span className="synapse-logo-mark"><span /></span><span>Helix</span></Link>
        <Link to="/login" className="helix-back-link"><ArrowLeft size={14} /> Back to sign in</Link>
      </header>
      <div className="helix-recovery-layout">
        <section className="helix-auth-card helix-recovery-card">
          <div className="helix-auth-card-glow" />
          <div className="helix-recovery-icon">{submitted ? <CheckCircle2 size={21} /> : <Mail size={21} />}</div>
          <div className="helix-auth-card-heading">
            <span>{submitted ? "REQUEST RECEIVED" : "ACCOUNT RECOVERY"}</span>
            <h2>{submitted ? "Check your inbox" : "Find your way back."}</h2>
            <p>{submitted ? "If an account matches that email, your secure reset link is on its way." : "Enter the email connected to your Helix workspace."}</p>
          </div>
          {!submitted ? (
            <form onSubmit={onSubmit} className="helix-auth-form">
              <label htmlFor="email">Email address</label>
              <div className="helix-auth-input"><Mail size={16} /><input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required autoFocus /></div>
              <button className="helix-auth-submit" type="submit" disabled={loading}><span>{loading ? "Checking…" : "Continue"}</span><ArrowRight size={16} /></button>
            </form>
          ) : (
            <button className="helix-auth-secondary helix-reset-button" type="button" onClick={() => setSubmitted(false)}>Try another email</button>
          )}
          <div className="helix-recovery-note"><ShieldCheck size={14} /><span>For security, reset links expire after 30 minutes.</span></div>
        </section>
      </div>
    </main>
  );
}
