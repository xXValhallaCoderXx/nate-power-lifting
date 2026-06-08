import { getAthlete, getProgramConfig } from "@/lib/queries";
import { phaseLabel, type Phase } from "@/lib/program";
import { setPhase } from "@/lib/actions";
import { logout } from "@/app/login/actions";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [athlete, cfg] = await Promise.all([getAthlete(), getProgramConfig()]);
  const phase = (cfg?.phase ?? "reintro_linear") as Phase;
  const nextPhase: Phase = phase === "reintro_linear" ? "wave" : "reintro_linear";

  return (
    <>
      <PageHeader title="Settings" />

      <div className="flex flex-col gap-4 p-5">
        <SettingsForm
          bodyweight={athlete?.bodyweightKg ?? null}
          plateIncrement={athlete?.plateIncrementKg ?? 2.5}
        />

        <div className="card">
          <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Phase</div>
          <p className="mb-3 text-sm">
            Current: <span className="font-semibold text-white">{phaseLabel(phase)}</span>
            {phase === "reintro_linear"
              ? " - linear weekly TM bumps, no AMRAPs."
              : " - 4-week undulating waves with AMRAP-driven progression."}
          </p>
          <form action={setPhase}>
            <input type="hidden" name="phase" value={nextPhase} />
            <button type="submit" className="btn-secondary w-full">
              Switch to {phaseLabel(nextPhase)} (resets to week 1)
            </button>
          </form>
        </div>

        <div className="card">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Export data
          </div>
          <p className="mb-3 text-sm text-muted">Your data is yours. Download anytime.</p>
          <div className="flex gap-2">
            <a href="/api/export?format=csv" className="btn-secondary flex-1">
              CSV
            </a>
            <a href="/api/export?format=json" className="btn-secondary flex-1">
              JSON
            </a>
          </div>
        </div>

        <form action={logout}>
          <button type="submit" className="btn-secondary w-full text-muted">
            Log out
          </button>
        </form>
      </div>
    </>
  );
}
