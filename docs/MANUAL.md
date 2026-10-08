# Manual de Uso e Instalação — Codex Manager

O **Codex Manager** é uma aplicação desktop nativa para Fedora Linux projetada para gerenciar múltiplas contas e perfis independentes do OpenAI Codex CLI.

---

## 1. Instalação no Fedora Linux

### Opção A: Instalação via Pacote RPM (Recomendado)

O pacote `.rpm` já foi gerado na compilação e está localizado em:
```bash
src-tauri/target/release/bundle/rpm/Codex\ Manager-0.1.0-1.x86_64.rpm
```

Para instalar no sistema com integração total ao menu de aplicativos do GNOME:
```bash
sudo dnf install -y "./src-tauri/target/release/bundle/rpm/Codex Manager-0.1.0-1.x86_64.rpm"
```

Uma vez instalado, você pode iniciá-lo pelo menu de aplicativos ou pelo comando:
```bash
codex-manager
```

### Opção B: Execução Direta do Binário

Você pode executar o binário compilado diretamente sem necessidade de instalação:
```bash
./src-tauri/target/release/codex-manager
```

### Opção C: Modo de Desenvolvimento

Para executar em modo de desenvolvimento com hot-reload do frontend e Rust:
```bash
npm run tauri dev
```

---

## 2. Guia de Primeiros Passos

### 2.1 Criando seu Primeiro Perfil
1. Abra o **Codex Manager**.
2. Clique no botão azul **+ Novo Codex** na barra lateral (ou pressione `Ctrl+Shift+N`).
3. Defina um nome identificador (ex: *Conta Pessoal*, *Trabalho*, *Dev / Open Source*).
4. Escolha uma cor para identificação visual.
5. (Opcional) Especifique um diretório de trabalho padrão.
6. Clique em **Criar Perfil**.

### 2.2 Conectando sua Conta ChatGPT
1. Na lista de perfis, clique no ícone de chave/login ao lado do perfil ou abra o menu de opções (`...`) e selecione **Conectar Conta**.
2. Uma sessão de terminal dedicada será aberta executando o comando oficial `codex login`.
3. Siga as instruções no terminal (que abrirá o navegador para a autenticação padrão da OpenAI).
4. Ao concluir, o status do perfil mudará automaticamente para **Conectado**.

### 2.3 Abrindo Sessões de Terminal do Codex
1. Clique no botão **Play** ao lado de qualquer perfil.
2. Uma nova aba de terminal integrada será aberta imediatamente executando o Codex CLI no ambiente isolado daquele perfil.
3. Você pode abrir quantas abas quiser para o mesmo perfil ou para perfis diferentes.

---

## 3. Atalhos de Teclado Globais

| Atalho | Ação |
|---|---|
| `Ctrl+Shift+N` | Criar novo perfil |
| `Ctrl+N` | Abrir nova sessão para o perfil ativo |
| `Ctrl+Shift+P` | Abrir a **Command Palette** |
| `Ctrl+,` | Abrir painel de configurações |
| `Ctrl+Tab` | Próxima aba de sessão |
| `Ctrl+Shift+Tab` | Aba de sessão anterior |
| `Ctrl+W` | Fechar aba atual (com confirmação se ativa) |

---

## 4. Gerenciamento e Exclusão Segura

Ao excluir um perfil, você pode escolher:
- **Remover perfil e apagar dados locais:** Apaga os registros do gerenciador e limpa a pasta de credenciais e histórico daquele perfil em `~/.local/share/codex-manager/profiles/<id>`.
- **Remover mantendo dados locais:** Remove o perfil da interface, mas mantém a pasta preservada para eventual recuperação.

> **Garantia de Integridade:** Seus diretórios e repositórios de projetos nunca são excluídos ou afetados.
