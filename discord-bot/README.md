# MangaMorph Discord Bot

Bot oficial do servidor Discord do MangaMorph.

## v0.1

- Boas-vindas com embed
- Cargo automático de membro
- Registro de entrada em canal de logs
- Contador de membros

## Configuração

Crie um arquivo `.env` localmente ou configure as variáveis no serviço de hospedagem:

```env
DISCORD_TOKEN=
WELCOME_CHANNEL_ID=
MEMBER_ROLE_ID=
LOG_CHANNEL_ID=
```

### Discord Developer Portal

1. Crie uma aplicação chamada `MangaMorph`.
2. Na aba **Bot**, crie/ative o bot.
3. Ative **Server Members Intent**.
4. Gere o convite em **OAuth2 > URL Generator** com os escopos `bot` e `applications.commands`.
5. Conceda apenas as permissões necessárias: View Channels, Send Messages, Embed Links, Read Message History e Manage Roles.
6. Coloque o cargo do bot acima do cargo `Membro` na hierarquia do servidor.

> Nunca publique o token do bot no GitHub, Discord ou em mensagens públicas.

## Executar

```bash
npm install
npm start
```

Requer Node.js 20 ou superior.
