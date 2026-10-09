@echo off
chcp 65001 > nul
echo ========================================================
echo   Coleta de Metadados Majorette (Somente CSV)
echo ========================================================
echo Extraindo todas as tabelas e dados sem baixar fotos...
echo.
python collect_majorette_catalog.py --somente-csv
echo.
echo ========================================================
echo   Metadados salvos em majorette_catalogo.csv!
echo ========================================================
pause
