Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "    PUBLICACAO / ATUALIZACAO DO MINIHUB CAR NA HOSTINGER VPS" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

$ipDefault = "179.197.68.148"
$ipInput = Read-Host "Digite o IP ou Dominio da sua VPS [$ipDefault]"
$ipHostinger = if ([string]::IsNullOrWhiteSpace($ipInput)) { $ipDefault } else { $ipInput }

Write-Host ""
Write-Host "Conectando na VPS ($ipHostinger) para puxar o codigo e atualizar..." -ForegroundColor Yellow
Write-Host ""

$remoteCmd = "cd /var/www/minihubcar && git pull origin main && docker compose -f docker-compose.prod.yml pull evolution-api && docker compose -f docker-compose.prod.yml up -d --build frontend backend evolution-api && docker compose -f docker-compose.prod.yml exec backend pnpm db:migrate:external-pre-orders && docker compose -f docker-compose.prod.yml exec backend pnpm db:migrate:annual-plans && docker compose -f docker-compose.prod.yml exec backend pnpm db:migrate:analytics && docker compose -f docker-compose.prod.yml exec backend pnpm db:migrate"

ssh "root@$ipHostinger" $remoteCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERRO] Ocorreu um erro durante a atualizacao remota. Verifique a conexao e credenciais SSH." -ForegroundColor Red
    Read-Host "Pressione Enter para fechar"
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host " [OK] CODIGO ATUALIZADO, BANCO MIGRADO E CONTAINERS RECONSTRUIDOS!" -ForegroundColor Green
Write-Host " [OK] EVOLUTION API INICIALIZADA NA PORTA 8088!" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""

$disparar = Read-Host "Deseja disparar as mensagens de boas-vindas retroativas agora? (S/N) [N]"
if ($disparar -match '^(s|sim)$') {
    Write-Host ""
    Write-Host "Disparando mensagens de boas-vindas para usuarios existentes..." -ForegroundColor Yellow
    ssh "root@$ipHostinger" "cd /var/www/minihubcar && docker compose -f docker-compose.prod.yml exec backend npm run welcome:retroactive"
}

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host " DEPLOY CONCLUIDO COM SUCESSO!" -ForegroundColor Green
Write-Host " Acesse o Painel Admin: https://minihubcar.com.br/admin/users" -ForegroundColor White
Write-Host " Clique em 'Conexao WhatsApp' para escanear o QR Code!" -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Cyan
Read-Host "Pressione Enter para fechar"
