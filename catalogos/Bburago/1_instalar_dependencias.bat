@echo off
chcp 65001 > nul
echo ========================================================
echo   Instalando dependencias do Coletor Bburago
echo ========================================================
python -m pip install --upgrade requests
echo.
echo ========================================================
echo   Dependencias instaladas com sucesso!
echo ========================================================
pause
