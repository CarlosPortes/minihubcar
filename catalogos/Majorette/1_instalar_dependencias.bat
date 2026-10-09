@echo off
chcp 65001 > nul
echo ========================================================
echo   Instalando dependencias do Coletor Majorette
echo ========================================================
python -m pip install --upgrade requests beautifulsoup4 pillow
echo.
echo ========================================================
echo   Dependencias instaladas com sucesso!
echo ========================================================
pause
