import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useRef, useState } from "react";

type TransportMode = "MRT/Bus" | "Walk/Cycle" | "Drive";
type AppStatus = "idle" | "loading" | "results";

type Profile = {
  workplace: string;
  budget: number;
  officeDays: number;
  transportMode: TransportMode;
};

type LocationOption = {
  id: string;
  area: string;
  rent: number;
  commute: number;
  annualCommuteHours: number;
  transportCost: number;
  gymScore: number;
  foodScore: number;
  quietness: number;
  lifestyleScore: number;
  likelyRegret: string;
};

const loadingSteps = [
  "Understanding your lifestyle",
  "Calculating commute burden",
  "Checking neighbourhood fit",
  "Simulating your future week"
];

const priorityOptions = [
  "Gym access",
  "Affordable food",
  "Quiet environment",
  "MRT access",
  "Supermarket nearby",
  "Cafés / study spaces",
  "Parks"
];

// Mock data lives here for the demo. Replace this with POST /api/recommendations when the backend contract is ready.
const locationOptions: LocationOption[] = [
  {
    id: "queenstown",
    area: "Queenstown",
    rent: 1450,
    commute: 12,
    annualCommuteHours: 180,
    transportCost: 68,
    gymScore: 9,
    foodScore: 8,
    quietness: 7,
    lifestyleScore: 88,
    likelyRegret: "Higher rent pressure"
  },
  {
    id: "clementi",
    area: "Clementi",
    rent: 1300,
    commute: 18,
    annualCommuteHours: 220,
    transportCost: 75,
    gymScore: 7,
    foodScore: 9,
    quietness: 6,
    lifestyleScore: 83,
    likelyRegret: "Busier student area"
  },
  {
    id: "dover",
    area: "Dover",
    rent: 1350,
    commute: 10,
    annualCommuteHours: 160,
    transportCost: 60,
    gymScore: 6,
    foodScore: 7,
    quietness: 8,
    lifestyleScore: 84,
    likelyRegret: "Fewer lifestyle amenities"
  },
  {
    id: "jurong-east",
    area: "Jurong East",
    rent: 1100,
    commute: 38,
    annualCommuteHours: 410,
    transportCost: 95,
    gymScore: 6,
    foodScore: 7,
    quietness: 6,
    lifestyleScore: 69,
    likelyRegret: "Commute fatigue"
  },
  {
    id: "punggol",
    area: "Punggol",
    rent: 950,
    commute: 55,
    annualCommuteHours: 590,
    transportCost: 110,
    gymScore: 5,
    foodScore: 6,
    quietness: 8,
    lifestyleScore: 51,
    likelyRegret: "Long travel time"
  }
];

const bestLocation = locationOptions[0];
const comparisonLocation = locationOptions.find((location) => location.id === "jurong-east")!;

const futureWeek = [
  {
    day: "Monday",
    events: [
      { time: "8:15 AM", label: "Leave home" },
      { time: "8:27 AM", label: "Arrive at Kent Ridge" },
      { time: "6:15 PM", label: "Gym nearby" },
      { time: "7:30 PM", label: "Dinner nearby" }
    ]
  },
  {
    day: "Wednesday",
    events: [
      { time: "Morning", label: "Work from home" },
      { time: "12:30 PM", label: "Lunch nearby" },
      { time: "6:30 PM", label: "Grocery run" }
    ]
  },
  {
    day: "Friday",
    events: [
      { time: "8:15 AM", label: "Leave home" },
      { time: "8:27 AM", label: "Arrive at Kent Ridge" },
      { time: "6:30 PM", label: "Dinner with friends nearby" }
    ]
  }
];

const landlordMessage =
  "Hi, I'm interested in this room near Queenstown. I work near Kent Ridge and am looking for a quiet long-term stay. May I check whether utilities are included, cooking is allowed, and when viewing is available?";

const currency = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0
});

function formatMoney(value: number) {
  return currency.format(value).replace("SGD", "S$");
}

