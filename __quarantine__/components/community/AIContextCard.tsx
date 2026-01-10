"use client";

interface AIContextCardProps {
  contextType: "safety" | "legality" | "method_note" | "general";
  message: string;
}

export default function AIContextCard({ contextType, message }: AIContextCardProps) {
  const icons = {
    safety: "⚠️",
    legality: "⚖️",
    method_note: "💡",
    general: "ℹ️",
  };

  const labels = {
    safety: "Safety Reminder",
    legality: "Legal Note",
    method_note: "Method Note",
    general: "AI Context",
  };

  const colors = {
    safety: "bg-yellow-500/10 border-yellow-500/20 text-yellow-300",
    legality: "bg-blue-500/10 border-blue-500/20 text-blue-300",
    method_note: "bg-purple-500/10 border-purple-500/20 text-purple-300",
    general: "bg-white/5 border-white/10 text-white/70",
  };

  return (
    <div className={`rounded-lg border p-3 mb-3 ${colors[contextType]}`}>
      <div className="flex items-start gap-2">
        <span className="text-sm">{icons[contextType]}</span>
        <div className="flex-1">
          <div className="text-xs font-medium mb-1 opacity-80">
            AI: {labels[contextType]}
          </div>
          <p className="text-sm leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
}
