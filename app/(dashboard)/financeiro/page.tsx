"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Session, Expense } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, CheckCircle, Clock } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

const EXPENSE_CATEGORY_OPTIONS = [
  { value: "", label: "Sem categoria" },
  { value: "aluguel", label: "Aluguel" },
  { value: "plataforma", label: "Plataforma / Software" },
  { value: "material", label: "Material de escritório" },
  { value: "marketing", label: "Marketing" },
  { value: "contabilidade", label: "Contabilidade" },
  { value: "outros", label: "Outros" },
];

const EMPTY_EXPENSE = {
  description: "",
  amount: "",
  due_date: format(new Date(), "yyyy-MM-dd"),
  category: "",
  paid: false,
};

export default function FinanceiroPage() {
  const [selectedMonth, setSelectedMonth] = useState(() =>
    format(new Date(), "yyyy-MM")
  );
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData(); // eslint-disable-line react-hooks/exhaustive-deps
  }, [selectedMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    const supabase = createClient();

    const [year, month] = selectedMonth.split("-").map(Number);
    const start = startOfMonth(new Date(year, month - 1)).toISOString();
    const end = endOfMonth(new Date(year, month - 1)).toISOString();

    const { data: sessionData } = await supabase
      .from("sessions")
      .select("*")
      .gte("scheduled_at", start)
      .lte("scheduled_at", end)
      .neq("status", "cancelada")
      .order("scheduled_at");

    // Supabase não suporta LIKE em date — filtramos por range
    const allExpenses = await supabase
      .from("expenses")
      .select("*")
      .gte("due_date", `${selectedMonth}-01`)
      .lte("due_date", `${selectedMonth}-31`)
      .order("due_date");

    setSessions(sessionData ?? []);
    setExpenses(allExpenses.data ?? []);
    setLoading(false);
  }

  async function handleAddExpense() {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.due_date) {
      toast.error("Preencha descrição, valor e vencimento.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from("expenses").insert({
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      due_date: expenseForm.due_date,
      category: expenseForm.category || null,
      paid: expenseForm.paid,
    });

    if (error) {
      toast.error("Erro ao cadastrar despesa.");
    } else {
      toast.success("Despesa cadastrada!");
      setExpenseModal(false);
      setExpenseForm(EMPTY_EXPENSE);
      loadData();
    }

    setSaving(false);
  }

  async function toggleExpensePaid(expense: Expense) {
    const supabase = createClient();
    await supabase
      .from("expenses")
      .update({
        paid: !expense.paid,
        paid_date: !expense.paid ? format(new Date(), "yyyy-MM-dd") : null,
      })
      .eq("id", expense.id);
    loadData();
    toast.success(expense.paid ? "Despesa reaberta." : "Despesa paga!");
  }

  // Métricas calculadas
  const receitaRealizada = sessions
    .filter((s) => s.status === "paga" || s.status === "realizada")
    .reduce((acc, s) => acc + (s.amount ?? 0), 0);

  const receitaProjetada = sessions.reduce((acc, s) => acc + (s.amount ?? 0), 0);

  const totalDespesas = expenses.reduce((acc, e) => acc + e.amount, 0);
  const despesasPagas = expenses
    .filter((e) => e.paid)
    .reduce((acc, e) => acc + e.amount, 0);

  const resultado = receitaRealizada - totalDespesas;

  // Meses disponíveis para seleção (últimos 6 + próximos 2)
  const monthOptions = [];
  for (let i = -5; i <= 2; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const val = format(d, "yyyy-MM");
    const label = format(d, "MMMM yyyy", { locale: ptBR });
    monthOptions.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }

  const monthLabel = format(
    new Date(parseInt(selectedMonth.split("-")[0]), parseInt(selectedMonth.split("-")[1]) - 1, 1),
    "MMMM 'de' yyyy",
    { locale: ptBR }
  );

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle={monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        action={
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-lg border border-brand-nude/40 bg-white text-sm
                         text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium/30"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-terracota border-t-transparent" />
        </div>
      ) : (
        <>
          {/* DRE Simplificado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <DRECard
              icon={<TrendingUp size={18} className="text-green-600" />}
              label="Receita bruta"
              realized={receitaRealizada}
              projected={receitaProjetada}
              color="green"
            />
            <DRECard
              icon={<TrendingDown size={18} className="text-red-500" />}
              label="Total despesas"
              realized={despesasPagas}
              projected={totalDespesas}
              color="red"
            />
            <Card className="flex items-start gap-4">
              <div
                className={`p-2.5 rounded-xl ${resultado >= 0 ? "bg-green-50" : "bg-red-50"}`}
              >
                {resultado >= 0 ? (
                  <ArrowUpRight size={18} className="text-green-600" />
                ) : (
                  <ArrowDownRight size={18} className="text-red-500" />
                )}
              </div>
              <div>
                <p className="text-xs text-brand-nude font-medium uppercase tracking-wide">
                  Resultado
                </p>
                <p
                  className={`text-2xl font-bold mt-0.5 ${resultado >= 0 ? "text-green-600" : "text-red-500"}`}
                >
                  {formatCurrency(resultado)}
                </p>
                <p className="text-xs text-brand-nude mt-0.5">receita - despesas</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sessões do mês */}
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-brand-light">
                <h2 className="font-serif text-xl text-brand-dark font-light">
                  Sessões do mês
                </h2>
                <p className="text-xs text-brand-nude mt-0.5">
                  {sessions.filter((s) => s.status === "paga" || s.status === "realizada").length} de{" "}
                  {sessions.length} confirmadas
                </p>
              </div>
              <div className="divide-y divide-brand-light max-h-80 overflow-y-auto scrollbar-thin">
                {sessions.length === 0 ? (
                  <p className="text-center text-brand-nude text-sm py-8">
                    Nenhuma sessão neste mês.
                  </p>
                ) : (
                  sessions.map((session) => (
                    <SessionRow key={session.id} session={session} />
                  ))
                )}
              </div>
            </Card>

            {/* Despesas */}
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-brand-light flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl text-brand-dark font-light">
                    Despesas
                  </h2>
                  <p className="text-xs text-brand-nude mt-0.5">
                    {formatCurrency(despesasPagas)} pagas de{" "}
                    {formatCurrency(totalDespesas)} total
                  </p>
                </div>
                <Button size="sm" onClick={() => setExpenseModal(true)}>
                  <Plus size={13} />
                  Adicionar
                </Button>
              </div>
              <div className="divide-y divide-brand-light max-h-80 overflow-y-auto scrollbar-thin">
                {expenses.length === 0 ? (
                  <p className="text-center text-brand-nude text-sm py-8">
                    Nenhuma despesa cadastrada.
                  </p>
                ) : (
                  expenses.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      onToggle={() => toggleExpensePaid(expense)}
                    />
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Modal nova despesa */}
      <Modal
        open={expenseModal}
        onClose={() => setExpenseModal(false)}
        title="Nova despesa"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Descrição *"
            value={expenseForm.description}
            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
            placeholder="Ex: Aluguel sala"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor (R$) *"
              type="number"
              step="0.01"
              min="0"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              placeholder="0,00"
            />
            <Input
              label="Vencimento *"
              type="date"
              value={expenseForm.due_date}
              onChange={(e) => setExpenseForm({ ...expenseForm, due_date: e.target.value })}
            />
          </div>
          <Select
            label="Categoria"
            value={expenseForm.category}
            onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
            options={EXPENSE_CATEGORY_OPTIONS}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setExpenseModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddExpense} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DRECard({
  icon,
  label,
  realized,
  projected,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  realized: number;
  projected: number;
  color: "green" | "red";
}) {
  const bg = color === "green" ? "bg-green-50" : "bg-red-50";
  const textColor = color === "green" ? "text-green-600" : "text-red-500";

  return (
    <Card className="flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${bg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-brand-nude font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${textColor}`}>
          {formatCurrency(realized)}
        </p>
        <p className="text-xs text-brand-nude mt-0.5">
          projetado: {formatCurrency(projected)}
        </p>
      </div>
    </Card>
  );
}

function SessionRow({ session }: { session: Session }) {
  const statusColor: Record<string, string> = {
    agendada: "text-red-500",
    paga: "text-green-600",
    realizada: "text-gray-500",
    cancelada: "text-brand-nude",
  };
  const statusLabel: Record<string, string> = {
    agendada: "Agendada",
    paga: "Paga",
    realizada: "Realizada",
    cancelada: "Cancelada",
  };

  return (
    <div className="flex items-center justify-between px-5 py-3 hover:bg-brand-nude/5 transition-colors">
      <div>
        <p className="text-sm text-brand-dark">
          {format(parseISO(session.scheduled_at), "dd/MM HH:mm", { locale: ptBR })}
        </p>
        {session.notes && (
          <p className="text-xs text-brand-nude">{session.notes}</p>
        )}
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-brand-dark">
          {session.amount ? formatCurrency(session.amount) : "—"}
        </p>
        <p className={`text-xs font-medium ${statusColor[session.status]}`}>
          {statusLabel[session.status]}
        </p>
      </div>
    </div>
  );
}

function ExpenseRow({
  expense,
  onToggle,
}: {
  expense: Expense;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 hover:bg-brand-nude/5 transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className={`flex-shrink-0 transition-colors
            ${expense.paid ? "text-green-500 hover:text-green-700" : "text-brand-nude hover:text-brand-dark"}`}
        >
          <CheckCircle size={18} />
        </button>
        <div>
          <p className={`text-sm font-medium ${expense.paid ? "line-through text-brand-nude" : "text-brand-dark"}`}>
            {expense.description}
          </p>
          <p className="text-xs text-brand-nude flex items-center gap-1">
            <Clock size={10} />
            Venc. {formatDate(expense.due_date)}
            {expense.category && ` · ${expense.category}`}
          </p>
        </div>
      </div>
      <p className={`text-sm font-semibold ${expense.paid ? "text-green-600" : "text-brand-dark"}`}>
        {formatCurrency(expense.amount)}
      </p>
    </div>
  );
}
