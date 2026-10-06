@echo off
chcp 65001 > nul
echo ========================================================
echo   ENVIAR FOTOS DO CATALOGO PARA A VPS (HOSTINGER)
echo ========================================================
set /p IP_VPS="Digite o IP da VPS Hostinger: "
if "%IP_VPS%"=="" (
    echo IP nao informado. Abortando.
    pause
    exit /b 1
)

echo.
echo Criando diretorio de destino na VPS se necessario...
ssh root@%IP_VPS% "mkdir -p /var/www/minihubcar/catalogos/HW"

echo.
echo Sincronizando 4.066 fotos via SCP para a VPS...
scp -r C:\Projetos\minihubcar\catalogos\HW\* root@%IP_VPS%:/var/www/minihubcar/catalogos/HW/

echo.
echo ========================================================
echo Fotos enviadas com sucesso!
echo ========================================================
pause
