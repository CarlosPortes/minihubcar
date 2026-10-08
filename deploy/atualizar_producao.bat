@echo off
chcp 65001 >nul
echo ====================================================================
echo     PUBLICACAO / ATUALIZACAO DO MININHUBCAR NA HOSTINGER VPS
echo ====================================================================
echo.

set IP_HOSTINGER=179.197.68.148
set /p IP_INPUT="Digite o IP ou Dominio da sua VPS [%IP_HOSTINGER%]: "
if not "%IP_INPUT%"=="" set IP_HOSTINGER=%IP_INPUT%

echo.
echo Conectando na VPS (%IP_HOSTINGER%) para puxar o codigo e reconstruir os containers...
echo.

ssh root@%IP_HOSTINGER% "cd /var/www/minihubcar && git pull origin main && docker compose -f docker-compose.prod.yml up -d --build frontend backend"

if %errorlevel% neq 0 (
    echo.
    echo ❌ Ocorreu um erro durante a atualizacao remota. Verifique a conexao e credenciais SSH.
    pause
    exit /b %errorlevel%
)

echo.
echo ====================================================================
echo  ✅ CODIGO ATUALIZADO E CONTAINERS RECONSTRUIDOS COM SUCESSO!
echo ====================================================================
echo.
set /p DISPARAR="Deseja disparar as mensagens de boas-vindas retroativas agora? (S/N) [S]: "
if "%DISPARAR%"=="" set DISPARAR=S
if /i "%DISPARAR%"=="S" (
    echo.
    echo Disparando mensagens de boas-vindas para usuarios existentes...
    ssh root@%IP_HOSTINGER% "cd /var/www/minihubcar && docker compose -f docker-compose.prod.yml exec backend npm run welcome:retroactive"
)

echo.
echo ====================================================================
echo  DEPLOY CONCLUIDO! Acesse: https://minihubcar.com.br/community
echo ====================================================================
pause
