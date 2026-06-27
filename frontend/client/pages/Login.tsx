import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { authApi } from "@/services/api/auth";
import { dashboardPathForRole } from "@/routes/paths";
import { useAuth } from "@/context/AuthContext";

const imageUrl = "https://images.pexels.com/photos/8942991/pexels-photo-8942991.jpeg?auto=compress&cs=tinysrgb&w=1400";

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { role: "Citizen", email: "citizen@demo.com", password: "demo123", note: "Send alerts and track help" },
    { role: "Responder", email: "responder@demo.com", password: "demo123", note: "Accept calls and share progress" },
    { role: "Dispatcher", email: "dispatcher@demo.com", password: "demo123", note: "View map and assign teams" },
    { role: "Admin", email: "admin@demo.com", password: "demo123", note: "Review people and activity" },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const auth = await authApi.login({ email, password });
      setAuth(auth);
      navigate(dashboardPathForRole(auth.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not sign you in. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 lg:block">
        <img src={imageUrl} alt="Responder preparing to help" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to="/" className="inline-flex w-fit items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
          <div className="max-w-xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-red-600">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h1 className="text-5xl font-bold leading-tight">Welcome back to SafeCommunityAI</h1>
            <p className="mt-5 text-lg leading-8 text-slate-100">Sign in to continue helping your community respond quickly and safely.</p>
            <div className="mt-8 grid gap-3">
              {["Live emergency map", "Clear role dashboards", "Fast phone alerts"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <Link to="/" className="mb-6 inline-flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-600 text-white">
                <AlertCircle className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-slate-950">SafeCommunityAI</span>
            </Link>
            <h2 className="text-3xl font-bold text-slate-950">Sign in</h2>
            <p className="mt-2 text-slate-600">Choose a demo role below or use your own account.</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <form onSubmit={handleLogin} className="space-y-5">
              <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-900">Password</label>
                <div className="relative mt-2">
                  <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-500 transition hover:text-slate-800" aria-label="Show or hide password">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              ) : null}

              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
                <ShieldCheck className="h-4 w-4" />
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-bold text-slate-950">Try a demo role</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {demoAccounts.map((account) => (
                <button key={account.role} onClick={() => fillDemo(account.email, account.password)} className="rounded-lg border border-slate-200 p-3 text-left transition hover:border-red-300 hover:bg-red-50">
                  <div className="font-semibold text-slate-950">{account.role}</div>
                  <div className="mt-1 text-xs text-slate-500">{account.note}</div>
                </button>
              ))}
            </div>
          </section>

          <div className="mt-6 text-center text-sm text-slate-600">
            <p>New here? <Link to="/register" className="font-semibold text-red-600 hover:text-red-700">Create an account</Link></p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type, placeholder }: { label: string; value: string; onChange: (value: string) => void; type: string; placeholder: string }) {
  return (
    <label className="block text-sm font-semibold text-slate-900">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100" required />
    </label>
  );
}
