"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Session, Patient, SessionStatus } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { formatCurrency, formatTime } from "@/lib/utils";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  DollarSign,
  Zap,
  CalendarDays,
  Link2,
  Loader2,
  Download,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

interface SessionWithPatient extends Session {
  patient: Patient;
}

const EMPTY_FORM = {
  patient_id: "",
  date: format(new Date(), "yyyy-MM-dd"),
  time: "09:00",
  amount: "",
  notes: "",
};

export default function AgendaPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-terracota border-t-transparent" /></div>}>
      <AgendaPageInner />
    </Suspense>
  );
}

function AgendaPageInner() {
  const searchParams = useSearchParams();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [sessions, setSessions] = useState<SessionWithPatient[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [importing, setImporting] = useState(false);

  const [gcalAuthUrl, setGcalAuthUrl] = useState<string | null>(null);

  useEffect(() => {
    // Monta a URL de auth assim que tiver o userId
    async function buildAuthUrl() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setGcalAuthUrl(`/api/auth/google?userId=${user.id}`);
      }
    }
    buildAuthUrl();
  }, []);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    const gcalParam = searchParams.get("gcal");
    if (gcalParam === "connected") {
      toast.success("Google Calendar conectado com sucesso!");
      window.history.replaceState({}, "", "/agenda");
    } else if (gcalParam === "error") {
      toast.error("Erro ao conectar Google Calendar. Tente novamente.");
      window.history.replaceState({}, "", "/agenda");
    }
    checkGcalStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkGcalStatus() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setGcalConnected(!!user?.user_metadata?.gcal_connected);
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const [{ data: sessionData }, { data: patientData }] = await Promise.all([
      supabase
        .from("sessions")
        .select("*, patient:patients(*)")
        .gte("scheduled_at", weekStart.toISOString())
        .lte("scheduled_at", wEnd.toISOString())
        .order("scheduled_at"),
      supabase.from("patients").select("*").eq("active", true).order("name"),
    ]);

    setSessions((sessionData as SessionWithPatient[]) ?? []);
    setPatients(patientData ?? []);
    setLoading(false);
  }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function getGcalTokens() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.user_metadata?.gcal_connected) return null;
    return {
      access_token: user.user_metadata.gcal_access_token,
      refresh_token: user.user_metadata.gcal_refresh_token,
      expiry_date: user.user_metadata.gcal_expiry_date,
    };
  }

  async function handleImportFromGcal() {
    setImporting(true);
    try {
      const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const res = await fetch("/api/google/import-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: weekStart.toISOString(),
          weekEnd: wEnd.toISOString(),
        }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error("Erro ao importar eventos.");
      } else {
        const msg = json.imported === 0
          ? "Nenhum evento novo para importar."
          : `${json.imported} sessão(ões) importada(s) do Google Calendar!`;
        toast.success(msg);
        if (json.newPatients?.length > 0) {
          toast(`Novos pacientes criados: ${json.newPatients.join(", ")}`, { icon: "👤" });
        }
        loadData();
      }
    } catch {
      toast.error("Erro ao importar eventos.");
    }
    setImporting(false);
  }

  async function handleAddSession() {
    if (!form.patient_id || !form.date || !form.time) {
      toast.error("Paciente, data e hora são obrigatórios.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
    const patient = patients.find((p) => p.id === form.patient_id);
    const amount = form.amount
      ? parseFloat(form.amount)
      : patient?.session_value ?? null;

    const { data: newSession, error } = await supabase
      .from("sessions")
      .insert({
        patient_id: form.patient_id,
        scheduled_at: scheduledAt,
        status: "agendada",
        amount,
        notes: form.notes || null,
      })
      .select()
      .single();

    if (error || !newSession) {
      toast.error("Erro ao criar sessão.");
      setSaving(false);
      return;
    }

    const tokens = await getGcalTokens();
    if (tokens) {
      try {
        const res = await fetch("/api/google/create-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: newSession.id,
            patientName: patient?.name ?? "Paciente",
            scheduledAt,
            amount,
            notes: form.notes,
          }),
        });
        const json = await res.json();
        if (json.gcalEventId) {
          await supabase
            .from("sessions")
            .update({ gcal_event_id: json.gcalEventId })
            .eq("id", newSession.id);
        }
      } catch {
        console.warn("GCal sync failed for create");
      }
    }

    toast.success("Sessão agendada com sucesso!");
    setModalOpen(false);
    setForm(EMPTY_FORM);
    loadData();
    setSaving(false);
  }

  async function updateStatus(session: SessionWithPatient, status: SessionStatus) {
    const supabase = createClient();
    await supabase.from("sessions").update({ status }).eq("id", session.id);

    if (session.gcal_event_id) {
      const tokens = await getGcalTokens();
      if (tokens) {
        try {
          await fetch("/api/google/update-event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gcalEventId: session.gcal_event_id,
              status,
              patientName: session.patient?.name,
              scheduledAt: session.scheduled_at,
              amount: session.amount,
            }),
          });
        } catch {
          console.warn("GCal sync failed for update");
        }
      }
    }

    loadData();
    toast.success(
      status === "realizada"
        ? "Sessão marcada como realizada."
        : "Pagamento registrado!"
    );
  }

  async function cancelSession(session: SessionWithPatient) {
    const supabase = createClient();
    await supabase
      .from("sessions")
      .update({ status: "cancelada" })
      .eq("id", session.id);

    if (session.gcal_event_id) {
      const tokens = await getGcalTokens();
      if (tokens) {
        try {
          await fetch("/api/google/cancel-event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gcalEventId: session.gcal_event_id }),
          });
        } catch {
          console.warn("GCal sync failed for cancel");
        }
      }
    }

    loadData();
    toast.success("Sessão cancelada.");
  }

  async function handleDisconnectGcal() {
    setDisconnecting(true);
    try {
      await fetch("/api/google/disconnect", { method: "POST" });
      setGcalConnected(false);
      toast.success("Google Calendar desconectado.");
    } catch {
      toast.error("Erro ao desconectar.");
    }
    setDisconnecting(false);
  }

  const patientOptions = [
    { value: "", label: "Selecione o paciente..." },
    ...patients.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div>
      <PageHeader
        title="Agenda"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            {gcalConnected ? (
              <>
                <button
                  onClick={handleImportFromGcal}
                  disabled={importing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-nude/30
                             bg-white text-brand-nude text-xs font-medium hover:border-brand-medium
                             hover:text-brand-medium transition-colors disabled:opacity-60"
                >
                  {importing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Download size={12} />
                  )}
                  Importar semana do GCal
                </button>
                <button
                  onClick={handleDisconnectGcal}
                  disabled={disconnecting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-200
                             bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100
                             transition-colors disabled:opacity-60"
                >
                  {disconnecting ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Link2 size={12} />
                  )}
                  GCal conectado
                </button>
              </>
            ) : (
              gcalAuthUrl ? (
                <a
                  href={gcalAuthUrl}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-nude/30
                             bg-white text-brand-nude text-xs font-medium hover:border-brand-terracota
                             hover:text-brand-terracota transition-colors"
                >
                  <CalendarDays size={12} />
                  Conectar Google Calendar
                </a>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 text-brand-nude/40 text-xs">
                  <Loader2 size={12} className="animate-spin" />
                  Carregando...
                </span>
              )
            )}
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={15} />
              Adicionar sessão
            </Button>
          </div>
        }
      />

      {gcalConnected && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-green-50 rounded-lg border border-green-100 text-xs text-green-700">
          <Link2 size={12} />
          Agenda sincronizada com o Google Calendar — sessões criadas ou canceladas aqui refletem automaticamente no seu calendário.
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          className="p-2 rounded-lg hover:bg-brand-light transition-colors text-brand-dark"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="font-serif text-lg text-brand-dark">
          {format(weekStart, "d 'de' MMM", { locale: ptBR })} –{" "}
          {format(weekEnd, "d 'de' MMM 'de' yyyy", { locale: ptBR })}
        </p>
        <button
          onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          className="p-2 rounded-lg hover:bg-brand-light transition-colors text-brand-dark"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-14 bg-brand-light rounded-lg mb-2" />
              <div className="space-y-2">
                <div className="h-14 bg-brand-light rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {days.map((day) => {
            const daySessions = sessions.filter((s) =>
              isSameDay(parseISO(s.scheduled_at), day)
            );
            const isToday = isSameDay(day, new Date());

            return (
              <div key={day.toISOString()} className="min-w-0">
                <div
                  className={`text-center mb-2 py-1.5 rounded-lg
                  ${isToday ? "bg-brand-dark text-white" : "bg-brand-light text-brand-dark"}`}
                >
                  <p className="text-[10px] uppercase tracking-widest font-medium">
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <p className="text-lg font-semibold leading-none mt-0.5">
                    {format(day, "d")}
                  </p>
                </div>

                <div className="space-y-2">
                  {daySessions.length === 0 ? (
                    <div className="text-center py-4 text-brand-nude/40 text-xs">
                      —
                    </div>
                  ) : (
                    daySessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        gcalConnected={gcalConnected}
                        onMarkDone={() => updateStatus(session, "realizada")}
                        onMarkPaid={() => updateStatus(session, "paga")}
                        onCancel={() => cancelSession(session)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova sessão"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Paciente *"
            value={form.patient_id}
            onChange={(e) => {
              const patient = patients.find((p) => p.id === e.target.value);
              setForm({
                ...form,
                patient_id: e.target.value,
                amount: patient?.session_value?.toString() ?? "",
              });
            }}
            options={patientOptions}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data *"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <Input
              label="Hora *"
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </div>
          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="Deixe em branco para usar o valor padrão"
          />
          <Input
            label="Observações"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Opcional"
          />
          {gcalConnected && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              <CalendarDays size={12} />
              Esta sessão será adicionada ao seu Google Calendar.
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddSession} disabled={saving}>
              {saving ? "Salvando..." : "Agendar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SessionCard({
  session,
  gcalConnected,
  onMarkDone,
  onMarkPaid,
  onCancel,
}: {
  session: SessionWithPatient;
  gcalConnected: boolean;
  onMarkDone: () => void;
  onMarkPaid: () => void;
  onCancel: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-white rounded-xl border border-brand-nude/20 overflow-hidden
                 hover:border-brand-nude/40 transition-all cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="px-2.5 py-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-semibold text-brand-dark truncate">
            {session.patient?.name}
          </p>
          <div className="flex items-center gap-1">
            {gcalConnected && session.gcal_event_id && (
              <span title="Sincronizado com Google Calendar">
                <Link2 size={9} className="text-green-500" />
              </span>
            )}
            <SessionDot status={session.status} />
          </div>
        </div>
        <p className="text-[10px] text-brand-nude">
          {formatTime(session.scheduled_at)}
          {session.amount && ` · ${formatCurrency(session.amount)}`}
        </p>
      </div>

      {expanded && session.status !== "cancelada" && session.status !== "realizada" && (
        <div
          className="border-t border-brand-light px-2 py-2 flex flex-col gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {session.status !== "paga" && (
            <button
              onClick={onMarkPaid}
              className="flex items-center gap-1.5 text-[10px] text-green-700 hover:bg-green-50
                         px-2 py-1 rounded-md transition-colors font-medium"
            >
              <DollarSign size={11} />
              Registrar pagamento
            </button>
          )}
          <button
            onClick={onMarkDone}
            className="flex items-center gap-1.5 text-[10px] text-brand-medium hover:bg-brand-medium/10
                       px-2 py-1 rounded-md transition-colors font-medium"
          >
            <CheckCircle size={11} />
            Marcar como realizada
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-[10px] text-red-500 hover:bg-red-50
                       px-2 py-1 rounded-md transition-colors font-medium"
          >
            <Zap size={11} />
            Cancelar sessão
          </button>
        </div>
      )}
    </div>
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
    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[status] ?? "bg-gray-300"}`} />
  );
}
