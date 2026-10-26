# Feira System — Front-End + Central de Acessibilidade

Front-end completo do Feira System, construído em **React + Vite**,
consumindo exclusivamente as APIs já existentes em `backend/`.
**Nenhum arquivo do backend foi modificado.**

---

## 1. Tecnologias utilizadas

- React 18 + Vite 5
- React Router 6 (rotas e proteção de rotas autenticadas)
- Axios (camada de serviços de API)
- Chart.js + react-chartjs-2 (gráficos)
- jsPDF + jspdf-autotable (exportação de relatórios em PDF no cliente)
- lucide-react (ícones acessíveis, com `aria-hidden` nos decorativos)
- CSS puro organizado por módulo (sem framework de UI pronto), com
  variáveis CSS para tema claro/escuro

Nenhuma biblioteca de UI "pesada" foi adicionada — a interface é
construída com componentes próprios, reutilizáveis e leves.

---

## 2. Estrutura do projeto

```
frontend/
├── src/
│   ├── components/
│   │   ├── accessibility/   → AccessibilityButton, AccessibilityPanel
│   │   ├── layout/          → Sidebar, Header, Layout, ProtectedRoute
│   │   ├── ui/               → Button, Input, Select, Modal, Card, Table,
│   │   │                        Badge, Alert, Toast, Loading, EmptyState,
│   │   │                        Pagination
│   │   └── charts/            → LineChart, BarChart, DonutChart, ChartWithTable
│   ├── pages/
│   │   ├── Login/, Cadastro/, EsqueciSenha/, RedefinirSenha/
│   │   ├── Dashboard/, Produtos/, Vendas/, Estoque/,
│   │   │   Desperdicios/, Relatorios/, Perfil/
│   │   └── shared/            → CSS compartilhado entre páginas de listagem
│   ├── services/              → api.js + um serviço por recurso do backend
│   ├── context/                → AuthContext, AccessibilityContext, ToastContext
│   ├── hooks/                  → useAuth, useAccessibility, useToast
│   ├── utils/                  → formatters, download, pdfRelatorio
│   ├── styles/                  → variables.css, global.css, accessibility.css
│   ├── App.jsx, main.jsx
├── index.html
├── package.json
└── vite.config.js
```

---

## 3. Como executar

### Backend (já existente, sem alterações)
```bash
cd backend
cp .env.example .env    # preencha DB_*, JWT_SECRET etc.
npm install
npm run dev              # http://localhost:3000
```

### Frontend
```bash
cd frontend
cp .env.example .env     # ajuste VITE_API_URL se necessário
npm install
npm run dev               # http://localhost:5173
```

O `.env.example` do front já aponta para `http://localhost:3000/api`,
que é a porta padrão do backend.

---

## 4. Integração com cada API (nada foi inventado)

| Recurso        | Endpoints reais consumidos                                                   | Página(s)                     |
|----------------|-------------------------------------------------------------------------------|--------------------------------|
| Autenticação    | `POST /auth/login`, `/auth/registro`, `/auth/esqueci-senha`, `/auth/redefinir-senha` | Login, Cadastro, EsqueciSenha, RedefinirSenha |
| Produtos        | `GET/POST /produtos`, `GET/PUT/DELETE /produtos/:id`, `GET /produtos/estoque-baixo` | Produtos, Estoque, Dashboard, Vendas |
| Vendas          | `GET/POST /vendas`, `GET /vendas/:id`, `PATCH /vendas/:id/cancelar`          | Vendas                          |
| Desperdícios    | `GET/POST /desperdicios`, `GET /desperdicios/exportar/pdf`, `/exportar/word` | Desperdícios                     |
| Relatórios      | `GET /relatorios/resumo`, `/hoje`, `/graficos`, `/kpis`                       | Dashboard, Relatórios            |
| Metas           | `GET /metas/progresso`, `POST /metas`                                        | Dashboard (card "Meta do mês")  |

**Sobre a exportação de relatórios em PDF/Word:** o backend só gera o
binário do arquivo (pdfkit/docx) para **Desperdícios** — a página
Desperdícios usa exatamente isso. Para o relatório geral, o próprio
`relatoriosService.js` do backend indica em comentário que
`/relatorios/pdf` retorna **dados em JSON para montagem do PDF no
cliente**; por isso a página Relatórios usa `jsPDF` no navegador com
os dados reais vindos de `/relatorios/resumo` e `/relatorios/kpis` —
nenhum endpoint novo foi criado no backend para isso.

Não existe endpoint de exportação Word para o relatório geral nem de
"movimentações de estoque" detalhadas — por isso essas duas telas não
oferecem essas ações (ver seção 9, "Limitações conhecidas").

---

## 5. Recursos da Central de Acessibilidade

Botão flutuante (`♿`), arrastável com mouse, toque **e teclado** (setas
direcionais), disponível em todas as páginas autenticadas. Abre um
painel lateral com:

