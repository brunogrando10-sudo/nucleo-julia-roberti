# Setup — Núcleo de Psicologia Julia Roberti

## 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **SQL Editor** e execute o arquivo `supabase/schema.sql`
3. Em seguida execute o arquivo `supabase/seed.sql` para os dados de teste
4. Copie as credenciais em **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Criar usuário de acesso

No Supabase, vá em **Authentication → Users → Add User** e crie:
- Email: `julia@nucleopsicologia.com` (ou o que preferir)
- Senha: escolha uma senha segura

## 3. Configurar variáveis de ambiente

Edite o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4. Rodar localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 5. Deploy na Vercel

1. Faça push do projeto para um repositório GitHub
2. Importe o projeto na [Vercel](https://vercel.com)
3. Adicione as variáveis de ambiente no painel da Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy automático

## Estrutura do projeto

```
app/
  (auth)/login/          # Página de login
  (dashboard)/
    dashboard/           # Dashboard com resumo do dia
    patients/            # Gestão de pacientes
    agenda/              # Agenda semanal
    financeiro/          # DRE e despesas
    cobranca/            # Régua de cobrança
components/
  layout/Sidebar.tsx     # Navegação lateral
  ui/                    # Componentes reutilizáveis
lib/
  supabase/              # Clientes Supabase (browser e server)
  utils.ts               # Formatadores e utilitários
types/index.ts           # Tipos TypeScript
supabase/
  schema.sql             # Estrutura do banco de dados
  seed.sql               # Dados de teste
```

## Integrações futuras (campos já preparados no banco)

| Integração | Campo no banco | Status |
|---|---|---|
| WhatsApp (Evolution API) | `billing_messages.message_body` | Botão placeholder |
| Google Calendar | `sessions.gcal_event_id` | Botão placeholder |
| Pix (automático) | `billing_rules.paid_upfront` | Botão placeholder |
| NFS-e | — | Botão placeholder |
