import { SessionStatus } from "@/types";

const STATUS_CONFIG = {
  agendada: {
    label: "Agendada",
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  paga: {
    label: "Paga",
    dot: "bg-green-500",
    badge: "bg-green-50 text-green-700 border-green-200",
  },
  realizada: {
    label: "Realizada",
    dot: "bg-gray-400",
    badge: "bg-gray-50 text-gray-600 border-gray-200",
  },
  cancelada: {
    label: "Cancelada",
    dot: "bg-brand-nude",
    badge: "bg-brand-nude/10 text-brand-nude border-brand-nude/30",
  },
};

interface StatusBadgeProps {
  status: SessionStatus;
  withDot?: boolean;
}

export function StatusBadge({ status, withDot = false }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.agendada;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.badge}`}
    >
      {withDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      {config.label}
    </span>
  );
}
