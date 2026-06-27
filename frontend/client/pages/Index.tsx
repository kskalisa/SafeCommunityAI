import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Ambulance,
  BarChart3,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock,
  HeartPulse,
  LocateFixed,
  MapPin,
  RadioTower,
  Shield,
  Smartphone,
  Users,
} from "lucide-react";

const heroImage = "https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg?auto=compress&cs=tinysrgb&w=1800";
const responderImage = "https://images.pexels.com/photos/8942991/pexels-photo-8942991.jpeg?auto=compress&cs=tinysrgb&w=1400";
const operationsImage = "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1400";

const roles = [
  {
    id: "citizens",
    label: "Citizens",
    title: "One tap to ask for help",
    body: "People can send an emergency alert with their current location, follow what is happening, and keep important safety contacts close by.",
    points: ["Share location", "Track help", "Safety contacts"],
    icon: Smartphone,
  },
  {
    id: "responders",
    label: "Responders",
    title: "Clear directions for the people on the way",
    body: "Response teams can see where they are needed, follow the route, and update everyone as they move from assigned to on scene.",
    points: ["New calls", "Route view", "Status updates"],
    icon: Ambulance,
  },
  {
    id: "dispatchers",
    label: "Dispatchers",
    title: "A clear view of what needs attention",
    body: "Dispatchers can see open emergencies, people sharing location, available teams, and the next best action from one simple workspace.",
    points: ["Urgent cases", "Live map", "Team availability"],
    icon: RadioTower,
  },
  {
    id: "admins",
    label: "Admins",
    title: "Simple oversight without slowing teams down",
    body: "Leaders can review people, activity, and service health so the community response keeps improving over time.",
    points: ["People", "Activity", "Reports"],
    icon: Shield,
  },
];

const modules = [
  { title: "Emergency Alert", desc: "A person can ask for help and share their location in seconds.", icon: LocateFixed },
  { title: "Live Map", desc: "Dispatchers and responders can see where help is needed right now.", icon: MapPin },
  { title: "Responder Routes", desc: "Teams can open directions and head straight to the emergency location.", icon: Ambulance },
  { title: "Urgent Case Queue", desc: "The most serious situations are easier to spot and act on first.", icon: AlertCircle },
  { title: "Role Dashboards", desc: "Citizens, responders, dispatchers, and admins each get the tools they need.", icon: Users },
  { title: "Activity History", desc: "Important actions are kept so teams can review what happened later.", icon: Shield },
];

const metrics = [
  { label: "Send help fast", value: "SOS" },
  { label: "Phone location", value: "Live" },
  { label: "User roles", value: "4" },
  { label: "Map updates", value: "Often" },
];

