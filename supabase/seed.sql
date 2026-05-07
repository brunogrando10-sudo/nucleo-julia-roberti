-- ============================================================
-- Dados de seed para teste
-- Executar APÓS o schema.sql
-- ============================================================

-- Pacientes fictícios
insert into patients (id, name, phone, email, payment_type, session_value, notes, active) values
(
  'a1b2c3d4-0001-0000-0000-000000000001',
  'Ana Clara Ferreira',
  '(11) 98765-4321',
  'anaclara@email.com',
  'mensal',
  180.00,
  'Paciente há 2 anos. Sessões às terças e quintas.',
  true
),
(
  'a1b2c3d4-0002-0000-0000-000000000002',
  'Bruno Mendes Oliveira',
  '(21) 99123-4567',
  'brunomendes@email.com',
  'avulso',
  200.00,
  'Ansiedade generalizada. Prefere horário matutino.',
  true
),
(
  'a1b2c3d4-0003-0000-0000-000000000003',
  'Carla Souza Lima',
  '(11) 97654-3210',
  null,
  'mensal',
  160.00,
  'Encaminhada pelo Dr. Roberto. Sessões às quartas.',
  true
),
(
  'a1b2c3d4-0004-0000-0000-000000000004',
  'Diego Santos Ramos',
  '(31) 98888-7777',
  'diego.ramos@gmail.com',
  'avulso',
  180.00,
  null,
  true
),
(
  'a1b2c3d4-0005-0000-0000-000000000005',
  'Fernanda Costa Alves',
  '(11) 96543-2109',
  'fercosta@email.com',
  'mensal',
  200.00,
  'Paciente de longa data. Muito comprometida.',
  false
);

-- Sessões: 3 na próxima semana com status diferentes
insert into sessions (patient_id, scheduled_at, status, amount) values
(
  'a1b2c3d4-0001-0000-0000-000000000001',
  date_trunc('day', now() + interval '1 day') + interval '10 hours',
  'paga',
  180.00
),
(
  'a1b2c3d4-0002-0000-0000-000000000002',
  date_trunc('day', now() + interval '2 days') + interval '14 hours',
  'agendada',
  200.00
),
(
  'a1b2c3d4-0003-0000-0000-000000000003',
  date_trunc('day', now() + interval '3 days') + interval '9 hours',
  'agendada',
  160.00
),
(
  'a1b2c3d4-0004-0000-0000-000000000004',
  date_trunc('day', now() - interval '7 days') + interval '11 hours',
  'realizada',
  180.00
),
(
  'a1b2c3d4-0001-0000-0000-000000000001',
  date_trunc('day', now()) + interval '8 hours 30 minutes',
  'agendada',
  180.00
);

-- Despesas do mês atual
insert into expenses (description, amount, due_date, paid, category) values
(
  'Aluguel da sala',
  1800.00,
  date_trunc('month', now())::date + interval '5 days',
  true,
  'aluguel'
),
(
  'Plataforma Psicogestão',
  89.90,
  date_trunc('month', now())::date + interval '10 days',
  false,
  'plataforma'
),
(
  'Material de escritório',
  120.00,
  date_trunc('month', now())::date + interval '15 days',
  false,
  'material'
);

-- Mensagem de cobrança para a sessão já paga (Ana Clara)
insert into billing_messages (session_id, trigger_day, sent_at, status, message_body)
select
  s.id,
  'D-2',
  now() - interval '1 day',
  'enviado',
  'Olá Ana Clara! Lembrando da sua sessão amanhã às 10h. Valor: R$ 180,00.'
from sessions s
join patients p on s.patient_id = p.id
where p.name = 'Ana Clara Ferreira'
and s.status = 'paga'
limit 1;
