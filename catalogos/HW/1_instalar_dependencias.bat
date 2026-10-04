@echo off
chcp 65001 > nul
echo ========================================================
echo   Instalando dependencias Python para Hot Wheels Crawler
echo ========================================================
python -m pip install --upgrade pip
pip install -r requirements.txt
echo.
echo Dependencias instaladas com sucesso!
pause
