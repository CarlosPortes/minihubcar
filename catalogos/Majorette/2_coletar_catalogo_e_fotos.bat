@echo off
chcp 65001 > nul
echo ========================================================
echo   Coleta Completa Oficial Majorette (CSV + Fotos HD)
echo ========================================================
echo Extraindo todas as secoes da Majorette Model Cars Wiki:
echo - Year Lists (1964 a 2026)
echo - Vehicles List (Montadoras)
echo - Trucks (Caminhoes e Onibus)
echo - Trailers (Caravanas, Reboques e Barcos)
echo - Major Collections (Street Cars, Deluxe, Vintage, etc.)
echo - Minor Collections (Coca Cola, Buriram, etc.)
echo - Gift Packs (Todas as edicoes)
echo.
echo Baixando dados e convertendo todas as fotos em JPG...
echo.
python collect_majorette_catalog.py --baixar-fotos --threads 10
echo.
echo ========================================================
echo   Coleta concluida!
echo   - CSV:   majorette_catalogo.csv
echo   - Fotos: fotos/ (Nomeadas com o codigo da miniatura)
echo ========================================================
pause
