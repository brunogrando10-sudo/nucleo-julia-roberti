// Tipos centrais do sistema

export type PaymentType = "avulso" | "mensal";

export type SessionStatus = "agendada" | "paga" | "realizada" | "cancelada";

export type BillingMessageTrigger = "D-5" | "D-2" | "D-1" | "confirmacao";

export type BillingMessageStatus = "pendente" | "enviado" | "falhou";

export interface Patient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  payment_type: PaymentType;
  session_value?: number;
  notes?: string;
  active: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  patient_id: string;
  gcal_event_id?: string;
  scheduled_at: string;
  status: SessionStatus;
  amount?: number;
  notes?: string;
  created_at: string;
  patient?: Patient;
}

export interface BillingRule {
  id: string;
  patient_id: string;
  mes_referencia: string;
  paid_upfront: boolean;
  amount_paid?: number;
  payment_date?: string;
  created_at: string;
  patient?: Patient;
}

export interface BillingMessage {
  id: string;
  session_id: string;
  trigger_day?: BillingMessageTrigger;
  sent_at?: string;
  status: BillingMessageStatus;
  message_body?: string;
  session?: Session;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_date?: string;
  category?: string;
  created_at: string;
}
