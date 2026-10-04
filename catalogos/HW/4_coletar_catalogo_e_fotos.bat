@echo off
chcp 65001 > nul
echo ========================================================
echo   Iniciando Varredura Completa Fandom (CSV + FOTOS)
echo   Destino: D:\Projetos\minihubcar\hw
echo ========================================================
echo Processando todas as coleções e baixando as fotos originais...
echo Os arquivos serao salvos em:
echo   - CSV:   D:\Projetos\minihubcar\hw\hw_catalogo.csv
echo   - Fotos: D:\Projetos\minihubcar\hw\fotos
echo.
python collect_hotwheels_fandom_crawler.py --modo tudo --saida hw_catalogo.csv --baixar-fotos --fotos-dir fotos --delay 0.35
echo.
echo ========================================================
echo   Coleta de catalogo e fotos concluida!
echo   Verifique em: D:\Projetos\minihubcar\hw
echo ========================================================
pause

