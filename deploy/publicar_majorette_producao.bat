@echo off
chcp 65001 >nul
echo ====================================================================
echo     PUBLICACAO DA CARGA MAJORETTE NA HOSTINGER VPS (PRODUCAO)
echo ====================================================================
echo.

set IP_HOSTINGER=179.197.68.148
set /p IP_INPUT="Digite o IP ou Dominio da sua VPS [%IP_HOSTINGER%]: "
if not "%IP_INPUT%"=="" set IP_HOSTINGER=%IP_INPUT%

echo.
echo ====================================================================
echo [1/3] Atualizando o codigo na VPS e reconstruindo o backend...
echo ====================================================================
ssh root@%IP_HOSTINGER% "cd /var/www/minihubcar && git pull origin main && docker compose -f docker-compose.prod.yml up -d --build backend"

if %errorlevel% neq 0 (
    echo.
    echo ❌ Erro ao atualizar codigo na VPS. Verifique a conexao e credenciais SSH.
    pause
    exit /b %errorlevel%
)

echo.
echo ====================================================================
echo [2/3] Transmitindo as 2.828 fotos e catalogo Majorette para a VPS...
echo ====================================================================
echo Enviando pasta catalogos/Majorette via SCP...
scp -r "C:\Projetos\minihubcar\catalogos\Majorette" root@%IP_HOSTINGER%:/var/www/minihubcar/catalogos/

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Aviso na transmissao de fotos. Continuando com a carga...
)

echo.
echo ====================================================================
echo [3/3] Executando a carga do Catalogo Majorette no Banco de Dados...
echo ====================================================================
ssh root@%IP_HOSTINGER% "cd /var/www/minihubcar && docker compose -f docker-compose.prod.yml exec backend pnpm db:seed:majorette"

echo.
echo ====================================================================
echo  ✅ CARGA DA MAJORETTE CONCLUIDA COM SUCESSO EM PRODUCAO!
echo ====================================================================
echo.
echo Teste no navegador: https://minihubcar.com.br/catalog
echo Ou teste de foto:   https://minihubcar.com.br/catalog-media/Majorette/fotos/206.jpg
echo.
pause
