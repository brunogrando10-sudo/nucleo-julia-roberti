"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Patient, PaymentType } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { Plus, Search, Phone, Mail, User } from "lucide-react";
import toast from "react-hot-toast";

const PAYMENT_OPTIONS = [
  { value: "avulso", label: "Avulso" },
  { value: "mensal", label: "Mensal" },
];

const FILTER_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "avulso", label: "Avulso" },
  { value: "mensal", label: "Mensal" },
  { value: "inativos", label: "Inativos" },
];

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  payment_type: "avulso" as PaymentType,
  session_value: "",
  notes: "",
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    const supabase = createClient();
    const { data } = await supabase
      .from("patients")
      .select("*")
      .order("name");
    setPatients(data ?? []);
    setLoading(false);
  }

  function openCreate() {
    setEditingPatient(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(patient: Patient) {
    setEditingPatient(patient);
    setForm({
      name: patient.name,
      phone: patient.phone,
      email: patient.email ?? "",
      payment_type: patient.payment_type,
      session_value: patient.session_value?.toString() ?? "",
      notes: patient.notes ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.phone) {
      toast.error("Nome e telefone são obrigatórios.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      payment_type: form.payment_type,
      session_value: form.session_value ? parseFloat(form.session_value) : null,
      notes: form.notes.trim() || null,
    };

    if (editingPatient) {
      const { error } = await supabase
        .from("patients")
        .update(payload)
        .eq("id", editingPatient.id);

      if (error) {
        toast.error("Erro ao atualizar paciente.");
      } else {
        toast.success("Paciente atualizado com sucesso!");
        setModalOpen(false);
        loadPatients();
      }
    } else {
      const { error } = await supabase.from("patients").insert(payload);

      if (error) {
        toast.error("Erro ao cadastrar paciente.");
      } else {
        toast.success("Paciente cadastrado com sucesso!");
        setModalOpen(false);
        loadPatients();
      }
    }

    setSaving(false);
  }

  async function toggleActive(patient: Patient) {
    const supabase = createClient();
    await supabase
      .from("patients")
      .update({ active: !patient.active })
      .eq("id", patient.id);
    loadPatients();
    toast.success(patient.active ? "Paciente inativado." : "Paciente reativado.");
  }

  const filtered = patients.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search);

    const matchFilter =
      filter === "todos"
        ? p.active
        : filter === "inativos"
        ? !p.active
        : p.active && p.payment_type === filter;

    return matchSearch && matchFilter;
  });

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle={`${patients.filter((p) => p.active).length} pacientes ativos`}
        action={
          <Button onClick={openCreate}>
            <Plus size={15} />
            Novo paciente
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-nude"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-brand-nude/40 bg-white
                       text-sm text-brand-dark placeholder:text-brand-nude/60
                       focus:outline-none focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium"
          />
        </div>
        <div className="flex gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all
                ${filter === opt.value
                  ? "bg-brand-dark text-white"
                  : "bg-white border border-brand-nude/40 text-brand-dark hover:bg-brand-light"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de pacientes */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-terracota border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-brand-nude text-sm">
            Nenhum paciente encontrado.
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onEdit={() => openEdit(patient)}
              onToggleActive={() => toggleActive(patient)}
            />
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPatient ? "Editar paciente" : "Novo paciente"}
      >
        <div className="space-y-4">
          <Input
            label="Nome completo *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nome do paciente"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Telefone / WhatsApp *"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(11) 99999-9999"
              type="tel"
            />
            <Input
              label="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@exemplo.com"
              type="email"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo de pagamento"
              value={form.payment_type}
              onChange={(e) =>
                setForm({ ...form, payment_type: e.target.value as PaymentType })
              }
              options={PAYMENT_OPTIONS}
            />
            <Input
              label="Valor da sessão (R$)"
              value={form.session_value}
              onChange={(e) => setForm({ ...form, session_value: e.target.value })}
              placeholder="0,00"
              type="number"
              step="0.01"
              min="0"
            />
          </div>
          <Textarea
            label="Observações"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Anotações internas sobre o paciente..."
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PatientCard({
  patient,
  onEdit,
  onToggleActive,
}: {
  patient: Patient;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  return (
    <Card className={!patient.active ? "opacity-60" : ""}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-medium/10 flex items-center justify-center flex-shrink-0">
            <User size={15} className="text-brand-medium" />
          </div>
          <div>
            <p className="font-medium text-brand-dark text-sm">{patient.name}</p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium
              ${patient.payment_type === "mensal"
                ? "bg-brand-medium/10 text-brand-medium"
                : "bg-brand-terracota/10 text-brand-terracota"
              }`}
            >
              {patient.payment_type === "mensal" ? "Mensal" : "Avulso"}
            </span>
          </div>
        </div>
        {patient.session_value && (
          <span className="text-sm font-semibold text-brand-dark">
            {formatCurrency(patient.session_value)}
          </span>
        )}
      </div>

      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-xs text-brand-nude">
          <Phone size={12} />
          {patient.phone}
        </div>
        {patient.email && (
          <div className="flex items-center gap-2 text-xs text-brand-nude truncate">
            <Mail size={12} />
            {patient.email}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-brand-light">
        <button
          onClick={onEdit}
          className="flex-1 text-xs py-1.5 rounded-lg text-brand-medium hover:bg-brand-medium/10
                     transition-colors font-medium"
        >
          Editar
        </button>
        <button
          onClick={onToggleActive}
          className="flex-1 text-xs py-1.5 rounded-lg text-brand-nude hover:bg-brand-nude/10
                     transition-colors font-medium"
        >
          {patient.active ? "Inativar" : "Reativar"}
        </button>
      </div>
    </Card>
  );
}
