# Executar o backend

Este backend pertence ao projeto IntelliStock Web. Leia também o `../README.md` para a divisão do trabalho, contratos e passos de integração.

1. `npm install`
2. Copie `.env.example` para `.env` (`Copy-Item .env.example .env` no PowerShell).
3. Mantenha `DASHBOARD_DATA_SOURCE=mock` até o banco estar configurado.
4. `npm test` e `npm start`.
5. Abra `http://localhost:3000` ou `http://localhost:3000/api/dashboard`.

Não publique `.env` e não altere os nomes das colunas SQL sem confirmar o esquema do Caio. Os módulos dos outros integrantes ainda não fazem parte deste pacote.
