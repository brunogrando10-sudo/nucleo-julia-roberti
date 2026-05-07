"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Session, Patient, BillingMessage } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDateTime, formatTime } from "@/lib/utils";
import { Send, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { addDays, format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

interface SessionWithDetails extends Session {
  patient: Patient;
  billing_messages: BillingMessage[];
}

const TRIGGER_LABELS: Record<string, string> = {
  "D-5": "5 dias antes",
  "D-2": "2 dias antes",
  "D-1": "Véspera",
  confirmacao: "Confirmação",
};

export default function CobrancaPage() {
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [messageLog, setMessageLog] = useState<BillingMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();

    const now = new Date();
    const rangeStart = startOfDay(now).toISOString();
    const rangeEnd = endOfDay(addDays(now, 7)).toISOString();

    const { data: sessionData } = await supabase
      .from("sessions")
      .select(
        `*, patient:patients(*), billing_messages(*)`
      )
      .gte("scheduled_at", rangeStart)
      .lte("scheduled_at", rangeEnd)
      .in("status", ["agendada", "paga"])
      .order("scheduled_at");

    const { data: logData } = await supabase
      .from("billing_messages")
      .select("*, session:sessions(scheduled_at, patient:patients(name))")
      .order("sent_at", { ascending: false })
      .limit(30);

    setSessions((sessionData as SessionWithDetails[]) ?? []);
    setMessageLog((logData as BillingMessage[]) ?? []);
    setLoading(false);
  }

  async function handleSendReminder(session: SessionWithDetails) {
    // Integração WhatsApp ainda não ativada — registra na fila e exibe toast
    const supabase = createClient();

    await supabase.from("billing_messages").insert({
      session_id: session.id,
      trigger_day: "D-1",
      status: "pendente",
      message_body: `Olá ${session.patient.name}! Lembrando da sua sessão amanhã às ${formatTime(session.scheduled_at)}. Valor: ${formatCurrency(session.amount ?? 0)}.`,
      sent_at: new Date().toISOString(),
    });

    toast("Integração WhatsApp será ativada em breve", {
      icon: "🔔",
      style: {
        background: "#27204d",
        color: "#fff",
      },
    });

    loadData();
  }

  const grouped = sessions.reduce<Record<string, SessionWithDetails[]>>(
    (acc, session) => {
      const day = format(new Date(session.scheduled_at), "yyyy-MM-dd");
      if (!acc[day]) acc[day] = [];
      acc[day].push(session);
      return acc;
    },
    {}
  );

  return (
    <div>
      <PageHeader
        title="Régua de cobrança"
        subtitle="Próximos 7 dias — disparos manuais e automáticos"
      />

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-terracota border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel principal */}
          <div className="lg:col-span-2 space-y-4">
            {Object.keys(grouped).length === 0 ? (
              <Card>
                <p className="text-center text-brand-nude py-8 text-sm">
                  Nenhuma sessão nos próximos 7 dias.
                </p>
              </Card>
            ) : (
              Object.entries(grouped).map(([day, daySessions]) => {
                const date = new Date(day + "T12:00:00");
                const dayLabel = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
                return (
                  <div key={day}>
                    <p className="text-xs font-semibold text-brand-nude uppercase tracking-widest mb-2 ml-1">
                      {dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}
                    </p>
                    <div className="space-y-3">
                      {daySessions.map((session) => (
                        <BillingSessionCard
                          key={session.id}
                          session={session}
                          onSendReminder={() => handleSendReminder(session)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Log de mensagens */}
          <div>
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-brand-light">
                <h2 className="font-serif text-lg text-brand-dark font-light">
                  Log de mensagens
                </h2>
              </div>
              <div className="divide-y divide-brand-light max-h-[600px] overflow-y-auto scrollbar-thin">
                {messageLog.length === 0 ? (
                  <p className="text-center text-brand-nude text-sm py-6">
                    Nenhuma mensagem enviada.
                  </p>
                ) : (
                  messageLog.map((msg) => (
                    <LogEntry key={msg.id} message={msg} />
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function BillingSessionCard({
  session,
  onSendReminder,
}: {
  session: SessionWithDetails;
  onSendReminder: () => void;
}) {
  const lastMsg = session.billing_messages?.sort(
    (a, b) =>
      new Date(b.sent_at ?? 0).getTime() - new Date(a.sent_at ?? 0).getTime()
  )[0];

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-brand-dark text-sm">
            {session.patient?.name}
          </p>
          <p className="text-xs text-brand-nude mt-0.5">
            {formatTime(session.scheduled_at)}
            {session.amount && ` · ${formatCurrency(session.amount)}`}
          </p>
        </div>
        <StatusBadge status={session.status} />
      </div>

      {/* Status da cobrança */}
      <div className="bg-brand-light/50 rounded-lg p-3 mb-3 text-xs">
        {lastMsg ? (
          <div className="flex items-start gap-2">
            <CheckCircle size={13} className="text-brand-medium mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-brand-dark">
                Último envio: {TRIGGER_LABELS[lastMsg.trigger_day ?? ""] ?? lastMsg.trigger_day}
              </p>
              {lastMsg.sent_at && (
                <p className="text-brand-nude mt-0.5">
                  {formatDateTime(lastMsg.sent_at)}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-brand-nude">
            <AlertCircle size={13} />
            <span>Nenhuma mensagem enviada ainda</span>
          </div>
        )}
      </div>

      {/* Botão de ação */}
      {session.status !== "paga" && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onSendReminder}
          className="w-full justify-center"
        >
          <Send size={13} />
          Enviar lembrete agora
        </Button>
      )}

      {session.status === "paga" && (
        <div className="flex items-center justify-center gap-1.5 py-1.5 text-green-600 text-xs font-medium">
          <CheckCircle size={13} />
          Pagamento confirmado
        </div>
      )}
    </Card>
  );
}

function LogEntry({ message }: { message: BillingMessage & { session?: unknown } }) {
  const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    pendente: {
      icon: <Clock size={13} className="text-yellow-500" />,
      color: "text-yellow-600",
    },
    enviado: {
      icon: <CheckCircle size={13} className="text-green-500" />,
      color: "text-green-600",
    },
    falhou: {
      icon: <AlertCircle size={13} className="text-red-500" />,
      color: "text-red-500",
    },
  };

  const config = statusConfig[message.status] ?? statusConfig.pendente;

  return (
    <div className="px-4 py-3 hover:bg-brand-nude/5 transition-colors">
      <div className="flex items-center gap-2 mb-1">
        {config.icon}
        <span className={`text-[11px] font-medium ${config.color} uppercase tracking-wide`}>
          {message.status}
        </span>
        {message.trigger_day && (
          <span className="text-[10px] text-brand-nude ml-auto">
            {TRIGGER_LABELS[message.trigger_day] ?? message.trigger_day}
          </span>
        )}
      </div>
      {message.sent_at && (
        <p className="text-[10px] text-brand-nude">{formatDateTime(message.sent_at)}</p>
      )}
      {message.message_body && (
        <p className="text-xs text-brand-dark/70 mt-1.5 leading-relaxed line-clamp-2">
          {message.message_body}
        </p>
      )}
    </div>
  );
}
