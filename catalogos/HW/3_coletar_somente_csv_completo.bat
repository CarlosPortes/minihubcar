@echo off
chcp 65001 > nul
echo ========================================================
echo   Iniciando Varredura Completa Fandom Hot Wheels (CSV)
echo   Destino: D:\Projetos\minihubcar\hw\hw_catalogo.csv
echo ========================================================
echo Processando todas as coleções, séries anuais e temáticas...
echo Pressione Ctrl+C se precisar pausar (progresso salvo em D:\Projetos\minihubcar\hw).
echo.
python collect_hotwheels_fandom_crawler.py --modo tudo --saida hw_catalogo.csv --delay 0.35
echo.
echo ========================================================
echo   Varredura concluida com sucesso!
echo   Arquivo gerado: D:\Projetos\minihubcar\hw\hw_catalogo.csv
echo ========================================================
pause

