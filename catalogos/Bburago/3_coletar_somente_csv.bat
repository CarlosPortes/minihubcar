@echo off
chcp 65001 > nul
echo ========================================================
echo   Coleta de Catalogo Bburago (Somente CSV)
echo ========================================================
echo Atualizando o arquivo bburago_catalogo.csv...
echo.
python collect_bburago_catalog.py
echo.
echo ========================================================
echo   Arquivo bburago_catalogo.csv atualizado com sucesso!
echo ========================================================
pause
