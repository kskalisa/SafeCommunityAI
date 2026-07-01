import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, HeartHandshake, RadioTower, Smartphone, Truck } from "lucide-react";
import { authApi } from "@/services/api/auth";
import type { Role } from "@/types/api";

const imageUrl = "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1400";

const roleOptions: Array<{ role: Role; label: string; description: string; icon: typeof Smartphone }> = [
  { role: "CITIZEN", label: "Citizen", description: "Ask for help and follow updates.", icon: Smartphone },
  { role: "RESPONDER", label: "Responder", description: "Receive calls and update progress.", icon: Truck },
  { role: "DISPATCHER", label: "Dispatcher", description: "Coordinate incidents and teams.", icon: RadioTower },
];

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("CITIZEN");
  const [showPassword, setShowPassword] = useState(false);
  const [locationConsent, setLocationConsent] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "", organization: "", certificationLicense: "", vehicleNumber: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const activeRole = useMemo(() => roleOptions.find((option) => option.role === role) ?? roleOptions[0], [role]);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.register({ ...form, role, locationPrivacyConsent: locationConsent });
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not create your account. Please check the form and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 lg:block">
        <img src={imageUrl} alt="Community response team planning together" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to="/" className="inline-flex w-fit items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
          <div className="max-w-xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-red-600">
              <HeartHandshake className="h-7 w-7" />
            </div>
            <h1 className="text-5xl font-bold leading-tight">Join the response network</h1>
            <p className="mt-5 text-lg leading-8 text-slate-100">Create a verified account for the role you play in keeping the community safe.</p>
            <div className="mt-8 grid gap-3">
              {["Role-based access", "Location sharing with consent", "Email OTP sign-in"].map((item) => (
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
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center lg:text-left">
            <Link to="/" className="mb-6 inline-flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-600 text-white">
                <AlertCircle className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-slate-950">SafeCommunity</span>
            </Link>
            <h2 className="text-3xl font-bold text-slate-950">Create your account</h2>
            <p className="mt-2 text-slate-600">Set up your profile so SafeCommunity can open the right workspace for you.</p>
          </div>

          <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-6">
              <p className="mb-3 text-sm font-bold text-slate-950">Account role</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {roleOptions.map((option) => (
                  <button key={option.role} type="button" onClick={() => setRole(option.role)} className={`rounded-lg border p-4 text-left transition ${role === option.role ? "border-red-600 bg-red-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                    <option.icon className={`h-5 w-5 ${role === option.role ? "text-red-600" : "text-slate-500"}`} />
                    <span className="mt-3 block font-semibold text-slate-950">{option.label}</span>
                    <span className="mt-1 block text-sm text-slate-500">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 rounded-lg bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <activeRole.icon className="h-5 w-5 text-red-600" />
                <p className="font-semibold text-slate-950">Creating a {activeRole.label} account</p>
              </div>
              <p className="mt-1 text-sm text-slate-600">{activeRole.description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" value={form.fullName} onChange={(value) => update("fullName", value)} placeholder="Your legal name" />
              <Field label="Phone number" value={form.phone} onChange={(value) => update("phone", value)} placeholder="+250..." required={false} />
              <Field label="Email address" type="email" value={form.email} onChange={(value) => update("email", value)} placeholder="you@example.com" />
              <PasswordField value={form.password} onChange={(value) => update("password", value)} show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
            </div>

            {role === "RESPONDER" ? (
              <div className="mt-6 rounded-lg border border-slate-200 p-4">
                <p className="mb-4 font-semibold text-slate-950">Responder credentials</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Team or organization" value={form.organization} onChange={(value) => update("organization", value)} placeholder="Optional" required={false} />
                  <Field label="Certification" value={form.certificationLicense} onChange={(value) => update("certificationLicense", value)} placeholder="Optional" required={false} />
                  <Field label="Vehicle number" value={form.vehicleNumber} onChange={(value) => update("vehicleNumber", value)} placeholder="Optional" required={false} />
                </div>
              </div>
            ) : null}

            <label className="mt-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <input type="checkbox" checked={locationConsent} onChange={(event) => setLocationConsent(event.target.checked)} className="mt-1 h-4 w-4 rounded border-emerald-300 text-red-600 focus:ring-red-500" required />
              <span>I consent to location sharing when I actively use emergency response features that require live location.</span>
            </label>

            {error ? <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

            <button disabled={loading} className="mt-6 w-full rounded-lg bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
              {loading ? "Creating your account..." : "Create secure account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">Already have an account? <Link to="/login" className="font-semibold text-red-600 hover:text-red-700">Sign in</Link></p>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required = true }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder: string; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-slate-900">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100" required={required} />
    </label>
  );
}

function PasswordField({ value, onChange, show, onToggle }: { value: string; onChange: (value: string) => void; show: boolean; onToggle: () => void }) {
  return (
    <div>
      <label htmlFor="register-password" className="block text-sm font-semibold text-slate-900">Password</label>
      <div className="relative mt-2">
        <input id="register-password" type={show ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Create a password" minLength={6} className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100" required />
        <button type="button" onClick={onToggle} className="absolute right-3 top-3 text-slate-500 transition hover:text-slate-800" aria-label="Show or hide password">
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
