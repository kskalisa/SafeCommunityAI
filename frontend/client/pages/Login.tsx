import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
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
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const challenge = await authApi.login({ email, password });
      setOtpSent(challenge.otpRequired);
      setOtpMessage(challenge.message);
      setOtpCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const auth = await authApi.verifyOtp({ email, otpCode });
      setAuth(auth);
      navigate(dashboardPathForRole(auth.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The OTP is invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  const editCredentials = () => {
    setOtpSent(false);
    setOtpCode("");
    setOtpMessage("");
    setError("");
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
            <h1 className="text-5xl font-bold leading-tight">Welcome back to SafeCommunity</h1>
            <p className="mt-5 text-lg leading-8 text-slate-100">Sign in securely to coordinate reports, resources, and emergency response work.</p>
            <div className="mt-8 grid gap-3">
              {["Protected role dashboards", "Email one-time password", "Audited emergency activity"].map((item) => (
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
              <span className="text-2xl font-bold text-slate-950">SafeCommunity</span>
            </Link>
            <h2 className="text-3xl font-bold text-slate-950">{otpSent ? "Enter OTP" : "Sign in"}</h2>
            <p className="mt-2 text-slate-600">
              {otpSent ? `We sent a one-time password to ${email}.` : "Use your account credentials to receive a one-time password by email."}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
            {!otpSent ? (
              <form onSubmit={requestOtp} className="space-y-5">
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

                {error ? <ErrorMessage message={error} /> : null}

                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
                  <Mail className="h-4 w-4" />
                  {loading ? "Checking credentials..." : "Continue"}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-5">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{otpMessage}</div>

                <div>
                  <label htmlFor="otp-code" className="block text-sm font-semibold text-slate-900">One-time password</label>
                  <div className="relative mt-2">
                    <input id="otp-code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit OTP" className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 tracking-[0.25em] outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100" required />
                    <KeyRound className="absolute right-3 top-3 h-5 w-5 text-slate-500" />
                  </div>
                </div>

                {error ? <ErrorMessage message={error} /> : null}

                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
                  <ShieldCheck className="h-4 w-4" />
                  {loading ? "Verifying OTP..." : "Verify and sign in"}
                </button>
                <button type="button" onClick={editCredentials} className="w-full rounded-lg border border-slate-300 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">
                  Use a different email
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 text-center text-sm text-slate-600">
            <p>New here? <Link to="/register" className="font-semibold text-red-600 hover:text-red-700">Create an account</Link></p>
          </div>
        </div>
      </main>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
      <p className="text-sm text-red-700">{message}</p>
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
