@echo off
chcp 65001 >nul
echo ====================================================================
echo     PUBLICACAO / ATUALIZACAO DO MINIHUB CAR NA HOSTINGER VPS
echo ====================================================================
echo.

set IP_HOSTINGER=179.197.68.148
set /p IP_INPUT="Digite o IP ou Dominio da sua VPS [%IP_HOSTINGER%]: "
if not "%IP_INPUT%"=="" set IP_HOSTINGER=%IP_INPUT%

echo.
echo Conectando na VPS (%IP_HOSTINGER%) para puxar o codigo e atualizar...
echo.

ssh root@%IP_HOSTINGER% "cd /var/www/minihubcar && git pull origin main && docker compose -f docker-compose.prod.yml pull evolution-api && docker compose -f docker-compose.prod.yml up -d --build frontend backend evolution-api && docker compose -f docker-compose.prod.yml exec backend pnpm db:migrate:external-pre-orders && docker compose -f docker-compose.prod.yml exec backend pnpm db:migrate"

if errorlevel 1 (
    echo.
    echo [ERRO] Ocorreu um erro durante a atualizacao remota. Verifique a conexao e credenciais SSH.
    pause
    exit /b 1
)

echo.
echo ====================================================================
echo  [OK] CODIGO ATUALIZADO, BANCO MIGRADO E CONTAINERS RECONSTRUIDOS!
echo  [OK] EVOLUTION API INICIALIZADA NA PORTA 8088!
echo ====================================================================
echo.
set /p DISPARAR="Deseja disparar as mensagens de boas-vindas retroativas agora? (S/N) [N]: "
if "%DISPARAR%"=="" set DISPARAR=N
if /i "%DISPARAR%"=="S" (
    echo.
    echo Disparando mensagens de boas-vindas para usuarios existentes...
    ssh root@%IP_HOSTINGER% "cd /var/www/minihubcar && docker compose -f docker-compose.prod.yml exec backend npm run welcome:retroactive"
)

echo.
echo ====================================================================
echo  DEPLOY CONCLUIDO COM SUCESSO!
echo  Acesse o Painel Admin: https://minihubcar.com.br/admin/users
echo  Clique em 'Conexao WhatsApp' para escanear o QR Code!
echo ====================================================================
pause