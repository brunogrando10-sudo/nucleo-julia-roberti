"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Session, Patient, SessionStatus } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { formatCurrency, formatTime } from "@/lib/utils";
import { Plus, ChevronLeft, ChevronRight, CheckCircle, DollarSign, Zap } from "lucide-react";
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
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [sessions, setSessions] = useState<SessionWithPatient[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    loadData(); // eslint-disable-line react-hooks/exhaustive-deps
  }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    const supabase = createClient();

    const [{ data: sessionData }, { data: patientData }] = await Promise.all([
      supabase
        .from("sessions")
        .select("*, patient:patients(*)")
        .gte("scheduled_at", weekStart.toISOString())
        .lte("scheduled_at", weekEnd.toISOString())
        .order("scheduled_at"),
      supabase.from("patients").select("*").eq("active", true).order("name"),
    ]);

    setSessions((sessionData as SessionWithPatient[]) ?? []);
    setPatients(patientData ?? []);
    setLoading(false);
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

    const { error } = await supabase.from("sessions").insert({
      patient_id: form.patient_id,
      scheduled_at: scheduledAt,
      status: "agendada",
      amount,
      notes: form.notes || null,
    });

    if (error) {
      toast.error("Erro ao criar sessão.");
    } else {
      toast.success("Sessão agendada com sucesso!");
      setModalOpen(false);
      setForm(EMPTY_FORM);
      loadData();
    }

    setSaving(false);
  }

  async function updateStatus(sessionId: string, status: SessionStatus) {
    const supabase = createClient();
    await supabase.from("sessions").update({ status }).eq("id", sessionId);
    loadData();
    toast.success(
      status === "realizada"
        ? "Sessão marcada como realizada."
        : "Pagamento registrado!"
    );
  }

  async function cancelSession(sessionId: string) {
    const supabase = createClient();
    await supabase
      .from("sessions")
      .update({ status: "cancelada" })
      .eq("id", sessionId);
    loadData();
    toast.success("Sessão cancelada.");
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
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={15} />
            Adicionar sessão
          </Button>
        }
      />

      {/* Navegação semanal */}
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

      {/* Grade semanal */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-terracota border-t-transparent" />
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
                {/* Cabeçalho do dia */}
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

                {/* Sessões do dia */}
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
                        onMarkDone={() => updateStatus(session.id, "realizada")}
                        onMarkPaid={() => updateStatus(session.id, "paga")}
                        onCancel={() => cancelSession(session.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nova sessão */}
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
  onMarkDone,
  onMarkPaid,
  onCancel,
}: {
  session: SessionWithPatient;
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
          <SessionDot status={session.status} />
        </div>
        <p className="text-[10px] text-brand-nude">
          {formatTime(session.scheduled_at)}
          {session.amount && ` · ${formatCurrency(session.amount)}`}
        </p>
      </div>

      {/* Ações (expandidas) */}
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
