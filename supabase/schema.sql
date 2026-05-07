-- ============================================================
-- Schema do Núcleo de Psicologia Julia Roberti
-- Executar no SQL Editor do Supabase
-- ============================================================

-- Habilitar RLS (Row Level Security)
alter table if exists patients disable row level security;
alter table if exists sessions disable row level security;
alter table if exists billing_rules disable row level security;
alter table if exists billing_messages disable row level security;
alter table if exists expenses disable row level security;

-- Drop e recriação das tabelas (seguro para dev)
drop table if exists billing_messages cascade;
drop table if exists billing_rules cascade;
drop table if exists sessions cascade;
drop table if exists patients cascade;
drop table if exists expenses cascade;

-- ============================================================
-- PACIENTES
-- ============================================================
create table patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  payment_type text check (payment_type in ('avulso', 'mensal')) default 'avulso',
  session_value numeric(10,2),
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- SESSÕES
-- ============================================================
create table sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  gcal_event_id text,
  scheduled_at timestamptz not null,
  status text check (status in ('agendada', 'paga', 'realizada', 'cancelada')) default 'agendada',
  amount numeric(10,2),
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- REGRAS DE COBRANÇA MENSAL
-- ============================================================
create table billing_rules (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  mes_referencia text not null,
  paid_upfront boolean default false,
  amount_paid numeric(10,2),
  payment_date timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- MENSAGENS DE COBRANÇA
-- ============================================================
create table billing_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  trigger_day text check (trigger_day in ('D-5', 'D-2', 'D-1', 'confirmacao')),
  sent_at timestamptz,
  status text check (status in ('pendente', 'enviado', 'falhou')) default 'pendente',
  message_body text
);

-- ============================================================
-- DESPESAS
-- ============================================================
create table expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(10,2) not null,
  due_date date not null,
  paid boolean default false,
  paid_date date,
  category text,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS — acesso apenas para usuários autenticados
-- ============================================================
alter table patients enable row level security;
alter table sessions enable row level security;
alter table billing_rules enable row level security;
alter table billing_messages enable row level security;
alter table expenses enable row level security;

-- Políticas: authenticated pode tudo
create policy "authenticated full access" on patients
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on sessions
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on billing_rules
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on billing_messages
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on expenses
  for all to authenticated using (true) with check (true);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
create index idx_sessions_scheduled_at on sessions(scheduled_at);
create index idx_sessions_patient_id on sessions(patient_id);
create index idx_sessions_status on sessions(status);
create index idx_billing_messages_session_id on billing_messages(session_id);
create index idx_expenses_due_date on expenses(due_date);