export default function Index() {
  const [activeRole, setActiveRole] = useState(roles[0]);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <nav className="fixed top-0 z-50 w-full border-b border-white/20 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-red-600">
              <AlertCircle className="h-6 w-6" />
            </span>
            <span className="text-xl font-bold text-white">SafeCommunityAI</span>
          </a>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#platform" className="text-sm font-medium text-slate-200 transition hover:text-white">How it helps</a>
            <a href="#roles" className="text-sm font-medium text-slate-200 transition hover:text-white">Who uses it</a>
            <a href="#operations" className="text-sm font-medium text-slate-200 transition hover:text-white">In action</a>
          </div>
          <Link to="/login" className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
            Sign in
          </Link>
        </div>
      </nav>

      <header id="top" className="relative min-h-[92vh] overflow-hidden bg-slate-950">
        <img src={heroImage} alt="Emergency medical team ready to help" className="absolute inset-0 h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-4 pb-12 pt-28 sm:px-6 lg:px-8">
          <div className="max-w-3xl pb-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
              <BellRing className="h-4 w-4 text-red-300" />
              Help reaches the right people faster
            </div>
            <h1 className="text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
              SafeCommunityAI
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-100 sm:text-xl">
              A friendly emergency response app that helps people call for help, share their location, and keep responders and dispatchers on the same page.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700">
                Open your dashboard <ChevronRight className="h-4 w-4" />
              </Link>
              <a href="#platform" className="inline-flex items-center justify-center rounded-lg border border-white/60 px-6 py-3 font-semibold text-white transition hover:bg-white hover:text-slate-950">
                See how it works
              </a>
            </div>
          </div>
          <div className="grid gap-3 border-t border-white/20 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur">
                <p className="text-2xl font-bold text-white">{metric.value}</p>
                <p className="mt-1 text-sm text-slate-200">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main>
        <section id="platform" className="border-b border-slate-200 bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-wide text-red-600">How it helps</p>
              <h2 className="mt-3 text-4xl font-bold text-slate-950">Made for the moments when every second matters</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                SafeCommunityAI keeps the steps simple: ask for help, share the location, send the right team, and keep everyone updated.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((item) => (
                <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md">
                  <item.icon className="h-8 w-8 text-red-600" />
                  <h3 className="mt-5 text-lg font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="roles" className="bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-red-600">Who uses it</p>
              <h2 className="mt-3 text-4xl font-bold text-slate-950">A clear experience for every person involved</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                People in the community, response teams, dispatchers, and leaders each see what matters to them.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setActiveRole(role)}
                    className={`rounded-lg border p-4 text-left transition ${activeRole.id === role.id ? "border-red-600 bg-white shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <role.icon className={`h-5 w-5 ${activeRole.id === role.id ? "text-red-600" : "text-slate-500"}`} />
                    <span className="mt-3 block font-semibold text-slate-950">{role.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <img src={responderImage} alt="Responder preparing to help in the field" className="h-72 w-full object-cover" />
              <div className="p-6 lg:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <activeRole.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-950">{activeRole.title}</h3>
                    <p className="mt-3 leading-7 text-slate-600">{activeRole.body}</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {activeRole.points.map((point) => (
                    <div key={point} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="operations" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <img src={operationsImage} alt="Team coordinating response work" className="h-64 w-full object-cover" />
              <div className="border-t border-slate-200 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-950">Live response view</p>
                    <p className="text-sm text-slate-500">Open emergencies and shared locations</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Ready</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Medical help needed", detail: "Nearest team is being notified", tone: "bg-red-600" },
                    { label: "Ambulance on the way", detail: "Location is being shared", tone: "bg-emerald-600" },
                    { label: "Road accident reported", detail: "Waiting for dispatcher review", tone: "bg-amber-500" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                      <span className={`h-3 w-3 rounded-full ${item.tone}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-950">{item.label}</p>
                        <p className="text-sm text-slate-500">{item.detail}</p>
                      </div>
                      <Clock className="h-4 w-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-red-600">In action</p>
              <h2 className="mt-3 text-4xl font-bold text-slate-950">Calm screens for stressful moments</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Clean layouts, clear buttons, readable status colors, and live location sharing help people act quickly without guessing.
              </p>
              <div className="mt-8 space-y-5">
                {[
                  { title: "A person asks for help", body: "The SOS button shares their location and creates an emergency report.", icon: HeartPulse },
                  { title: "Dispatch sees what happened", body: "The live map shows the open emergency and any shared location updates.", icon: RadioTower },
                  { title: "A responder heads out", body: "The assigned team can open directions and update their progress.", icon: MapPin },
                  { title: "Leaders can review later", body: "Important activity is saved so the service can learn and improve.", icon: BarChart3 },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-950">{item.title}</h3>
                      <p className="mt-1 leading-7 text-slate-600">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-950 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-bold text-white">Ready to try it?</h2>
              <p className="mt-2 max-w-2xl text-slate-300">Sign in and explore how a request for help moves from a citizen to dispatch and responders.</p>
            </div>
            <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700">
              Go to sign in <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 border-t border-slate-200 pt-8 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-slate-950">SafeCommunityAI</p>
              <p className="text-sm text-slate-500">Helping communities respond with care.</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">2026 SafeCommunityAI. Built for safer communities.</p>
        </div>
      </footer>
    </div>
  );
}
