# Codex Manager 🚀

Gerenciador nativo de múltiplos perfis e contas para o **OpenAI Codex CLI** no **Fedora Linux**, construído com **Tauri 2**, **Rust**, **React**, **TypeScript**, **Tailwind CSS** e **xterm.js**.

---

## ✨ Características Principais

- ⚡ **Nativo e Ultra-Leve:** Construído em Rust + WebKitGTK (binário de 6 MB, ~0% de CPU em repouso).
- 🛡️ **Isolamento Total (`CODEX_HOME`):** Cada perfil possui seu próprio ambiente de configuração e credenciais independentes.
- 🖥️ **Terminal Interativo Real:** Terminais PTY reais com `portable-pty` e `xterm.js`, suporte completo a cores ANSI, cursor, redimensionamento dinâmico e scrollback.
- 📑 **Abas Multi-instância:** Execute várias instâncias simultâneas do Codex CLI sem concorrência ou reinicialização de processos.
- 🔐 **Autenticação Oficial:** Executa os fluxos oficiais de `codex login` e `codex logout`.
- 🗂️ **Padrão XDG:** Armazena metadados em `~/.config/codex-manager` e dados de perfis em `~/.local/share/codex-manager/profiles/`.
- ⌨️ **Command Palette (`Ctrl+Shift+P`):** Navegação ultrarrápida por teclado inspirada em Linear, VS Code e Raycast.
- 📦 **Pacote RPM Nativo:** Pacote `.rpm` oficial gerado para instalação direta no Fedora.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Desktop Runtime | Tauri 2 |
| Backend Nativo | Rust 2021 |
| Pseudo-Terminal (PTY) | portable-pty |
| Frontend | React 19 + TypeScript |
| Build Tool | Vite + Rolldown |
| Estilização | Tailwind CSS |
| Componente de Terminal | @xterm/xterm + FitAddon |
| Testes Unitários Frontend | Vitest + Testing Library |
| Testes Unitários Backend | Rust cargo test |

---

## 🚀 Como Executar

### Pré-requisitos (Fedora Linux)
```bash
sudo dnf install -y webkit2gtk4.1-devel gtk3-devel libsoup3-devel librsvg2-devel openssl-devel
```

### Modo de Desenvolvimento
```bash
npm install
npm run tauri dev
```

### Executar Testes
```bash
# Testes do Frontend (Vitest)
npm test

# Testes do Backend (Rust)
cd src-tauri && cargo test
```

### Build de Produção
```bash
npm run tauri build
```
Os artefatos gerados estarão em:
- **RPM:** `src-tauri/target/release/bundle/rpm/Codex Manager-0.1.0-1.x86_64.rpm`
- **Binário Nativo:** `src-tauri/target/release/codex-manager`

---

## 📖 Documentação

- [Arquitetura Técnica Detalhada](docs/ARCHITECTURE.md)
- [Manual de Uso e Instalação](docs/MANUAL.md)

---

## 📄 Licença

MIT License.
