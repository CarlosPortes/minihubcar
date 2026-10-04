@echo off
chcp 65001 > nul
echo ========================================================
echo   Retomando Varredura do Catálogo Hot Wheels Fandom
echo   Destino: D:\Projetos\minihubcar\hw
echo ========================================================
echo Retomando a partir de D:\Projetos\minihubcar\hw\crawler_checkpoint.json...
echo.
python collect_hotwheels_fandom_crawler.py --modo tudo --saida hw_catalogo.csv --baixar-fotos --fotos-dir fotos --delay 0.35
echo.
echo ========================================================
echo   Coleta finalizada!
echo ========================================================
pause

