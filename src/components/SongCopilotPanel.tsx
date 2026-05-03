import { Bot, CheckCircle2, CircleDashed, Gauge, Lightbulb, Music4, Sparkles } from 'lucide-react';
import type { Project } from '../types';
import { analyseLyrics, getNextAction, getReadiness } from '../studioInsights';

interface SongCopilotPanelProps {
  project: Project;
  compact?: boolean;
}

const panel = 'rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl';

export default function SongCopilotPanel({ project, compact = false }: SongCopilotPanelProps) {
  const insight = analyseLyrics(project.lyrics, project.selectedGenreId);
  const readiness = getReadiness(project);
  const nextAction = getNextAction(project);

  return (
    <section className={panel}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan">
            <Bot className="h-3.5 w-3.5" /> AI Song Copilot
          </p>
          <h3 className="mt-3 text-2xl font-semibold">Copilot sees the whole song cycle</h3>
          <p className="mt-2 text-sm leading-6 text-white/50">{insight.summary}</p>
        </div>
        <Sparkles className="h-6 w-6 text-magenta" />
      </div>

      <div className={`mt-5 grid gap-3 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
        {[
          { label: 'Mood', value: insight.mood },
          { label: 'Suggested key', value: insight.key },
          { label: 'Suggested BPM', value: String(insight.bpm) },
          { label: 'Readiness', value: `${readiness.score}%` },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/5 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-white/35">{item.label}</p>
            <p className="mt-2 text-lg font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-white"><Music4 className="h-4 w-4 text-cyan" /> Recommended structure</p>
          <p className="mt-3 text-sm leading-6 text-white/60">{insight.structure}</p>
          <div className="mt-4 space-y-2">
            {insight.tips.map((tip) => (
              <div key={tip} className="flex items-start gap-2 text-sm text-white/55">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-magenta" />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-white"><Gauge className="h-4 w-4 text-cyan" /> Song readiness</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-magenta" style={{ width: `${readiness.score}%` }} />
          </div>
          <p className="mt-3 text-sm leading-6 text-white/60">{nextAction}</p>
          <div className="mt-4 space-y-2">
            {readiness.checks.slice(0, compact ? 4 : 7).map((check) => (
              <div key={check.label} className="flex items-center gap-2 text-sm text-white/55">
                {check.complete ? <CheckCircle2 className="h-4 w-4 text-cyan" /> : <CircleDashed className="h-4 w-4 text-white/30" />}
                <span>{check.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
