@echo off
chcp 65001 > nul
echo ========================================================
echo   Coleta Completa Oficial Bburago (CSV + Fotos HD)
echo ========================================================
echo Conectando a bburago.com e baixando dados e fotos oficiais...
echo.
python collect_bburago_catalog.py --baixar-fotos --threads 8
echo.
echo ========================================================
echo   Coleta concluida!
echo   - CSV:   bburago_catalogo.csv
echo   - Fotos: fotos/
echo ========================================================
pause