- **Tamanho da fonte** — A−, A (normal), A+ (5 passos controlados, sem
  quebrar o layout)
- **Espaçamento entre linhas** — 1.0 / 1.5 / 2.0
- **Espaçamento entre letras** — normal / amplo / muito amplo
- **Espaçamento entre palavras** — normal / amplo / muito amplo
- **Modo escuro** — troca contraste de cards, menus, formulários,
  tabelas, gráficos e modais
- **Redução de animações** — aplica `prefers-reduced-motion` forçado
  (`animation-duration: 0.01ms !important` etc.)
- **Destaque do foco** — reforça o `:focus-visible` padrão (que já é
  sempre visível, nunca removido, em todo o sistema)
- **Modo de leitura** — aumenta espaçamento e reduz elementos
  decorativos
- **Posição da Central** — escolha o canto padrão do botão flutuante

Todas as preferências (exceto a posição momentânea do arrasto) ficam
salvas em `localStorage` sob as chaves pedidas no prompt
(`accessibility-font-size`, `accessibility-dark-mode`,
`accessibility-line-spacing`, `accessibility-letter-spacing`,
`accessibility-reduced-motion`, mais `accessibility-word-spacing`,
`accessibility-focus-highlight`, `accessibility-reading-mode` e
`accessibility-panel-position`) e são restauradas automaticamente ao
reabrir o navegador.

---

## 6. Melhorias de acessibilidade (WCAG 2.2) aplicadas

- HTML semântico (`header`, `nav`, `main`, `section`, `aside`, `footer`)
  em vez de `div`s genéricas
- Skip link ("Pular para o conteúdo principal") no topo de cada página
- Todo campo de formulário tem `label` associado, `aria-describedby`
  para dicas/erros e `aria-invalid`/`aria-required` quando aplicável
- Modais e o painel de acessibilidade têm foco preso (focus trap),
  fecham com `Esc` e devolvem o foco ao elemento que os abriu
- `:focus-visible` sempre visível (nunca removido) em toda a aplicação
- Tabelas com `<caption>`/`<th scope="col">`; em telas ≤720px viram
  cards em vez de forçar rolagem apertada
- Todo gráfico tem uma alternativa em tabela de dados (`ChartWithTable`)
  e um resumo textual (`aria-label`) para quem não pode visualizá-lo
- Indicadores de estoque baixo/normal combinam cor **e** texto/ícone
  (nunca dependem só da cor)
- Toasts e alertas usam `role="status"`/`role="alert"` com `aria-live`
- Botões e campos com altura mínima de 44px (alvo de toque adequado)

---

## 7. Melhorias de performance

- Vite com build otimizado e tree-shaking
- Componentes de UI pequenos e reutilizáveis (sem duplicação de código)
- Nenhuma lib desnecessária adicionada (sem UI kit pesado, sem lodash,
  etc.)
- Chamadas à API paralelizadas com `Promise.all` no Dashboard e em
  telas que dependem de múltiplos recursos

---

## 8. Testes realizados

- **Build de produção**: `npm run build` executado com sucesso, sem
  erros de compilação.
- **Funcionalidade**: fluxo de login/cadastro, CRUD de produtos,
  registro de venda com múltiplos itens e baixa de estoque,
  cancelamento de venda com reversão de estoque, registro de
  desperdício com cálculo de prejuízo, exportação real de PDF/Word de
  desperdícios, exportação de PDF de relatórios, definição de meta e
  acompanhamento de progresso — todos testados manualmente contra os
  contratos reais dos controllers/services do backend.
- **Acessibilidade**: navegação completa por Tab/Shift+Tab/Enter/Espaço/
  Escape testada nos modais, no painel de acessibilidade e no menu
  lateral; verificação de foco visível, contraste em modo claro e
  escuro, e funcionamento do zoom de fonte da Central de Acessibilidade.
- **Responsividade**: verificação visual em 320px, 375px, 768px, 1024px
  e 1440px — sidebar vira menu off-canvas, tabelas viram cards, e
  formulários ocupam a largura disponível abaixo de 960px.

---

## 9. Limitações conhecidas (por não inventar endpoints)

- **Movimentações de estoque detalhadas**: o backend não expõe um
  histórico de movimentações (entradas/saídas) — apenas o saldo atual
  de cada produto (que já reflete vendas e desperdícios). A tela de
  Estoque mostra o saldo e o indicador de estoque baixo/normal, com
  uma nota explicando que o saldo é atualizado automaticamente.
- **Exportação Word do relatório geral**: só existe endpoint de
  exportação Word para Desperdícios. O relatório geral oferece PDF
  (gerado no cliente, com dados reais da API).
- **Atualização de perfil**: o backend não tem uma rota para editar
  nome/e-mail/nome da banca depois do cadastro — a tela de Perfil é
  somente leitura, com atalho para o fluxo de recuperação de senha
  já existente.
