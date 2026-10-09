@echo off
chcp 65001 >nul
echo ====================================================================
echo    SINCRONIZACAO DE FOTOS DO CATALOGO E MINIATURAS PARA A HOSTINGER
echo ====================================================================

set /p IP_HOSTINGER="Digite o IP da sua VPS Hostinger: "

echo.
echo [1/3] Enviando Fotos Hot Wheels (catalogos/HW)...
scp -r "C:\Projetos\minihubcar\catalogos\HW" root@%IP_HOSTINGER%:/var/www/minihubcar/catalogos/

echo.
echo [2/4] Enviando Fotos de Miniaturas (catalogos/Miniaturas)...
scp -r "C:\Projetos\minihubcar\catalogos\Miniaturas" root@%IP_HOSTINGER%:/var/www/minihubcar/catalogos/

echo.
echo [3/4] Enviando Fotos Majorette (catalogos/Majorette)...
scp -r "C:\Projetos\minihubcar\catalogos\Majorette" root@%IP_HOSTINGER%:/var/www/minihubcar/catalogos/

echo.
echo [4/4] Enviando Fotos de Miniaturas para Uploads (backend/uploads)...
scp -r "C:\Projetos\minihubcar\backend\uploads\*" root@%IP_HOSTINGER%:/var/www/minihubcar/backend/uploads/

echo.
echo.
echo [4/4] Enviando pacote SQL atualizado...
scp -r "C:\Projetos\minihubcar\deploy\*" root@%IP_HOSTINGER%:/var/www/minihubcar/deploy/

echo.
echo [5/6] Enviando configuracoes atualizadas do Docker e Backend...
scp "C:\Projetos\minihubcar\docker-compose.prod.yml" root@%IP_HOSTINGER%:/var/www/minihubcar/
scp "C:\Projetos\minihubcar\backend\src\app\app.ts" root@%IP_HOSTINGER%:/var/www/minihubcar/backend/src/app/

echo.
echo [6/6] Sincronizando uploads diretamente com o container Docker...
ssh root@%IP_HOSTINGER% "docker cp /var/www/minihubcar/backend/uploads/. minihub-backend:/app/backend/uploads/ 2>/dev/null || true"

echo.
echo ====================================================================
echo  FOTOS E PACOTE DE PRODUCAO ENVIADOS COM SUCESSO!
echo ====================================================================
pause
