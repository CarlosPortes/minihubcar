@echo off
chcp 65001 > nul
echo ========================================================
echo   Testando Varredura Amostral (AcceleRacers 2025 + JCB92)
echo   Destino: D:\Projetos\minihubcar\hw
echo ========================================================
python collect_hotwheels_fandom_crawler.py --modo amostra --saida hw_catalogo_amostra.csv --baixar-fotos
echo.
echo ========================================================
echo   Verificando miniatura JCB92 no resultado gerado:
echo ========================================================
python -c "import csv; [print('Encontrado:', r['codigo_hotwheels'], '-', r['descricao'], '| Serie:', r['serie'], '| Cor:', r['cor']) for r in csv.DictReader(open(r'D:\Projetos\minihubcar\hw\hw_catalogo_amostra.csv', encoding='utf-8-sig'), delimiter=';') if 'JCB92' in r['codigo_hotwheels']]"
echo.
echo ========================================================
echo   Amostra concluida em D:\Projetos\minihubcar\hw
echo ========================================================
pause

