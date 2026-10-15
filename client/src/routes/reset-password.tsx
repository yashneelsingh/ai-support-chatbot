import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({ token: typeof search.token === "string" ? search.token : "" }),
  head: () => ({ meta: [{ title: "Choose a new password — Helix" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const invalidLink = !/^[a-f0-9]{64}$/i.test(token);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    if (password !== String(formData.get("confirmation") || "")) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const data = await fetchApi("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
      toast.success(data.message || "Password reset successfully");
      navigate({ to: "/login" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset password");
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
          <div className="helix-recovery-icon"><LockKeyhole size={21} /></div>
          <div className="helix-auth-card-heading">
            <span>SECURE RESET</span>
            <h2>{invalidLink ? "Link unavailable." : "Choose a new password."}</h2>
            <p>{invalidLink ? "This reset link is incomplete or no longer valid." : "Create a strong password for your Helix workspace."}</p>
          </div>
          {invalidLink ? (
            <Link to="/forgot-password" className="helix-auth-submit"><span>Request a new link</span><ArrowRight size={16} /></Link>
          ) : (
            <form onSubmit={onSubmit} className="helix-auth-form">
              <label htmlFor="password">New password</label>
              <div className="helix-auth-input"><LockKeyhole size={16} /><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="8+ characters" minLength={8} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}" required autoFocus /><button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
              <label htmlFor="confirmation">Confirm new password</label>
              <div className="helix-auth-input"><LockKeyhole size={16} /><input id="confirmation" name="confirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Repeat your password" required /></div>
              <p className="helix-password-hint">Use uppercase, lowercase, and at least one number.</p>
              <button className="helix-auth-submit" type="submit" disabled={loading}><span>{loading ? "Updating…" : "Update password"}</span><ArrowRight size={16} /></button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