function App() {
  const [profile, setProfile] = useState<Profile>({
    workplace: "Kent Ridge",
    budget: 1500,
    officeDays: 3,
    transportMode: "MRT/Bus"
  });
  const [activePriorities, setActivePriorities] = useState<string[]>([
    "Gym access",
    "Affordable food",
    "MRT access"
  ]);
  const [status, setStatus] = useState<AppStatus>("idle");
  const [loadingStep, setLoadingStep] = useState(0);
  const [selectedLocationId, setSelectedLocationId] = useState(bestLocation.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const profileRef = useRef<HTMLElement | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);
  const timeoutRef = useRef<number[]>([]);

  const selectedLocation = useMemo(
    () => locationOptions.find((location) => location.id === selectedLocationId) ?? bestLocation,
    [selectedLocationId]
  );

  useEffect(() => {
    return () => {
      timeoutRef.current.forEach(window.clearTimeout);
    };
  }, []);

  function scrollToProfile() {
    profileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function runSimulation() {
    timeoutRef.current.forEach(window.clearTimeout);
    timeoutRef.current = [];
    setStatus("loading");
    setLoadingStep(0);

    loadingSteps.forEach((_, index) => {
      timeoutRef.current.push(
        window.setTimeout(() => {
          setLoadingStep(index);
        }, index * 260)
      );
    });

    // Later, replace this demo delay with an API call and render the returned ranked rooms.
    timeoutRef.current.push(
      window.setTimeout(() => {
        setSelectedLocationId(bestLocation.id);
        setStatus("results");
        window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      }, 1100)
    );
  }

  function handleTryAnotherProfile() {
    setStatus("idle");
    window.setTimeout(scrollToProfile, 40);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-ocean-radial font-sans text-sea-ink">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-28 h-72 w-72 rounded-full bg-sea-glass/60 blur-3xl" />
        <div className="absolute right-0 top-10 h-96 w-96 rounded-full bg-coral/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 rounded-full bg-sand/80 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-5 py-6 sm:px-8 lg:px-10">
        <LandingSection onStart={scrollToProfile} />

        <ProfileForm
          refCallback={(node) => {
            profileRef.current = node;
          }}
          activePriorities={activePriorities}
          isLoading={status === "loading"}
          onRun={runSimulation}
          onTogglePriority={(priority) => {
            setActivePriorities((current) =>
              current.includes(priority)
                ? current.filter((item) => item !== priority)
                : [...current, priority]
            );
          }}
          profile={profile}
          setProfile={setProfile}
        />

        {status === "loading" && <LoadingSteps activeStep={loadingStep} />}

        {status === "results" && (
          <ResultsDashboard
            refCallback={(node) => {
              resultsRef.current = node;
            }}
            activePriorities={activePriorities}
            onOpenLandlordMessage={() => setIsModalOpen(true)}
            onSelectLocation={setSelectedLocationId}
            onTryAnotherProfile={handleTryAnotherProfile}
            profile={profile}
            selectedLocation={selectedLocation}
            selectedLocationId={selectedLocationId}
          />
        )}
      </div>

      <LandlordMessageModal isOpen={isModalOpen} message={landlordMessage} onClose={() => setIsModalOpen(false)} />
    </main>
  );
}

type LandingSectionProps = {
  onStart: () => void;
};

function LandingSection({ onStart }: LandingSectionProps) {
  return (
    <section className="grid min-h-[88vh] items-center gap-10 pt-4 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="animate-rise-in">
        <nav className="mb-16 flex items-center justify-between gap-4 rounded-full border border-white/80 bg-white/55 px-4 py-3 shadow-card backdrop-blur-xl">
          <a href="#top" className="text-base font-extrabold tracking-tight text-sea-deep" aria-label="Dolphine home">
            Dolphine 🐬
          </a>
          <div className="hidden items-center gap-2 text-sm font-bold text-slate-500 sm:flex">
            <span className="rounded-full bg-white px-3 py-1.5">Commute</span>
            <span className="rounded-full bg-white px-3 py-1.5">Budget</span>
            <span className="rounded-full bg-white px-3 py-1.5">Lifestyle</span>
          </div>
        </nav>

        <p className="mb-4 inline-flex rounded-full border border-sea-teal/15 bg-white/70 px-4 py-2 text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">
          Singapore relocation agent
        </p>
        <h1 className="max-w-4xl font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.05em] text-sea-ink sm:text-6xl lg:text-7xl">
          Find a life, not just a room.
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
          Dolphine simulates your future daily life across commute, cost, neighbourhood fit, and lifestyle before you
          sign a lease.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded-full bg-sea-deep px-7 py-4 text-base font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-sea-ink"
            type="button"
            onClick={onStart}
          >
            Simulate My Life
          </button>
          <a
            className="rounded-full border border-sea-deep/15 bg-white/70 px-7 py-4 text-center text-base font-extrabold text-sea-deep transition hover:border-sea-teal hover:bg-white"
            href="#demo"
          >
            View demo signals
          </a>
        </div>
      </div>

      <div className="relative animate-soft-float">
        <div className="absolute -left-8 top-10 h-24 w-24 rounded-[2rem] bg-coral/20 blur-xl" />
        <div className="glass-card relative rounded-[2.5rem] p-5 sm:p-7">
          <div className="rounded-[2rem] bg-gradient-to-br from-sea-deep via-sea-teal to-[#6cc7bd] p-6 text-white">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-white/70">Liveability forecast</p>
                <h2 className="mt-4 font-display text-4xl font-extrabold leading-none tracking-tight">Queenstown</h2>
              </div>
              <span className="rounded-full bg-white/18 px-4 py-2 text-sm font-extrabold">88/100</span>
            </div>

            <div className="mt-10 grid gap-3">
              {[
                ["Commute to Kent Ridge", "12 min"],
                ["Annual commute saved", "~230 hrs"],
                ["Budget pressure", "Medium"],
                ["Neighbourhood fit", "Excellent"]
              ].map(([label, value]) => (
                <div
                  className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/12 px-4 py-3 backdrop-blur"
                  key={label}
                >
                  <span className="text-sm text-white/78">{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <MiniMetric label="Areas" value="5" />
            <MiniMetric label="Signals" value="9" />
            <MiniMetric label="Week sim" value="3 days" />
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/68 px-3 py-4 shadow-card">
      <strong className="block text-lg text-sea-deep">{value}</strong>
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</span>
    </div>
  );
}

type ProfileFormProps = {
  activePriorities: string[];
  isLoading: boolean;
  onRun: () => void;
  onTogglePriority: (priority: string) => void;
  profile: Profile;
  refCallback: (node: HTMLElement | null) => void;
  setProfile: Dispatch<SetStateAction<Profile>>;
};

function ProfileForm({
  activePriorities,
  isLoading,
  onRun,
  onTogglePriority,
  profile,
  refCallback,
  setProfile
}: ProfileFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onRun();
  }

  return (
    <section className="scroll-mt-8" ref={refCallback} id="demo">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">Lifestyle profile</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.04em] text-sea-ink sm:text-5xl">
              Tell Dolphine how your week should feel.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-500">
            This is a frontend-only profile today. The same fields can be sent directly to the recommendation API later.
          </p>
        </div>

        <form className="glass-card rounded-[2rem] p-5 sm:p-7 lg:p-8" onSubmit={handleSubmit}>
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-extrabold text-sea-ink">Workplace / School</span>
              <input
                className="rounded-2xl border border-sea-deep/10 bg-white px-4 py-3 text-base text-sea-ink shadow-sm"
                onChange={(event) => setProfile((current) => ({ ...current, workplace: event.target.value }))}
                type="text"
                value={profile.workplace}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-extrabold text-sea-ink">Monthly budget</span>
              <div className="flex rounded-2xl border border-sea-deep/10 bg-white px-4 py-3 shadow-sm">
                <span className="mr-2 font-extrabold text-sea-teal">S$</span>
                <input
                  className="w-full border-0 bg-transparent p-0 text-base text-sea-ink outline-none"
                  min={0}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, budget: Number(event.target.value) || 0 }))
                  }
                  type="number"
                  value={profile.budget}
                />
              </div>
            </label>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <fieldset>
              <legend className="mb-3 text-sm font-extrabold text-sea-ink">Office days per week</legend>
              <div className="grid grid-cols-6 gap-2">
                {[0, 1, 2, 3, 4, 5].map((day) => (
                  <button
                    aria-pressed={profile.officeDays === day}
                    className={`rounded-2xl border px-3 py-3 text-sm font-extrabold transition ${
                      profile.officeDays === day
                        ? "border-sea-deep bg-sea-deep text-white shadow-card"
                        : "border-sea-deep/10 bg-white text-slate-500 hover:border-sea-teal hover:text-sea-deep"
                    }`}
                    key={day}
                    onClick={() => setProfile((current) => ({ ...current, officeDays: day }))}
                    type="button"
                  >
                    {day}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-sm font-extrabold text-sea-ink">Transport mode</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {(["MRT/Bus", "Walk/Cycle", "Drive"] as TransportMode[]).map((mode) => (
                  <button
                    aria-pressed={profile.transportMode === mode}
                    className={`rounded-2xl border px-4 py-3 text-sm font-extrabold transition ${
                      profile.transportMode === mode
                        ? "border-sea-teal bg-sea-teal text-white shadow-card"
                        : "border-sea-deep/10 bg-white text-slate-500 hover:border-sea-teal hover:text-sea-deep"
                    }`}
                    key={mode}
                    onClick={() => setProfile((current) => ({ ...current, transportMode: mode }))}
                    type="button"
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset className="mt-7">
            <legend className="mb-3 text-sm font-extrabold text-sea-ink">Lifestyle priorities</legend>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((priority) => {
                const isActive = activePriorities.includes(priority);
                return (
                  <button
                    aria-pressed={isActive}
                    className={`rounded-full border px-4 py-2.5 text-sm font-extrabold transition ${
                      isActive
                        ? "border-sea-deep bg-sea-deep text-white shadow-card"
                        : "border-sea-deep/10 bg-white/90 text-slate-500 hover:border-sea-teal hover:text-sea-deep"
                    }`}
                    key={priority}
                    onClick={() => onTogglePriority(priority)}
                    type="button"
                  >
                    {priority}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-8 flex flex-col gap-3 border-t border-sea-deep/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-500">
              Profile: {profile.officeDays} office days, {profile.transportMode}, {formatMoney(profile.budget)} budget.
            </p>
            <button
              className="rounded-full bg-coral px-7 py-4 text-base font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[#df5f51] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Running simulation..." : "Run Dolphine Simulation"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function LoadingSteps({ activeStep }: { activeStep: number }) {
  return (
    <section className="mx-auto w-full max-w-3xl animate-rise-in rounded-[2rem] border border-white/80 bg-white/76 p-6 shadow-soft backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">Agent reasoning</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.04em]">Simulating your future week</h2>
        </div>
        <div className="hidden h-14 w-14 items-center justify-center rounded-full bg-sea-foam text-2xl sm:flex">🐬</div>
      </div>

      <div className="grid gap-3">
        {loadingSteps.map((step, index) => {
          const isDone = index < activeStep;
          const isActive = index === activeStep;
          return (
            <div
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                isActive
                  ? "border-sea-teal bg-sea-foam text-sea-deep"
                  : isDone
                    ? "border-sea-teal/20 bg-white text-slate-500"
                    : "border-slate-200 bg-white/70 text-slate-400"
              }`}
              key={step}
            >
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-sm font-extrabold ${
                  isDone || isActive ? "bg-sea-teal text-white" : "bg-slate-100 text-slate-400"
                }`}
              >
                {isDone ? "✓" : index + 1}
              </span>
              <span className="font-bold">{step}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type ResultsDashboardProps = {
  activePriorities: string[];
  onOpenLandlordMessage: () => void;
  onSelectLocation: (locationId: string) => void;
  onTryAnotherProfile: () => void;
  profile: Profile;
  refCallback: (node: HTMLElement | null) => void;
  selectedLocation: LocationOption;
  selectedLocationId: string;
};

function ResultsDashboard({
  activePriorities,
  onOpenLandlordMessage,
  onSelectLocation,
  onTryAnotherProfile,
  profile,
  refCallback,
  selectedLocation,
  selectedLocationId
}: ResultsDashboardProps) {
  const commuteHoursSaved = comparisonLocation.annualCommuteHours - bestLocation.annualCommuteHours;
  const extraRent = bestLocation.rent - comparisonLocation.rent;

  return (
    <section className="scroll-mt-8" ref={refCallback}>
      <div className="grid gap-8">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2.2rem] bg-sea-deep p-6 text-white shadow-soft sm:p-8">
            <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-white/60">Dolphine recommendation</p>
            <div className="mt-5 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <h2 className="font-display text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                  Best Fit: {bestLocation.area}
                </h2>
                <p className="mt-3 text-xl font-extrabold text-sea-glass">
                  Lifestyle Score: {bestLocation.lifestyleScore}/100
                </p>
              </div>
              <div className="rounded-3xl border border-white/14 bg-white/10 p-5">
                <span className="block text-sm font-bold text-white/62">Saves</span>
                <strong className="block text-4xl font-extrabold">~{commuteHoursSaved}</strong>
                <span className="text-sm font-bold text-white/74">hours/year compared with Jurong East</span>
              </div>
            </div>
            <p className="mt-7 max-w-3xl text-base leading-8 text-white/78">
              Although Queenstown costs {formatMoney(extraRent)} more per month than Jurong East, it saves significant
              commute time and better matches your gym and convenience preferences.
            </p>
          </div>

          <div className="glass-card rounded-[2.2rem] p-6 sm:p-8">
            <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">Profile used</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <SummaryPill label="Destination" value={profile.workplace || "Kent Ridge"} />
              <SummaryPill label="Budget" value={formatMoney(profile.budget)} />
              <SummaryPill label="Office days" value={`${profile.officeDays}/week`} />
              <SummaryPill label="Transport" value={profile.transportMode} />
            </div>
            <div className="mt-5 rounded-3xl bg-white/75 p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">Priorities</span>
              <div className="mt-3 flex flex-wrap gap-2">
                {activePriorities.map((priority) => (
                  <span className="rounded-full bg-sea-foam px-3 py-1.5 text-xs font-extrabold text-sea-deep" key={priority}>
                    {priority}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">Compare areas</p>
                <h2 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.04em]">Rental choices ranked</h2>
              </div>
              <p className="hidden max-w-sm text-right text-sm leading-6 text-slate-500 md:block">
                Click any card to inspect its tradeoffs in the detail panel.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {locationOptions.map((location) => (
                <LocationCard
                  isRecommended={location.id === bestLocation.id}
                  isSelected={location.id === selectedLocationId}
                  key={location.id}
                  location={location}
                  onSelect={() => onSelectLocation(location.id)}
                />
              ))}
            </div>
          </div>

          <DetailPanel location={selectedLocation} workplace={profile.workplace || "Kent Ridge"} />
        </div>

        <TradeoffSection />
        <FutureWeekTimeline />
        <DolphineReport onGenerateLandlordMessage={onOpenLandlordMessage} onTryAnotherProfile={onTryAnotherProfile} />
      </div>
    </section>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/78 p-4 shadow-sm">
      <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <strong className="mt-1 block text-base text-sea-ink">{value}</strong>
    </div>
  );
}

type LocationCardProps = {
  isRecommended: boolean;
  isSelected: boolean;
  location: LocationOption;
  onSelect: () => void;
};

function LocationCard({ isRecommended, isSelected, location, onSelect }: LocationCardProps) {
  return (
    <button
      aria-pressed={isSelected}
      className={`group rounded-[1.75rem] border p-5 text-left shadow-card transition hover:-translate-y-1 ${
        isSelected
          ? "border-sea-teal bg-white ring-4 ring-sea-teal/15"
          : "border-white/75 bg-white/76 hover:border-sea-teal/40"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-extrabold text-sea-ink">{location.area}</h3>
            {isRecommended && (
              <span className="rounded-full bg-coral/12 px-3 py-1 text-xs font-extrabold text-coral">Recommended</span>
            )}
          </div>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {formatMoney(location.rent)}/mo · {location.commute} min commute
          </p>
        </div>
        <span className="rounded-2xl bg-sea-foam px-3 py-2 text-sm font-extrabold text-sea-deep">
          {location.lifestyleScore}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <CardStat label="Rent" value={`${formatMoney(location.rent)}`} />
        <CardStat label="Annual commute" value={`${location.annualCommuteHours} hrs`} />
      </div>

      <div className="mt-5 grid gap-3">
        <ScoreBar label="Gym" score={location.gymScore} />
        <ScoreBar label="Food" score={location.foodScore} />
        <ScoreBar label="Quiet" score={location.quietness} />
      </div>
    </button>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-sea-mist px-3 py-2">
      <span className="block text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <strong className="text-sea-ink">{value}</strong>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">
        <span>{label}</span>
        <span>{score}/10</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="metric-bar h-2 rounded-full bg-gradient-to-r from-sea-teal to-[#73cfc4]"
          style={{ width: `${score * 10}%` }}
        />
      </div>
    </div>
  );
}

function DetailPanel({ location, workplace }: { location: LocationOption; workplace: string }) {
  const details = [
    ["Rent", `${formatMoney(location.rent)}/mo`],
    [`Commute to ${workplace}`, `${location.commute} min`],
    ["Annual commute hours", `${location.annualCommuteHours} hrs`],
    ["Monthly transport cost", `${formatMoney(location.transportCost)}`],
    ["Gym access", `${location.gymScore}/10`],
    ["Food access", `${location.foodScore}/10`],
    ["Quietness", `${location.quietness}/10`]
  ];

  return (
    <aside className="sticky top-5 self-start rounded-[2rem] border border-white/75 bg-white/78 p-6 shadow-soft backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">Selected area</p>
          <h2 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.04em]">{location.area}</h2>
        </div>
        <span className="rounded-2xl bg-sea-deep px-4 py-2 text-sm font-extrabold text-white">
          {location.lifestyleScore}/100
        </span>
      </div>

      <div className="mt-6 grid gap-3">
        {details.map(([label, value]) => (
          <div className="flex items-center justify-between rounded-2xl bg-sea-mist px-4 py-3" key={label}>
            <span className="text-sm font-bold text-slate-500">{label}</span>
            <strong className="text-sea-ink">{value}</strong>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-3xl border border-coral/20 bg-coral/10 p-4">
        <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-coral">Likely regret</span>
        <p className="mt-2 text-lg font-extrabold text-sea-ink">{location.likelyRegret}</p>
      </div>
    </aside>
  );
}

function TradeoffSection() {
  const hoursSaved = comparisonLocation.annualCommuteHours - bestLocation.annualCommuteHours;
  const rentDelta = bestLocation.rent - comparisonLocation.rent;

  return (
    <section className="overflow-hidden rounded-[2.5rem] bg-sea-ink p-6 text-white shadow-soft sm:p-8 lg:p-10">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-glass/70">Demo moment</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-[-0.04em] sm:text-5xl">
            Queenstown beats cheaper rent when you price your time.
          </h2>
          <p className="mt-5 text-base leading-8 text-white/68">
            Dolphine turns a listing comparison into a future-life comparison, so the tradeoff is visible before signing.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TradeoffTile tone="positive" title={`+${hoursSaved} hours/year saved`} caption="Less commute drag across office days" />
          <TradeoffTile tone="positive" title="+Better gym access" caption="Higher fit for your evening routine" />
          <TradeoffTile tone="positive" title="+Better MRT convenience" caption="Shorter routes around central Singapore" />
          <TradeoffTile tone="negative" title={`-${formatMoney(rentDelta)}/month higher rent`} caption="The main pressure point to budget around" />
        </div>
      </div>
    </section>
  );
}

function TradeoffTile({
  caption,
  title,
  tone
}: {
  caption: string;
  title: string;
  tone: "positive" | "negative";
}) {
  return (
    <div
      className={`rounded-[1.75rem] border p-5 ${
        tone === "positive"
          ? "border-sea-glass/25 bg-sea-glass/12"
          : "border-coral/30 bg-coral/15"
      }`}
    >
      <h3 className="text-xl font-extrabold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/64">{caption}</p>
    </div>
  );
}

function FutureWeekTimeline() {
  return (
    <section className="glass-card rounded-[2.5rem] p-6 sm:p-8 lg:p-10">
      <div className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">Future week simulation</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.04em]">Your future week in Queenstown</h2>
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-sm font-extrabold text-sea-deep shadow-card">
          3-day lifestyle snapshot
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {futureWeek.map((day) => (
          <article className="rounded-[1.75rem] bg-white/78 p-5 shadow-card" key={day.day}>
            <h3 className="text-2xl font-extrabold text-sea-deep">{day.day}</h3>
            <div className="mt-5 grid gap-4">
              {day.events.map((event, index) => (
                <div className="relative grid grid-cols-[auto_1fr] gap-3" key={`${day.day}-${event.time}-${event.label}`}>
                  <div className="flex flex-col items-center">
                    <span className="h-3 w-3 rounded-full bg-sea-teal" />
                    {index < day.events.length - 1 && <span className="mt-2 h-full min-h-8 w-px bg-sea-teal/18" />}
                  </div>
                  <div className="pb-2">
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">{event.time}</span>
                    <p className="mt-1 font-bold text-sea-ink">{event.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DolphineReport({
  onGenerateLandlordMessage,
  onTryAnotherProfile
}: {
  onGenerateLandlordMessage: () => void;
  onTryAnotherProfile: () => void;
}) {
  return (
    <section className="mb-10 rounded-[2.5rem] border border-sea-teal/20 bg-gradient-to-br from-white via-sea-mist to-sand p-6 shadow-soft sm:p-8 lg:p-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">AI relocation report</p>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.04em]">Dolphine Report</h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            Dolphine recommends Queenstown because it offers the strongest balance of commute efficiency, lifestyle
            access, and budget fit. If minimizing rent is your top priority, Jurong East is acceptable, but it comes with
            a heavy commute penalty.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <button
            className="rounded-full border border-sea-deep/15 bg-white px-6 py-3.5 font-extrabold text-sea-deep shadow-card transition hover:border-sea-teal"
            onClick={onTryAnotherProfile}
            type="button"
          >
            Try another profile
          </button>
          <button
            className="rounded-full bg-sea-deep px-6 py-3.5 font-extrabold text-white shadow-card transition hover:bg-sea-ink"
            onClick={onGenerateLandlordMessage}
            type="button"
          >
            Generate landlord message
          </button>
        </div>
      </div>
    </section>
  );
}

function LandlordMessageModal({
  isOpen,
  message,
  onClose
}: {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      aria-labelledby="landlord-message-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-sea-ink/45 px-5 py-8 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">Generated draft</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.04em]" id="landlord-message-title">
              Landlord message
            </h2>
          </div>
          <button
            aria-label="Close landlord message"
            className="grid h-10 w-10 place-items-center rounded-full bg-sea-mist text-xl font-extrabold text-sea-deep hover:bg-sea-foam"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="mt-6 rounded-3xl border border-sea-deep/10 bg-sea-mist p-5">
          <p className="text-base leading-8 text-slate-700">{message}</p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            className="rounded-full bg-sea-deep px-6 py-3 font-extrabold text-white transition hover:bg-sea-ink"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
