# Arquitetura Técnica — Codex Manager

O **Codex Manager** é uma aplicação desktop nativa desenvolvida para **Fedora Linux**, projetada para permitir o gerenciamento e a execução concorrente de múltiplos perfis independentes do **OpenAI Codex CLI oficial**.

---

## 1. Visão Geral da Arquitetura

O sistema adota uma arquitetura desacoplada de alto desempenho baseada em **Tauri 2**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + TS)                    │
│   - Interface Linear/Zed Minimalista                        │
│   - Terminal Interativo (xterm.js + fit-addon)              │
│   - Abas Multi-instância Concorrentes                       │
│   - Command Palette (Ctrl+Shift+P)                          │
└──────────────────────────────┬──────────────────────────────┘
                               │ Tauri IPC (Commands & Events)
┌──────────────────────────────▼──────────────────────────────┐
│                    Backend Nativo (Rust)                    │
│   - Gerenciador de Processos e PTY (portable-pty)           │
│   - Isolamento Rigoroso de Ambiente (CODEX_HOME)            │
│   - Verificador de Autenticação Oficial (codex login status)│
│   - Persistência Atômica de Metadados (XDG Base Directory)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ POSIX PTY (openpty / fork / exec)
┌──────────────────────────────▼──────────────────────────────┐
│            OpenAI Codex CLI Oficial (Processos Reais)        │
│   - Instância 1: CODEX_HOME=~/.local/share/.../profile-1    │
│   - Instância 2: CODEX_HOME=~/.local/share/.../profile-2    │
│   - Instância N: CODEX_HOME=~/.local/share/.../profile-N    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Princípio de Isolamento (`CODEX_HOME`)

Em vez de tentar emular o agente ou duplicar binários do Codex, cada perfil opera como uma identidade operacional distinta apontando para seu próprio diretório isolado de dados:

1. **Variável de Ambiente Exclusiva:**
   Cada processo filho gerado no PTY recebe:
   ```bash
   CODEX_HOME="$HOME/.local/share/codex-manager/profiles/<profile-id>/codex-home"
   ```
2. **Estrutura de Armazenamento Conforme XDG:**
   - **Configurações e Metadados:**
     `$XDG_CONFIG_HOME/codex-manager/` (`~/.config/codex-manager/`)
     - `profiles.json`: Metadados dos perfis (UUID, nome, cor, diretório padrão, timestamps).
     - `settings.json`: Configurações de terminal, tema e caminhos.
   - **Dados e Sessões Autenticadas do Codex:**
     `$XDG_DATA_HOME/codex-manager/profiles/<profile-id>/codex-home/`
     - Armazena `auth.json` (permissões 0600), `config.toml`, bancos SQLite e rollouts gerados pelo próprio CLI oficial da OpenAI.
   - **Logs e Estado:**
     `$XDG_STATE_HOME/codex-manager/logs/`

3. **Garantia de Independência:**
   - O logout de um perfil remove apenas o `auth.json` sob seu respectivo `codex-home`.
   - Outros perfis em execução permanecem 100% intactos e autenticados.

---

## 3. Gerenciamento de Processos e Terminal (PTY)

1. **Pseudo-Terminais Reais:**
   - Utiliza a biblioteca `portable-pty` para alocar pares de master/slave PTY nativos no Linux.
   - Fornece suporte integral a ANSI escape sequences, cores 24-bit (truecolor), cursor, resize dinâmico e scrollback.
2. **Streaming Assíncrono:**
   - Cada sessão possui uma thread dedicada que consome o leitor do PTY master em buffers contínuos e emite eventos IPC `pty-output` para o frontend.
   - A entrada do usuário é escrita diretamente no escritor do PTY sem bloqueios.
3. **Persistência Concorrente:**
   - Múltiplas abas funcionam simultaneamente em segundo plano.
   - Alternar de aba apenas oculta o elemento DOM do xterm.js sem pausar o processo do terminal.

---

## 4. Segurança

- **Permissões de Arquivo:** Diretórios de dados são criados com permissões restritas `0700` no Unix.
- **Isolamento de Credenciais:** As credenciais nunca são interceptadas, modificadas ou registradas em log pelo gerenciador.
- **Validação de Caminhos:** Proteção estrita contra *path traversal* (`../`) na seleção de diretórios e exclusão de perfis.
- **Proteção dos Repositórios:** A exclusão de perfis nunca remove ou altera as pastas de projetos dos usuários.
