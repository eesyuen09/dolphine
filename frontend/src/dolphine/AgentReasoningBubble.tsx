export function AgentReasoningBubble({ text }: { text: string }) {
  if (!text) return null;

  return (
    <div className="inline-flex flex-col gap-1.5 rounded-2xl border border-sea-teal/20 bg-sea-foam/60 px-4 py-3 text-sm leading-6 text-sea-deep">
      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-sea-teal">
        🐬 Dolphine noticed
      </span>
      <span>{text}</span>
    </div>
  );
}
