"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Session, Patient } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatTime } from "@/lib/utils";
import {
  CalendarDays,
  AlertCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SessionWithPatient extends Session {
  patient: Patient;
}

interface DashboardStats {
  weekSessions: number;
  weekPaid: number;
  monthRevenue: number;
  monthProjected: number;
  inadimplentes: number;
  nextSession: SessionWithPatient | null;
}

export default function DashboardPage() {
  const [todaySessions, setTodaySessions] = useState<SessionWithPatient[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    weekSessions: 0,
    weekPaid: 0,
    monthRevenue: 0,
    monthProjected: 0,
    inadimplentes: 0,
    nextSession: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const now = new Date();

    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();

    // Sessões de hoje
    const { data: today } = await supabase
      .from("sessions")
      .select("*, patient:patients(*)")
      .gte("scheduled_at", todayStart)
      .lte("scheduled_at", todayEnd)
      .neq("status", "cancelada")
      .order("scheduled_at");

    // Sessões da semana
    const { data: week } = await supabase
      .from("sessions")
      .select("id, status")
      .gte("scheduled_at", weekStart)
      .lte("scheduled_at", weekEnd)
      .neq("status", "cancelada");

    // Sessões do mês para faturamento
    const { data: monthSessions } = await supabase
      .from("sessions")
      .select("status, amount")
      .gte("scheduled_at", monthStart)
      .lte("scheduled_at", monthEnd)
      .neq("status", "cancelada");

    // Próxima sessão (após agora)
    const { data: nextSessions } = await supabase
      .from("sessions")
      .select("*, patient:patients(*)")
      .gt("scheduled_at", now.toISOString())
      .eq("status", "agendada")
      .order("scheduled_at")
      .limit(1);

    const weekTotal = week?.length ?? 0;
    const weekPaid = week?.filter((s) => s.status === "paga" || s.status === "realizada").length ?? 0;

    const monthRevenue =
      monthSessions
        ?.filter((s) => s.status === "paga" || s.status === "realizada")
        .reduce((acc, s) => acc + (s.amount ?? 0), 0) ?? 0;

    const monthProjected =
      monthSessions?.reduce((acc, s) => acc + (s.amount ?? 0), 0) ?? 0;

    // Inadimplentes: agendadas mas não pagas
    const inadimplentes =
      today?.filter((s) => s.status === "agendada").length ?? 0;

    setTodaySessions((today as SessionWithPatient[]) ?? []);
    setStats({
      weekSessions: weekTotal,
      weekPaid,
      monthRevenue,
      monthProjected,
      inadimplentes,
      nextSession: nextSessions?.[0] as SessionWithPatient ?? null,
    });
    setLoading(false);
  }

  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-terracota border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}
      />

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<CalendarDays size={18} className="text-brand-medium" />}
          label="Sessões esta semana"
          value={`${stats.weekPaid}/${stats.weekSessions}`}
          sub="pagas / total"
          color="bg-brand-medium/10"
        />
        <StatCard
          icon={<TrendingUp size={18} className="text-green-600" />}
          label="Faturamento do mês"
          value={formatCurrency(stats.monthRevenue)}
          sub={`projetado: ${formatCurrency(stats.monthProjected)}`}
          color="bg-green-50"
        />
        <StatCard
          icon={<AlertCircle size={18} className="text-brand-terracota" />}
          label="Inadimplentes hoje"
          value={String(stats.inadimplentes)}
          sub="sessões sem pagamento"
          color="bg-brand-terracota/10"
        />
        <StatCard
          icon={<Clock size={18} className="text-brand-nude" />}
          label="Próxima sessão"
          value={
            stats.nextSession
              ? formatTime(stats.nextSession.scheduled_at)
              : "—"
          }
          sub={stats.nextSession?.patient?.name ?? "Nenhuma agendada"}
          color="bg-brand-nude/20"
        />
      </div>

      {/* Sessões de hoje */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-brand-light">
          <h2 className="font-serif text-xl text-brand-dark font-light">
            Sessões de hoje
          </h2>
        </div>

        {todaySessions.length === 0 ? (
          <div className="px-5 py-10 text-center text-brand-nude text-sm">
            Nenhuma sessão agendada para hoje.
          </div>
        ) : (
          <div className="divide-y divide-brand-light">
            {todaySessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between px-5 py-3.5
                           hover:bg-brand-nude/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <SessionDot status={session.status} />
                  <div>
                    <p className="text-sm font-medium text-brand-dark">
                      {session.patient?.name}
                    </p>
                    <p className="text-xs text-brand-nude mt-0.5">
                      {formatTime(session.scheduled_at)}
                      {session.amount && ` · ${formatCurrency(session.amount)}`}
                    </p>
                  </div>
                </div>
                <StatusBadge status={session.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <Card className="flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-brand-nude font-medium uppercase tracking-wide truncate">
          {label}
        </p>
        <p className="text-xl font-semibold text-brand-dark mt-0.5">{value}</p>
        <p className="text-xs text-brand-nude mt-0.5 truncate">{sub}</p>
      </div>
    </Card>
  );
}

function SessionDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    agendada: "bg-red-400",
    paga: "bg-green-500",
    realizada: "bg-gray-400",
    cancelada: "bg-brand-nude",
  };
  return (
    <span
      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors[status] ?? "bg-gray-300"}`}
    />
  );
}
