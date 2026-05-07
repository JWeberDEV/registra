# 💰 FinanceHub by XPIRIA

<div align="center">

![FinanceHub Logo](https://via.placeholder.com/200x60/FF64B3/FFFFFF?text=FinanceHub)

**Sistema de Gestão Financeira Pessoal Inteligente**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 📋 Índice

- [🌟 Sobre o Projeto](#-sobre-o-projeto)
- [✨ Funcionalidades](#-funcionalidades)
- [🛠️ Tecnologias](#️-tecnologias)
- [📱 Arquitetura](#-arquitetura)
- [🚀 Começando](#-começando)
- [⚙️ Configuração](#️-configuração)
- [🎨 Personalização](#-personalização)
- [📊 Dashboard Admin](#-dashboard-admin)
- [🔒 Segurança](#-segurança)
- [📚 API Documentation](#-api-documentation)
- [🤝 Contribuindo](#-contribuindo)
- [📄 Licença](#-licença)
- [👥 Equipe XPIRIA](#-equipe-xpiria)

---

## 🌟 Sobre o Projeto

O **FinanceHub** é uma solução SaaS completa para gestão financeira pessoal, desenvolvida pela **XPIRIA**. Combina tecnologia de ponta com uma interface moderna e intuitiva para oferecer controle total sobre suas finanças.

### 🎯 Missão
Democratizar o acesso a ferramentas de gestão financeira profissional, tornando o controle financeiro pessoal simples, inteligente e acessível para todos.

### 🚀 Visão
Ser a plataforma líder em gestão financeira pessoal, reconhecida pela inovação, segurança e experiência do usuário.

---

## ✨ Funcionalidades

### 💳 Gestão Financeira Core
- **Dashboard Inteligente** - Visão consolidada de receitas, despesas e saldo
- **Transações** - Registro e categorização automatizada de movimentações
- **Carteiras Múltiplas** - Gerencie diferentes contas e cartões
- **Categorias Personalizáveis** - Sistema flexível de categorização
- **Relatórios Avançados** - Análises detalhadas com gráficos interativos
- **Lembretes Inteligentes** - Notificações para contas a pagar/receber
- **Métodos de Pagamento** - Controle completo de cartões e contas

### 🎨 Experiência do Usuário
- **Temas Personalizáveis** - Light/Dark mode com temas customizados
- **Logos Dinâmicos** - Troca automática baseada no tema
- **Interface Responsiva** - Perfeita em desktop, tablet e mobile
- **PWA Ready** - Funciona offline e pode ser instalado
- **Animações Fluidas** - Transições suaves com Framer Motion

### 🛡️ Segurança & Administração
- **Autenticação JWT** - Sistema seguro de login/logout
- **Níveis de Usuário** - Super Admin, Admin e Usuário
- **Impersonação** - Suporte seguro para debugging
- **Auditoria Completa** - Logs de todas as ações importantes
- **Backup Automático** - Proteção de dados integrada

### 🔧 Administração Avançada
- **Painel SaaS** - Gestão completa de usuários e sistema
- **Temas Globais** - Personalização visual para toda a aplicação
- **Gerenciamento de Logos** - Upload e gestão de marca por tema
- **Mensagens Personalizadas** - Welcome messages customizáveis
- **Analytics** - Métricas de uso e performance

---

## 🛠️ Tecnologias

### Frontend
- **React 18** - Biblioteca de interface moderna
- **TypeScript** - Tipagem estática para maior robustez
- **Vite** - Build tool otimizado para desenvolvimento
- **Tailwind CSS** - Framework CSS utilitário
- **Framer Motion** - Animações e transições fluidas
- **Radix UI** - Componentes acessíveis e customizáveis
- **React Hook Form** - Formulários performáticos
- **TanStack Query** - Gerenciamento de estado server-side
- **Wouter** - Roteamento leve e eficiente
- **Zod** - Validação de schemas TypeScript

### Backend
- **Node.js** - Runtime JavaScript server-side
- **Express.js** - Framework web minimalista
- **TypeScript** - Código backend tipado
- **PostgreSQL** - Banco de dados relacional robusto
- **Drizzle ORM** - ORM moderno e type-safe
- **JWT** - Autenticação stateless
- **Bcrypt** - Hash seguro de senhas
- **Multer** - Upload de arquivos
- **CORS** - Políticas de acesso cross-origin

### DevOps & Infraestrutura
- **Docker** - Containerização da aplicação
- **Docker Compose** - Orquestração de serviços
- **PostgreSQL** - Banco de dados em container
- **Nginx** - Reverse proxy e servir estáticos
- **PM2** - Process manager para Node.js

---

## 📱 Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React/Vite)  │◄──►│  (Node.js/API)  │◄──►│  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   • React 18    │    │   • Express.js  │    │   • ACID        │
│   • TypeScript  │    │   • JWT Auth    │    │   • Relational  │
│   • Tailwind    │    │   • Drizzle ORM │    │   • Migrations  │
│   • TanStack    │    │   • Validation  │    │   • Indexes     │
│   • Framer      │    │   • File Upload │    │   • Constraints │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 🏗️ Estrutura do Projeto

```
financeiro/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── hooks/          # Custom hooks
│   │   ├── utils/          # Utilitários e helpers
│   │   ├── lib/            # Configurações de bibliotecas
│   │   └── styles/         # Estilos globais
│   ├── public/             # Arquivos estáticos
│   └── index.html          # Entry point
├── server/                 # Backend Node.js
│   ├── routes/             # Rotas da API
│   ├── middleware/         # Middlewares personalizados
│   ├── db/                 # Configuração do banco
│   ├── migrations/         # Migrações do banco
│   └── uploads/            # Arquivos enviados
├── shared/                 # Código compartilhado
│   └── schema.ts           # Schemas TypeScript
├── docker-compose.yml      # Configuração Docker
├── Dockerfile              # Imagem da aplicação
└── README.md              # Este arquivo
```

---

## 🚀 Começando

### 📋 Pré-requisitos

- **Node.js** 18+ 
- **PostgreSQL** 14+
- **Docker** (opcional, mas recomendado)
- **Git**

### 🔧 Instalação Rápida com Docker

```bash
# 1. Clone o repositório
git clone https://github.com/xpiria/financehub.git
cd financehub

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# 3. Inicie com Docker Compose
docker-compose up -d

# 4. Acesse a aplicação
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

### 🛠️ Instalação Manual

```bash
# 1. Clone e instale dependências
git clone https://github.com/xpiria/financehub.git
cd financehub
npm install

# 2. Configure o banco PostgreSQL
createdb financehub
# Configure as variáveis no .env

# 3. Execute as migrações
npm run migrate

# 4. Inicie o desenvolvimento
npm run dev
```

---

## ⚙️ Configuração

### 🌍 Variáveis de Ambiente

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/financehub"

# JWT
JWT_SECRET="your-super-secret-key-here"

# Upload
MAX_FILE_SIZE=5242880  # 5MB
UPLOAD_PATH="./uploads"

# CORS
CORS_ORIGIN="http://localhost:5173"

# Email (opcional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### 🎛️ Configuração do Banco

```sql
-- Criar usuário e banco
CREATE USER financehub WITH PASSWORD 'sua_senha_segura';
CREATE DATABASE financehub OWNER financehub;
GRANT ALL PRIVILEGES ON DATABASE financehub TO financehub;
```

### 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia frontend e backend
npm run dev:client   # Apenas frontend
npm run dev:server   # Apenas backend

# Build
npm run build        # Build de produção
npm run build:client # Build do frontend
npm run build:server # Build do backend

# Banco de dados
npm run migrate      # Executa migrações
npm run seed        # Popula dados iniciais

# Qualidade de código
npm run lint        # ESLint
npm run type-check  # TypeScript check
npm run test        # Testes unitários
```

---

## 🎨 Personalização

### 🎭 Sistema de Temas

O FinanceHub possui um sistema avançado de temas que permite:

- **Temas Separados**: Diferentes configurações para light/dark mode
- **Editor Visual**: Interface drag-and-drop para criação de temas
- **Preview em Tempo Real**: Veja mudanças instantaneamente
- **Aplicação Global**: Temas se aplicam em toda a aplicação

```typescript
// Exemplo de configuração de tema
interface ThemeConfig {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  // ... outras propriedades
}
```

### 🖼️ Logos Dinâmicos

- Upload de logos específicos para light/dark mode
- Troca automática baseada no tema atual
- Fallback elegante para logo padrão
- Suporte a múltiplos formatos (PNG, JPG, SVG)

### 🔧 Customização de Interface

```javascript
// Configurações disponíveis
const customizations = {
  themes: 'Temas personalizados por modo',
  logos: 'Logos específicos para cada tema',
  messages: 'Mensagens de boas-vindas customizáveis',
  branding: 'Personalização completa da marca'
};
```

---

## 📊 Dashboard Admin

### 👥 Gestão de Usuários
- **Listagem Completa**: Todos os usuários com filtros
- **Perfis Detalhados**: Informações completas de cada usuário
- **Níveis de Acesso**: Super Admin, Admin, Usuário
- **Impersonação Segura**: Debug como qualquer usuário
- **Auditoria**: Logs de ações administrativas

### 📈 Analytics & Métricas
- **Usuários Ativos**: Métricas de engajamento
- **Transações**: Volume e frequência
- **Performance**: Tempo de resposta e erros
- **Crescimento**: Tendências de uso

### 🛠️ Ferramentas Admin
- **Backup do Sistema**: Exportação completa de dados
- **Configurações Globais**: Ajustes do sistema
- **Logs do Sistema**: Monitoramento em tempo real
- **Manutenção**: Ferramentas de diagnóstico

---

## 🔒 Segurança

### 🛡️ Autenticação & Autorização
- **JWT Tokens**: Autenticação stateless segura
- **Refresh Tokens**: Renovação automática de sessões
- **Rate Limiting**: Proteção contra ataques
- **CORS**: Políticas de acesso rigorosas

### 🔐 Proteção de Dados
- **Criptografia**: Senhas hasheadas com bcrypt
- **Sanitização**: Inputs validados e sanitizados
- **SQL Injection**: Proteção via prepared statements
- **XSS Protection**: Headers de segurança configurados

### 📋 Compliance
- **LGPD Ready**: Preparado para conformidade
- **Audit Logs**: Rastreabilidade completa
- **Data Export**: Ferramentas de portabilidade
- **Data Deletion**: Remoção segura de dados

---

## 📚 API Documentation

### 🔗 Endpoints Principais

#### Autenticação
```http
POST /api/auth/login     # Login do usuário
POST /api/auth/register  # Registro de novo usuário
POST /api/auth/logout    # Logout seguro
GET  /api/auth/me        # Informações do usuário atual
```

#### Transações
```http
GET    /api/transactions       # Listar transações
POST   /api/transactions       # Criar transação
PUT    /api/transactions/:id   # Atualizar transação
DELETE /api/transactions/:id   # Deletar transação
```

#### Categorias
```http
GET    /api/categories         # Listar categorias
POST   /api/categories         # Criar categoria
PUT    /api/categories/:id     # Atualizar categoria
DELETE /api/categories/:id     # Deletar categoria
```

#### Temas (Admin)
```http
GET    /api/themes             # Listar temas
POST   /api/themes             # Criar tema
PUT    /api/themes/:id         # Atualizar tema
GET    /api/themes/active/:mode # Tema ativo por modo
POST   /api/themes/:id/activate-light # Ativar para light
POST   /api/themes/:id/activate-dark  # Ativar para dark
```

### 📋 Schemas de Resposta

```typescript
// Resposta padrão da API
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Modelo de transação
interface Transaction {
  id: number;
  tipo: 'receita' | 'despesa';
  valor: number;
  descricao: string;
  categoria_id: number;
  data_transacao: string;
  created_at: string;
  updated_at: string;
}
```

### 🔑 Autenticação

A API suporta dois métodos de autenticação:

1. **Autenticação baseada em sessão** - Para uso na interface web
2. **Autenticação baseada em token** - Para uso em integrações de API

Para obter um token de API:

1. Acesse a interface web e faça login
2. Vá para Configurações > API
3. Crie um novo token
4. Copie e guarde o token gerado (ele não será mostrado novamente)

#### Usando o Token de API

Inclua o token no cabeçalho HTTP `apikey` em todas as solicitações:

```http
apikey: fin_seu_token_aqui
```

### 📝 Exemplos de Uso

#### Criar uma Transação

```javascript
async function createTransaction(token, transactionData) {
  const response = await fetch('http://localhost:3000/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': token
    },
    body: JSON.stringify({
      descricao: 'Compras do supermercado',
      valor: '150.00',
      tipo: 'despesa',
      categoria_id: 1,
      data_transacao: '2025-01-03T14:30:00Z'
    })
  });

  return await response.json();
}
```

#### Obter Resumo do Dashboard

```bash
# Exemplo com cURL
curl http://localhost:3000/api/dashboard/summary \
  -H "apikey: fin_seu_token_aqui"
```

---

## 🤝 Contribuindo

Agradecemos seu interesse em contribuir com o FinanceHub! 

### 📝 Como Contribuir

1. **Fork** o projeto
2. **Crie** uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. **Abra** um Pull Request

### 🎯 Diretrizes

- **Código**: Siga os padrões TypeScript e ESLint
- **Commits**: Use mensagens descritivas
- **Testes**: Adicione testes para novas funcionalidades
- **Documentação**: Mantenha a documentação atualizada

### 🐛 Reportando Bugs

Use as [GitHub Issues](https://github.com/xpiria/financehub/issues) com:
- **Descrição clara** do problema
- **Passos para reproduzir**
- **Comportamento esperado vs atual**
- **Screenshots** se aplicável

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

```
MIT License

Copyright (c) 2024 XPIRIA

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 👥 Equipe XPIRIA

<div align="center">

### 🚀 Desenvolvido com ❤️ pela equipe XPIRIA

**XPIRIA** - *Transformando ideias em soluções digitais inovadoras*

[![Website](https://img.shields.io/badge/Website-XPIRIA.com-blue?style=for-the-badge)](https://xpiria.com)
[![Email](https://img.shields.io/badge/Email-contact@xpiria.com-red?style=for-the-badge)](mailto:contact@xpiria.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-XPIRIA-blue?style=for-the-badge&logo=linkedin)](https://linkedin.com/company/xpiria)

---

### 📞 Suporte & Contato

- **Desenvolvedor Principal**: [bruno@xpiria.com.br](mailto:bruno@xpiria.com.br)
- **Suporte Técnico**: [support@xpiria.com](mailto:support@xpiria.com)
- **Parcerias**: [partnerships@xpiria.com](mailto:partnerships@xpiria.com)
- **Comercial**: [sales@xpiria.com](mailto:sales@xpiria.com)

---

### 🌟 Conecte-se Conosco

[![GitHub](https://img.shields.io/badge/GitHub-XPIRIA-black?style=for-the-badge&logo=github)](https://github.com/xpiria)
[![Twitter](https://img.shields.io/badge/Twitter-@XPIRIA-blue?style=for-the-badge&logo=twitter)](https://twitter.com/xpiria)
[![Instagram](https://img.shields.io/badge/Instagram-@XPIRIA-purple?style=for-the-badge&logo=instagram)](https://instagram.com/xpiria)

</div>

---

<div align="center">

**⭐ Se este projeto foi útil para você, considere dar uma estrela no GitHub!**

**🚀 FinanceHub - Sua jornada financeira começa aqui.**

*Feito com 💜 pela equipe XPIRIA*

</div>