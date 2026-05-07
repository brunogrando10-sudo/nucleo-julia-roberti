import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), "HH:mm", { locale: ptBR });
}

export function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
}

export function getCurrentMonth(): string {
  return format(new Date(), "yyyy-MM", { locale: ptBR });
}

export function getMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return format(date, "MMMM 'de' yyyy", { locale: ptBR });
}

export const SESSION_STATUS_LABELS: Record<string, string> = {
  agendada: "Agendada",
  paga: "Paga",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  avulso: "Avulso",
  mensal: "Mensal",
};
