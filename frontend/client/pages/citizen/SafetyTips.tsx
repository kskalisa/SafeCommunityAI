import { AlertCircle, Heart, Shield, Phone, MapPin, Zap, CheckCircle2, Home, BatteryCharging } from "lucide-react";
import { useState } from "react";

const guides = [
  {
    id: "now",
    label: "Right now",
    icon: AlertCircle,
    title: "When something is happening now",
    steps: ["Move away from immediate danger if you can.", "Press SOS if life, health, or safety is at risk.", "Keep your phone with you and answer responder calls.", "Share simple details: what happened, where you are, who is hurt."],
  },
  {
    id: "medical",
    label: "Medical",
    icon: Heart,
    title: "Medical emergency basics",
    steps: ["Do not move someone with a possible neck or back injury.", "Apply firm pressure to heavy bleeding.", "If someone is unconscious but breathing, place them on their side.", "Tell responders about medication, allergies, or known conditions."],
  },
  {
    id: "fire",
    label: "Fire",
    icon: Zap,
    title: "Fire and smoke safety",
    steps: ["Leave the building immediately when it is safe to do so.", "Stay low under smoke.", "Feel doors before opening them.", "Do not go back inside for belongings."],
  },
  {
    id: "location",
    label: "Location",
    icon: MapPin,
    title: "Help responders find you",
    steps: ["Allow location access when sending an alert.", "Mention nearby landmarks, entrances, or floor numbers.", "If you move, refresh your location on the map.", "Stay visible when it is safe."],
  },
];

const kit = ["First aid kit", "Flashlight", "Extra batteries", "Bottled water", "Phone power bank", "Important documents", "Medication list", "Emergency contacts"];
const plan = ["Choose a family meeting point", "Know safe exits", "Teach children emergency numbers", "Keep medical notes updated", "Practice the plan", "Know nearby clinics"];

export default function SafetyTips() {
  const [active, setActive] = useState(guides[0]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function toggle(item: string) {
    setChecked((current) => ({ ...current, [item]: !current[item] }));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-red-600">Safety guide</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 lg:text-4xl">Simple steps for stressful moments</h1>
        <p className="mt-2 text-slate-600">Use these quick reminders before, during, and after an emergency.</p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {guides.map((guide) => (
              <button key={guide.id} onClick={() => setActive(guide)} className={`rounded-lg border p-4 text-left transition ${active.id === guide.id ? "border-red-600 bg-red-50" : "border-slate-200 hover:border-slate-300"}`}>
                <guide.icon className={`h-5 w-5 ${active.id === guide.id ? "text-red-600" : "text-slate-500"}`} />
                <span className="mt-2 block font-bold text-slate-950">{guide.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <active.icon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-950">{active.title}</h2>
              <p className="mt-1 text-slate-600">Follow the steps you can do safely. Do not put yourself in more danger.</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {active.steps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-lg bg-slate-50 p-4">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-red-600">{index + 1}</span>
                <p className="leading-7 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Checklist title="Home safety kit" icon={<Home className="h-5 w-5" />} items={kit} checked={checked} onToggle={toggle} />
        <Checklist title="Family emergency plan" icon={<Shield className="h-5 w-5" />} items={plan} checked={checked} onToggle={toggle} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">When to use SOS</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="rounded-lg border border-red-200 bg-red-50 p-5">
            <h3 className="flex items-center gap-2 font-bold text-red-900"><AlertCircle className="h-5 w-5" /> Use SOS for immediate danger</h3>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-red-900">
              <li>Medical emergencies such as chest pain, severe injury, or trouble breathing</li>
              <li>Fire, smoke, threats, or crime in progress</li>
              <li>Traffic accidents or dangerous situations nearby</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h3 className="flex items-center gap-2 font-bold text-slate-950"><Phone className="h-5 w-5" /> Use regular reporting for non-urgent issues</h3>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
              <li>Suspicious activity without immediate danger</li>
              <li>Property damage or community concerns</li>
              <li>Questions, follow-ups, or updates after danger has passed</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <BatteryCharging className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
          <div>
            <h3 className="font-bold text-amber-950">Small habit, big difference</h3>
            <p className="mt-1 text-sm leading-6 text-amber-900">Keep your phone charged and location access ready before an emergency happens.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Checklist({ title, icon, items, checked, onToggle }: { title: string; icon: React.ReactNode; items: string[]; checked: Record<string, boolean>; onToggle: (item: string) => void }) {
  const complete = items.filter((item) => checked[item]).length;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">{icon}{title}</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{complete}/{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button key={item} onClick={() => onToggle(item)} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${checked[item] ? "border-emerald-200 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}>
            <CheckCircle2 className={`h-5 w-5 ${checked[item] ? "text-emerald-600" : "text-slate-300"}`} />
            <span className="font-medium text-slate-800">{item}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
