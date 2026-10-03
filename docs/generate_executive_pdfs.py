"""
MiniHub Car - Gerador de Documentação Oficial em PDF e Kit de Lançamento
Gera 3 PDFs de alta fidelidade:
1. Documento_1_Documentacao_Funcional_MiniHubCar.pdf
2. Documento_2_Apostila_Treinamento_Vendedores.pdf
3. Documento_3_Apresentacao_Comercial_MiniHubCar.pdf
E o Guia de Divulgação em Redes Sociais.
"""

import os
import sys
import base64
import subprocess
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(r"c:\Projetos\minihubcar\docs")
ASSETS_DIR = BASE_DIR / "assets"
PDF_DIR = BASE_DIR / "pdf"
PDF_DIR.mkdir(parents=True, exist_ok=True)

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def load_image_base64(filename):
    filepath = ASSETS_DIR / filename
    if not filepath.exists():
        print(f"Warning: {filename} not found in {ASSETS_DIR}")
        return ""
    with open(filepath, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
        ext = filepath.suffix.lower().replace(".", "")
        mime = "jpeg" if ext in ["jpg", "jpeg"] else "png"
        return f"data:image/{mime};base64,{encoded}"

AVATAR_B64 = load_image_base64("carlos_portes_avatar.jpg")
HERO_B64 = load_image_base64("minihubcar_hero.jpg")
PREORDER_FLOW_B64 = load_image_base64("seller_preorders_flow.jpg")
MARKET_VISION_B64 = load_image_base64("minihubcar_market_vision.jpg")

COMMON_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

@page {
    size: A4;
    margin: 18mm 14mm 18mm 14mm;
    @bottom-right {
        content: counter(page);
    }
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.6;
    font-size: 13.5px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

.page {
    page-break-after: always;
    position: relative;
    padding-bottom: 20px;
}

.page:last-child {
    page-break-after: avoid;
}

/* COVER PAGE */
.cover {
    height: 100vh;
    min-height: 980px;
    background: linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e1b4b 100%);
    color: #ffffff;
    padding: 50px 45px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    page-break-after: always;
}

.cover::before {
    content: '';
    position: absolute;
    top: -100px;
    right: -100px;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(6, 182, 212, 0.05) 70%, transparent 100%);
    border-radius: 50%;
}

.cover-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    padding-bottom: 20px;
}

.brand-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.4);
    padding: 6px 14px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 700;
    color: #fbbf24;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

.brand-title {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #ffffff;
}

.brand-title span {
    color: #f59e0b;
}

.cover-body {
    margin: 40px 0;
}

.cover-kicker {
    color: #38bdf8;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 12px;
}

.cover-title {
    font-size: 40px;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -1px;
    color: #ffffff;
    margin-bottom: 16px;
}

.cover-subtitle {
    font-size: 17px;
    color: #94a3b8;
    line-height: 1.5;
    max-width: 650px;
    margin-bottom: 30px;
}

.cover-image-container {
    width: 100%;
    height: 280px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.5);
    margin-bottom: 25px;
}

.cover-image-container img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.cover-meta {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 16px 20px;
    border-radius: 10px;
}

.meta-item label {
    display: block;
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 3px;
}

.meta-item value {
    font-size: 13px;
    color: #f1f5f9;
    font-weight: 600;
}

.cover-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    padding-top: 20px;
    font-size: 12px;
    color: #64748b;
}

/* TYPOGRAPHY & LAYOUT */
h1 {
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.5px;
    margin-top: 30px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e2e8f0;
}

h2 {
    font-size: 19px;
    font-weight: 700;
    color: #1e293b;
    margin-top: 24px;
    margin-bottom: 10px;
    letter-spacing: -0.3px;
}

h3 {
    font-size: 15px;
    font-weight: 700;
    color: #334155;
    margin-top: 16px;
    margin-bottom: 6px;
}

p {
    margin-bottom: 12px;
    color: #334155;
    text-align: justify;
}

ul, ol {
    margin-left: 20px;
    margin-bottom: 14px;
    color: #334155;
}

li {
    margin-bottom: 5px;
}

/* BOXES & CARDS */
.info-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #3b82f6;
    padding: 14px 18px;
    border-radius: 6px;
    margin: 16px 0;
}

.info-card.success {
    background: #f0fdf4;
    border-color: #bbf7d0;
    border-left-color: #10b981;
}

.info-card.warning {
    background: #fffbeb;
    border-color: #fef3c7;
    border-left-color: #f59e0b;
}

.info-card.highlight {
    background: #faf5ff;
    border-color: #e9d5ff;
    border-left-color: #8b5cf6;
}

.card-title {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
}

/* TABLES */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 18px 0;
    font-size: 12.5px;
}

th, td {
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    text-align: left;
}

th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

tr:nth-child(even) {
    background: #f8fafc;
}

/* BADGES */
.badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
}

.badge-green { background: #dcfce7; color: #166534; }
.badge-yellow { background: #fef9c3; color: #854d0e; }
.badge-red { background: #fee2e2; color: #991b1b; }
.badge-blue { background: #dbeafe; color: #1e40af; }
.badge-purple { background: #f3e8ff; color: #6b21a8; }

/* EMBEDDED IMAGES */
.content-image {
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #cbd5e1;
    margin: 18px 0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.content-image img {
    width: 100%;
    display: block;
}

.image-caption {
    font-size: 11.5px;
    color: #64748b;
    text-align: center;
    padding: 6px 10px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    font-style: italic;
}

/* AUTHOR CARD */
.author-profile {
    display: flex;
    align-items: center;
    gap: 20px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 16px 20px;
    border-radius: 10px;
    margin: 20px 0;
}

.author-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #f59e0b;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.author-info h4 {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2px;
}

.author-info .role {
    font-size: 13px;
    color: #f59e0b;
    font-weight: 600;
    margin-bottom: 6px;
}

.author-info p {
    font-size: 12.5px;
    color: #475569;
    margin-bottom: 0;
}

/* CODE / SPREADSHEET SNIPPET */
.code-block {
    background: #0f172a;
    color: #38bdf8;
    padding: 12px 16px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    margin: 14px 0;
    overflow-x: auto;
    border: 1px solid #1e293b;
    line-height: 1.5;
}
"""

def compile_html_to_pdf(html_content, output_pdf_path):
    temp_html_path = BASE_DIR / "temp_render.html"
    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={str(output_pdf_path)}",
        f"file:///{str(temp_html_path).replace(os.sep, '/')}"
    ]
    
    print(f"Generating PDF: {output_pdf_path.name}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if temp_html_path.exists():
        temp_html_path.unlink()
        
    if output_pdf_path.exists():
        size_kb = output_pdf_path.stat().st_size / 1024
        print(f"✅ Success: {output_pdf_path.name} ({size_kb:.1f} KB)")
        return True
    else:
        print(f"❌ Failed to generate {output_pdf_path.name}: {res.stderr}")
        return False

# ==============================================================================
# 1. DOCUMENTO 1: DOCUMENTAÇÃO FUNCIONAL DA APLICAÇÃO
# ==============================================================================
def generate_doc1():
    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>MiniHub Car - Documentação Funcional</title>
<style>
{COMMON_CSS}
</style>
</head>
<body>

<!-- CAPA -->
<div class="cover">
    <div class="cover-header">
        <div class="brand-title">Mini<span>Hub</span> Car</div>
        <div class="brand-badge">Documentação Funcional v2.4</div>
    </div>
    
    <div class="cover-body">
        <div class="cover-kicker">Arquitetura de Negócio e Casos de Uso</div>
        <div class="cover-title">Documentação Funcional da Plataforma</div>
        <div class="cover-subtitle">Visão aprofundada dos módulos do sistema: Catálogo Canônico, Garagem Pessoal, Motor de Pré-Vendas, Gestão de Recebíveis e Health Score.</div>
        
        <div class="cover-image-container">
            <img src="{HERO_B64}" alt="MiniHub Car Plataforma">
        </div>
        
        <div class="cover-meta">
            <div class="meta-item">
                <label>Autor / Responsável</label>
                <value>Carlos Portes</value>
            </div>
            <div class="meta-item">
                <label>Ambiente Homologado</label>
                <value>Produção (v2.4.0)</value>
            </div>
            <div class="meta-item">
                <label>Status Operacional</label>
                <value>Ativo e Auditado</value>
            </div>
        </div>
    </div>
    
    <div class="cover-footer">
        <div>MiniHub Car &copy; 2026 &bull; O Hub do Colecionismo Diecast</div>
        <div>Confidencial &bull; Distribuição Controlada</div>
    </div>
</div>

<!-- PÁGINA 1: VISÃO GERAL E ARQUITETURA -->
<div class="page">
    <h1>1. Visão Geral e Arquitetura do MiniHub Car</h1>
    <p>O <strong>MiniHub Car</strong> é a primeira plataforma integrada da América Latina desenvolvida especificamente para a comunidade e ecossistema de colecionismo de miniaturas automotivas (escalas 1:64, 1:43, 1:24 e 1:18). Diferente de marketplaces genéricos como Mercado Livre ou Shopee, o MiniHub Car une uma base catalográfica canônica com valor de mercado em tempo real, gestão de garagem do colecionador, marketplace especializado e um motor exclusivo de <strong>pré-vendas com proteção contra inadimplência</strong>.</p>
    
    <div class="info-card success">
        <div class="card-title">💡 Proposta de Valor Central</div>
        Eliminar a desorganização de compras via grupos informais de WhatsApp/Facebook, profissionalizar a operação dos importadores/vendedores homologados e permitir que os colecionadores tenham visibilidade contábil e emocional de seu patrimônio de miniaturas.
    </div>

    <h2>1.1 Perfis de Usuários no Sistema</h2>
    <table>
        <tr>
            <th>Perfil / Role</th>
            <th>Nível de Acesso</th>
            <th>Principais Atribuições no Sistema</th>
        </tr>
        <tr>
            <td><strong>Visitante</strong></td>
            <td>Público (Sem Login)</td>
            <td>Navega pelo catálogo canônico de miniaturas, visualiza ofertas públicas e pesquisa variações e marcas.</td>
        </tr>
        <tr>
            <td><strong>Colecionador (COLLECTOR)</strong></td>
            <td>Autenticado (Free ou Pro)</td>
            <td>Gerencia sua Garagem Virtual, cria Wishlist com alertas de preço, adere a pré-vendas, acompanha parcelas e interage na comunidade.</td>
        </tr>
        <tr>
            <td><strong>Vendedor Homologado (SELLER)</strong></td>
            <td>Credenciado após verificação</td>
            <td>Cria campanhas de pré-vendas, ofertas à pronta entrega, gerencia recebíveis, dá baixa em parcelas, importa planilhas e consulta o Score de Confiança dos compradores.</td>
        </tr>
        <tr>
            <td><strong>Curador / Admin (ADMIN)</strong></td>
            <td>Gestão Geral</td>
            <td>Aprova cadastro de novos lojistas, modera solicitações de novas miniaturas no catálogo canônico e audita a saúde do ecossistema.</td>
        </tr>
    </table>

    <h2>1.2 Os 6 Grandes Pilares Funcionais</h2>
    <ul>
        <li><strong>Catálogo Canônico Rastreável:</strong> Mais de 22.000 modelos indexados com ano, série, escala, cor, tipo de roda e casting.</li>
        <li><strong>Garagem Virtual Patrimonial:</strong> Registro do estado físico (Lacrado, Loose, Blister com detalhe), localização e valor de mercado.</li>
        <li><strong>Marketplace à Pronta Entrega:</strong> Anúncios vinculados diretamente ao catálogo, sem duplicidade de títulos nem anúncios fantasmas.</li>
        <li><strong>Motor de Pré-Vendas Especializado:</strong> Suporte a Sinal, Saldo na Chegada e Parcelamento Próprio em até 10 parcelas.</li>
        <li><strong>Importador em Lote via Planilha:</strong> Migração imediata de carteiras existentes em Excel com preservação de parcelas já quitadas.</li>
        <li><strong>Collector Health Score (Score de Confiança):</strong> Algoritmo antifraude que cruza a adimplência de compradores entre todos os lojistas homologados.</li>
    </ul>
</div>

<!-- PÁGINA 2: MÓDULOS DETALHADOS -->
<div class="page">
    <h1>2. Especificação Detalhada dos Módulos</h1>

    <h2>2.1 Catálogo Canônico de Miniaturas</h2>
    <p>O coração do sistema baseia-se em uma ontologia relacional rigorosa, impedindo a proliferação de anúncios confusos. Cada miniatura obedece à hierarquia:</p>
    <div class="code-block">
Marca (ex: Hot Wheels / Mini GT) &rarr; Escala (ex: 1:64) &rarr; Casting (ex: Nissan Skyline GT-R R34) &rarr; Variação (Ano 2025, Cor Bayside Blue, Linha Car Culture, Blister Card #04/05)
    </div>
    <p>Isso permite que um colecionador encontre todas as ofertas de um modelo exato com 1 clique, comparando preços reais entre vendedores homologados.</p>

    <h2>2.2 Garagem Virtual & Coleção Pessoal</h2>
    <p>A Garagem é o espaço afetivo e financeiro do colecionador. Ao adicionar um item à sua garagem, o usuário registra:</p>
    <ul>
        <li><strong>Condição da Peça:</strong> Lacrado Perfeito, Blister com Amassado, Cartela Curta/Longa, ou Peça Loose (Solta).</li>
        <li><strong>Localização Física:</strong> Identificação da gaveta, estante ou caixa organizadora (ex: "Expositor Sala 02 - Prateleira B").</li>
        <li><strong>Financeiro Pessoal:</strong> Preço de compra, data de aquisição e comparação com a média de mercado do MiniHub Car.</li>
    </ul>

    <h2>2.3 Motor Avançado de Pré-Vendas</h2>
    <p>Diferente de e-commerces convencionais que cobram 100% adiantado no cartão de crédito com taxas bancárias altas, o modelo de importação de miniaturas exige meses de espera até a liberação aduaneira. O MiniHub Car implementou 3 modalidades de compra:</p>
    
    <table>
        <tr>
            <th>Modalidade</th>
            <th>Fluxo Financeiro</th>
            <th>Melhor Aplicação</th>
        </tr>
        <tr>
            <td><strong>1. Pagamento na Chegada</strong></td>
            <td>R$ 0 na reserva. O valor integral é liquidado quando o contêiner chega e o lojista confirma a posse.</td>
            <td>Clientes com Score Verde e lançamentos de baixo valor com grande demanda.</td>
        </tr>
        <tr>
            <td><strong>2. Sinal + Saldo</strong></td>
            <td>Um valor de entrada (ex: 20% a 50%) no momento da reserva, e o restante pago no momento do envio.</td>
            <td>Linhas especiais de alto valor (ex: Caixas fechadas Master Case ou miniaturas 1:18).</td>
        </tr>
        <tr>
            <td><strong>3. Parcelamento em até 10x</strong></td>
            <td>O valor total é dividido em parcelas mensais que o comprador quita mês a mês enquanto a miniatura viaja.</td>
            <td>Miniaturas premium de colecionador (Mini GT, Inno64, Kaido House). A miniatura chega já 100% quitada.</td>
        </tr>
    </table>
</div>

<!-- PÁGINA 3: CASOS DE USO E NOVO FLUXO DE IMPORTAÇÃO -->
<div class="page">
    <h1>3. Casos de Uso Críticos e Novas Funcionalidades</h1>

    <h2>3.1 Caso de Uso UC-04: Cadastro Rápido com Criação Automática de Comprador</h2>
    <p>Para solucionar o atrito de clientes que compram do vendedor mas ainda não conhecem o MiniHub Car, desenvolvemos a funcionalidade de <strong>Provisionamento Transparente</strong>:</p>
    
    <div class="info-card highlight">
        <div class="card-title">🔐 Criação de Contas com Credencial Padronizada</div>
        Ao cadastrar uma pré-venda manual, se o e-mail do cliente não constar no banco de dados, o sistema automaticamente cria a conta dele com a senha inicial <code>MiniHub@2026</code>, plano <code>FREE</code> e perfil <code>COLLECTOR</code>. O comprador é notificado via WhatsApp em 1 clique e já pode acessar sua área pessoal imediatamente.
    </div>

    <div class="content-image">
        <img src="{PREORDER_FLOW_B64}" alt="Fluxo de Pré-Vendas e Integração">
        <div class="image-caption">Figura 1.1: Diagrama conceitual do ecossistema de pré-vendas, parcelamento, integração com planilhas e Score de Confiança.</div>
    </div>

    <h2>3.2 Caso de Uso UC-05: Importação em Lote via Planilha com Parcelas Baixadas</h2>
    <p>O vendedor que já possui 50, 100 ou 500 pré-vendas ativas em suas próprias planilhas não precisa redigitar nada. Ele baixa o modelo CSV oficial, preenche os dados e o sistema realiza:</p>
    <ol>
        <li>Validação e saneamento dos campos de comprador, modelo, datas e valores.</li>
        <li>Identificação das parcelas que o cliente já pagou anteriormente, gravando o status como <code>PAID</code> e registrando a data de liquidação.</li>
        <li>Cálculo automático do saldo devedor restante e agendamento dos vencimentos futuros.</li>
        <li>Geração de um relatório com botões de disparo de WhatsApp individual para cada colecionador.</li>
    </ol>
</div>

<!-- PÁGINA 4: SCORE DE CONFIANÇA E FECHAMENTO -->
<div class="page">
    <h1>4. O Algoritmo de Reputação (Collector Health Score)</h1>
    <p>Um dos maiores problemas do setor de miniaturas no Brasil é o "reservador fantasma": indivíduos que pedem reservas com diversos vendedores simultaneamente e, quando o produto chega do exterior após 90 dias, cancelam ou bloqueiam o vendedor no WhatsApp.</p>
    
    <h2>4.1 Como Funciona o Cruzamento de Dados</h2>
    <p>O MiniHub Car monitora o comportamento de pagamento em nível de ecossistema. Toda vez que uma parcela vence ou uma reserva é cancelada sem justificativa, o algoritmo atualiza o Health Score do comprador de forma proporcional:</p>

    <table>
        <tr>
            <th>Faixa de Pontuação</th>
            <th>Classificação</th>
            <th>Impacto para o Vendedor</th>
            <th>Ação Recomendada</th>
        </tr>
        <tr>
            <td><span class="badge badge-green">90 a 100 pts</span></td>
            <td><strong>Verde &bull; Adimplente Notável</strong></td>
            <td>Zero histórico de inadimplência. Honra 100% das reservas e paga antes do prazo em múltiplos vendedores.</td>
            <td>Aceitar reservas na modalidade Pagamento na Chegada ou sem sinal.</td>
        </tr>
        <tr>
            <td><span class="badge badge-yellow">70 a 89 pts</span></td>
            <td><strong>Amarelo &bull; Atenção Moderada</strong></td>
            <td>Atrasos esporádicos em parcelas ou histórico recente de poucas compras registradas.</td>
            <td>Exigir sinal mínimo de 30% a 50% na reserva.</td>
        </tr>
        <tr>
            <td><span class="badge badge-red">&lt; 70 pts</span></td>
            <td><strong>Vermelho &bull; Alto Risco</strong></td>
            <td>Desistências unilaterais de pré-vendas ou atrasos reiterados superiores a 30 dias em lojistas da rede.</td>
            <td>Recusar a pré-venda ou solicitar quitação integral antecipada.</td>
        </tr>
    </table>

    <div class="info-card warning">
        <div class="card-title">🛡️ Privacidade e Conformidade com a LGPD</div>
        Os vendedores nunca têm acesso a informações financeiras sigilosas de outros lojistas. O sistema apenas exibe a pontuação agregada (Score) e a cor do semáforo, protegendo o sigilo comercial e a privacidade dos dados de compra.
    </div>

    <h2>4.2 Conclusão e Próximos Passos</h2>
    <p>A arquitetura funcional do MiniHub Car estabelece um novo padrão de confiabilidade para o hobby no país, transformando a relação informal de compras em um ambiente protegido, profissional e altamente engajador para vendedores e colecionadores.</p>
</div>

</body>
</html>"""
    output_pdf = PDF_DIR / "Documento_1_Documentacao_Funcional_MiniHubCar.pdf"
    return compile_html_to_pdf(html, output_pdf)


# ==============================================================================
# 2. DOCUMENTO 2: APOSTILA DE TREINAMENTO PARA VENDEDORES HOMOLOGADOS
# ==============================================================================
def generate_doc2():
    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>MiniHub Car - Apostila de Treinamento para Vendedores</title>
<style>
{COMMON_CSS}
</style>
</head>
<body>

<!-- CAPA -->
<div class="cover">
    <div class="cover-header">
        <div class="brand-title">Mini<span>Hub</span> Car</div>
        <div class="brand-badge">Manual do Vendedor Homologado</div>
    </div>
    
    <div class="cover-body">
        <div class="cover-kicker">Guia Prático Operacional</div>
        <div class="cover-title">Apostila de Treinamento para Vendedores Homologados</div>
        <div class="cover-subtitle">Manual definitivo para dominar a gestão de pré-vendas, modalidades de recebimento, importação via planilhas e análise do Health Score de compradores.</div>
        
        <div class="cover-image-container">
            <img src="{PREORDER_FLOW_B64}" alt="Ecossistema de Pré-Vendas">
        </div>
        
        <div class="cover-meta">
            <div class="meta-item">
                <label>Público Alvo</label>
                <value>Lojas e Importadores</value>
            </div>
            <div class="meta-item">
                <label>Módulo Principal</label>
                <value>Portal do Vendedor (/seller)</value>
            </div>
            <div class="meta-item">
                <label>Edição Oficial</label>
                <value>2026.1 &bull; Atualizado</value>
            </div>
        </div>
    </div>
    
    <div class="cover-footer">
        <div>MiniHub Car &copy; 2026 &bull; Programa de Vendedores Homologados</div>
        <div>Uso Exclusivo para Parceiros Credenciados</div>
    </div>
</div>

<!-- PÁGINA 1: BOAS-VINDAS E PORTAL -->
<div class="page">
    <h1>1. Boas-Vindas ao Programa de Vendedores Homologados</h1>
    <p>Parabéns por fazer parte da rede seleta de <strong>Vendedores Homologados do MiniHub Car</strong>. Este selo atesta que sua loja opera com transparência, procedência autêntica e seriedade no cumprimento de pré-vendas e envios no Brasil.</p>
    
    <div class="info-card success">
        <div class="card-title">🎯 Objetivo Desta Apostila</div>
        Capacitá-lo a operar 100% dos recursos do Portal do Vendedor, migrar sua carteira atual de clientes sem atrito, parcelar pré-vendas com segurança e usar o <strong>Score de Confiança dos Compradores</strong> para blindar seu caixa contra cancelamentos.
    </div>

    <h2>1.1 As 5 Abas do seu Portal do Vendedor (/seller)</h2>
    <ul>
        <li><strong>Aba 1: Ofertas (Pronta Entrega):</strong> Anuncie miniaturas que já estão fisicamente no seu estoque, com fotos reais, estado da embalagem e cálculo de frete automático.</li>
        <li><strong>Aba 2: Pré-Vendas:</strong> Seu centro de controle operacional. Acompanhe campanhas de importação, reservas de compradores, parcelas vencendo e histórico de pagamentos.</li>
        <li><strong>Aba 3: Relatórios Financeiros:</strong> Exportação de dados contábeis, faturamento consolidado, montante a receber e previsão de fluxo de caixa mês a mês.</li>
        <li><strong>Aba 4: Status dos Colecionadores (Health Score):</strong> Consulta individual ou em rede da saúde financeira dos compradores cadastrados.</li>
        <li><strong>Aba 5: Configurações de Frete:</strong> Integração direta com token Melhor Envio para gerar etiquetas com desconto e rastreio em tempo real.</li>
    </ul>

    <h2>1.2 As 3 Modalidades de Pré-Venda que Você Pode Oferecer</h2>
    <p>Ao cadastrar uma pré-venda, você tem flexibilidade total para definir como o cliente pagará:</p>
    <table>
        <tr>
            <th>Modalidade</th>
            <th>Como Funciona para o Comprador</th>
            <th>Vantagem para a Sua Loja</th>
        </tr>
        <tr>
            <td><strong>Sinal + Saldo</strong></td>
            <td>Paga um valor de garantia hoje (ex: R$ 30) e o restante somente quando o contêiner chegar.</td>
            <td>Garante o compromisso do comprador e financia parte do custo aduaneiro.</td>
        </tr>
        <tr>
            <td><strong>Parcelamento (até 10x)</strong></td>
            <td>O valor é dividido em parcelas mensais com vencimento programado até a chegada do lote.</td>
            <td>Aumenta seu ticket médio: o cliente compra 3 ou 4 miniaturas porque cabe suavemente no orçamento mensal.</td>
        </tr>
        <tr>
            <td><strong>Integral na Chegada</strong></td>
            <td>Não paga nada no momento da reserva; liquida 100% assim que o produto chega ao Brasil.</td>
            <td>Excelente para esgotar rapidamente lotes de altíssima procura entre compradores <strong>Score Verde</strong>.</td>
        </tr>
    </table>
</div>

<!-- PÁGINA 2: CADASTRO MANUAL E CRIAÇÃO AUTOMÁTICA -->
<div class="page">
    <h1>2. Como Cadastrar Pré-Vendas de Forma Individual</h1>
    <p>Quando um cliente fechar um pedido direto com você pelo WhatsApp ou balcão da loja, você não precisa pedir para ele criar conta primeiro. Você faz isso em menos de 1 minuto através do botão <strong>+ Cadastrar Pré-Venda</strong>.</p>

    <h2>2.1 O Passo a Passo no Modal Inteligente</h2>
    <ol>
        <li><strong>Etapa 1: Dados do Comprador:</strong>
            <ul>
                <li>Digite o <strong>Nome Completo</strong>, <strong>E-mail</strong> e <strong>WhatsApp</strong> do cliente.</li>
                <li><em>O que acontece nos bastidores:</em> Se ele já tiver cadastro, o sistema localiza a conta dele. Se não tiver, o sistema cria o usuário na hora com a senha padrão <code>MiniHub@2026</code>.</li>
            </ul>
        </li>
        <li><strong>Etapa 2: Dados da Miniatura:</strong>
            <ul>
                <li>Informe o modelo (ex: <em>Nissan Skyline GT-R R34 Nismo</em>), a marca (<em>Mini GT</em>), escala (<em>1:64</em>), quantidade, valor unitário e a data estimada de chegada do lote.</li>
            </ul>
        </li>
        <li><strong>Etapa 3: Cronograma de Parcelamento e Baixa de Parcelas Antigas:</strong>
            <ul>
                <li>Escolha o número de parcelas (ex: 3x). O sistema calcula as datas e valores automaticamente.</li>
                <li>Se o cliente já fez o pagamento de alguma parcela antes (ex: pagou a entrada no PIX), marque o checkbox <strong>"Parcela já paga pelo cliente?"</strong>, informe a data e a forma de pagamento.</li>
                <li>O sistema já registra a parcela como <strong>QUITADA</strong>, atualizando o saldo real da pré-venda.</li>
            </ul>
        </li>
        <li><strong>Etapa 4: Resumo & Disparo de WhatsApp em 1 Clique:</strong>
            <ul>
                <li>Aparece um botão verde <strong>"Enviar Dados no WhatsApp"</strong>.</li>
                <li>Ao clicar, o WhatsApp abre automaticamente com uma mensagem pronta contendo o resumo da reserva, o valor das parcelas e as instruções de login com a senha provisória dele.</li>
            </ul>
        </li>
    </ol>

    <div class="info-card highlight">
        <div class="card-title">📱 Mensagem Automática Enviada ao Comprador</div>
        <em>"Olá, [Nome do Cliente]! Sua reserva da miniatura [Modelo] na [Sua Loja] foi cadastrada com sucesso no MiniHub Car. Acesse seu painel pelo link para acompanhar suas parcelas e previsão de chegada. Seu login: [E-mail] | Senha provisória: MiniHub@2026"</em>
    </div>
</div>

<!-- PÁGINA 3: IMPORTAÇÃO EM LOTE VIA PLANILHA CSV -->
<div class="page">
    <h1>3. Importação em Lote via Planilha Excel / CSV</h1>
    <p>Se você já possui dezenas ou centenas de clientes em uma planilha do Excel, não perca tempo cadastrando um a um. Use o recurso <strong>Importar Planilha (.csv)</strong>.</p>

    <h2>3.1 Como Baixar o Modelo e Preencher</h2>
    <p>Na aba Pré-Vendas, clique em <strong>Importar Planilha (.csv)</strong> e em seguida em <strong>"Baixar Modelo CSV"</strong>. O arquivo já vem configurado no padrão brasileiro (delimitador ponto e vírgula <code>;</code> e codificação UTF-8 com suporte a acentuação).</p>

    <h2>3.2 Os 2 Formatos Aceitos pelo Sistema</h2>
    
    <h3>A) Formato Resumido (1 linha por pedido - Mais Rápido)</h3>
    <p>Ideal quando você quer registrar o total do pedido e quantas parcelas o cliente já quitou:</p>
    <div class="code-block">
Comprador;Email;Telefone;Miniatura;Marca;Preco;Total Parcelas;Parcelas Já Pagas;Valor Já Pago
Bruno Lima;bruno@email.com;11999991111;Porsche 911 GT3;Mini GT;150,00;3;1;50,00
    </div>
    <p>O sistema criará a conta do Bruno, agendará 3 parcelas de R$ 50, marcará a 1ª como paga e deixará as outras 2 para os próximos meses.</p>

    <h3>B) Formato Detalhado (1 linha por parcela - Máxima Precisão)</h3>
    <p>Ideal quando as parcelas têm valores diferentes ou datas de vencimento específicas:</p>
    <div class="code-block">
Comprador;Email;Miniatura;Preco;Nº Parcela;Valor Parcela;Vencimento;Parcela Paga (S/N)
Bruno Lima;bruno@email.com;Porsche 911 GT3;150,00;1;50,00;2026-03-10;S
Bruno Lima;bruno@email.com;Porsche 911 GT3;150,00;2;50,00;2026-04-10;N
Bruno Lima;bruno@email.com;Porsche 911 GT3;150,00;3;50,00;2026-05-10;N
    </div>

    <h2>3.3 Validação e Tela de Preview</h2>
    <p>Ao arrastar sua planilha para o modal, o sistema exibirá uma tabela de conferência em tempo real antes de salvar:</p>
    <ul>
        <li>Total de pedidos detectados.</li>
        <li>Quantos compradores novos serão criados e quantos já existem.</li>
        <li>Montante total já quitado e valor total futuro a receber.</li>
    </ul>
</div>

<!-- PÁGINA 4: SCORE DE CONFIANÇA E PROTEÇÃO -->
<div class="page">
    <h1>4. O Grande Diferencial: Collector Health Score</h1>
    <p>O maior risco financeiro do importador de miniaturas é o <strong>calote no momento da entrega</strong>. Muitas vezes você reserva US$ 2.000 em miniaturas na fábrica com base nas mensagens de WhatsApp dos clientes, e quando o lote chega após 3 meses, 20% a 30% dos clientes dizem: <em>"Puxa, esse mês apertou, não vou poder ficar..."</em></p>
    
    <h2>4.1 O Cruzamento Inteligente entre Vendedores Homologados</h2>
    <p>No MiniHub Car, <strong>a sua loja não está mais sozinha</strong>. Quando um comprador faz reservas com o Vendedor A, com o Vendedor B e com a sua Loja, o sistema consolida o histórico de adimplência dele em toda a rede:</p>

    <div class="content-image">
        <img src="{MARKET_VISION_B64}" alt="Rede de Confiança MiniHub Car">
        <div class="image-caption">Figura 2.1: A rede integrada de reputação protege o capital de giro de todos os vendedores homologados.</div>
    </div>

    <h2>4.2 Como Tomar Decisões Baseadas no Semáforo</h2>
    <table>
        <tr>
            <th>Cor do Score</th>
            <th>Comportamento Real do Cliente</th>
            <th>Como Você Deve Agir</th>
        </tr>
        <tr>
            <td>🟢 <strong>VERDE (90-100)</strong></td>
            <td>Cliente Premium. Paga as parcelas em dia ou adiantado em todas as lojas homologadas. Zero cancelamentos injustificados.</td>
            <td>Pode liberar reservas com 100% de confiança, inclusive na modalidade de Pagamento na Chegada sem sinal.</td>
        </tr>
        <tr>
            <td>🟡 <strong>AMARELO (70-89)</strong></td>
            <td>Cliente em Alerta. Costuma atrasar parcelas em 5 a 15 dias ou é um colecionador novo com poucas transações registradas.</td>
            <td>Exija sinal mínimo de 30% a 50% e não faça o pedido na fábrica sem o sinal pago.</td>
        </tr>
        <tr>
            <td>🔴 <strong>VERMELHO (&lt; 70)</strong></td>
            <td>Cliente de Risco. Histórico de reservas abandonadas em outros vendedores da rede ou inadimplência grave.</td>
            <td><strong>Não assuma o risco!</strong> Exija o pagamento de 100% do valor antecipado ou recuse a reserva com segurança.</td>
        </tr>
    </table>

    <div class="info-card warning">
        <div class="card-title">💡 Dica de Ouro para o Vendedor</div>
        Sempre que um cliente novo pedir reserva pelo WhatsApp, cadastre-o no MiniHub Car e cheque a aba <strong>Status dos Colecionadores</strong>. Você saberá em segundos se ele é um bom pagador em outros lojistas antes de empenhar o seu capital de giro!
    </div>
</div>

</body>
</html>"""
    output_pdf = PDF_DIR / "Documento_2_Apostila_Treinamento_Vendedores.pdf"
    return compile_html_to_pdf(html, output_pdf)


# ==============================================================================
# 3. DOCUMENTO 3: MATERIAL COMERCIAL & PITCH DECK
# ==============================================================================
def generate_doc3():
    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>MiniHub Car - Apresentação Comercial e Visão Estratégica</title>
<style>
{COMMON_CSS}
</style>
</head>
<body>

<!-- CAPA COM AVATAR DO CARLOS PORTES -->
<div class="cover">
    <div class="cover-header">
        <div class="brand-title">Mini<span>Hub</span> Car</div>
        <div class="brand-badge">Apresentação Institucional 2026</div>
    </div>
    
    <div class="cover-body">
        <div class="cover-kicker">Mercado, Posicionamento e Inovação</div>
        <div class="cover-title">O Hub Definitivo do Colecionismo Diecast no Brasil</div>
        <div class="cover-subtitle">Conectando mais de 500 mil colecionadores de miniaturas a vendedores homologados através de tecnologia, catálogo unificado e segurança financeira.</div>
        
        <div class="cover-image-container">
            <img src="{HERO_B64}" alt="MiniHub Car Desktop">
        </div>
        
        <div class="cover-meta">
            <div class="meta-item">
                <label>Fundador & Líder do Projeto</label>
                <value>Carlos Portes</value>
            </div>
            <div class="meta-item">
                <label>Contato Oficial</label>
                <value>carlosportes@gmail.com</value>
            </div>
            <div class="meta-item">
                <label>Segmento de Atuação</label>
                <value>Diecast 1:64, 1:43 & Collectibles</value>
            </div>
        </div>
    </div>
    
    <div class="cover-footer">
        <div>MiniHub Car &bull; Onde a paixão por miniaturas encontra a tecnologia</div>
        <div>São Paulo &bull; Brasil</div>
    </div>
</div>

<!-- PÁGINA 1: O FUNDADOR E O MERCADO -->
<div class="page">
    <h1>1. Da Paixão de Colecionador à Solução do Mercado</h1>
    
    <div class="author-profile">
        <img src="{AVATAR_B64}" alt="Carlos Portes" class="author-avatar">
        <div class="author-info">
            <h4>Carlos Portes</h4>
            <div class="role">Fundador do MiniHub Car &bull; Colecionador Ávido &bull; carlosportes@gmail.com</div>
            <p>"Coleciono miniaturas há anos. Vivi na pele a frustração de não saber exatamente quanto valia minha coleção, a angústia de comprar peças em grupos de WhatsApp sem garantia, e vi grandes amigos importadores quase quebrarem por causa de calotes em reservas de pré-vendas. O MiniHub Car nasceu para resolver essas dores definitivamente."</p>
        </div>
    </div>

    <h2>1.1 O Mercado Bilionário do Colecionismo Diecast</h2>
    <p>O mercado de miniaturas automotivas em escala (liderado por marcas globais como <strong>Hot Wheels, Mini GT, Inno64, Kaido House, Tarmac Works, Greenlight e Matchbox</strong>) não é brinquedo de criança: é um mercado adulto, altamente rentável e composto por entusiastas passionais com elevado poder aquisitivo.</p>

    <table>
        <tr>
            <th>Métrica do Mercado no Brasil</th>
            <th>Dado Consolidado</th>
            <th>Significado Estratégico</th>
        </tr>
        <tr>
            <td><strong>Público Colecionador Ativo</strong></td>
            <td>+500.000 pessoas</td>
            <td>Comunidade vibrante engajada em dezenas de convenções, clubes e encontros presenciais.</td>
        </tr>
        <tr>
            <td><strong>Ticket Médio de Miniaturas Especiais</strong></td>
            <td>R$ 120 a R$ 600 / unidade</td>
            <td>Modelos como Hot Wheels RLC (Red Line Club) ou Kaido House atingem facilmente mais de R$ 400.</td>
        </tr>
        <tr>
            <td><strong>Volume de Transações Informais</strong></td>
            <td>+R$ 180 Milhões / ano</td>
            <td>Mais de 80% das compras ocorrem em canais informais sem segurança jurídica nem rastreabilidade contábil.</td>
        </tr>
    </table>

    <h2>1.2 As Dores Crônicas do Ecossistema Atual</h2>
    <ul>
        <li><strong>Para o Colecionador:</strong> Risco frequente de fraudes, falta de registro do valor patrimonial de sua coleção, dependência de tabelas desatualizadas e anúncios duplicados ou confusos em marketplaces generalistas.</li>
        <li><strong>Para os Vendedores e Lojistas:</strong> Taxas predatórias de 18% a 22% em sites generalistas, e altíssimo índice de calote (20% a 35%) em reservas de pré-vendas organizadas em cadernos e planilhas de Excel.</li>
    </ul>
</div>

<!-- PÁGINA 2: A PROPOSTA DE VALOR DO MINIHUB CAR -->
<div class="page">
    <h1>2. O MiniHub Car como Solução Unificada</h1>
    <p>O MiniHub Car integra todas as pontas do ecossistema em uma plataforma única, verticalizada e pensada nos mínimos detalhes para quem ama colecionar:</p>

    <div class="content-image">
        <img src="{MARKET_VISION_B64}" alt="Ecossistema MiniHub Car">
        <div class="image-caption">Figura 3.1: Conectando colecionadores, dados históricos, catálogo de 22k itens e importadores em rede segura.</div>
    </div>

    <h2>2.1 Os 4 Pilares da Proposta de Valor</h2>
    
    <div class="info-card success">
        <div class="card-title">1. Catálogo Canônico com Mais de 22.000 Modelos</div>
        Acervo catalográfico oficial em português, indexando variantes, cores, rodas, séries especiais (Boulevard, Car Culture, Super Treasure Hunt) e preço médio real praticado.
    </div>

    <div class="info-card highlight">
        <div class="card-title">2. Garagem Virtual Patrimonial</div>
        O colecionador registra suas peças, sabe onde estão guardadas, acompanha a valorização financeira e exibe sua coleção com orgulho para a comunidade.
    </div>

    <div class="info-card warning">
        <div class="card-title">3. Motor de Pré-Vendas com Parcelamento em até 10x</div>
        Permite ao lojista vender lotes de importação que demoram meses para chegar, oferecendo parcelamento mensal via PIX ou cartão, com baixas automáticas e exportação financeira.
    </div>

    <div class="info-card">
        <div class="card-title">4. Algoritmo Anticalote: Collector Health Score</div>
        Cruzamento de dados entre todos os vendedores credenciados. Quem é mau pagador fica sinalizado em vermelho; quem é bom pagador tem crédito e vantagens especiais.
    </div>
</div>

<!-- PÁGINA 3: ROADMAP E OPORTUNIDADE DE PARCERIA -->
<div class="page">
    <h1>3. Roadmap Estratégico: O Futuro da Plataforma</h1>
    <p>O MiniHub Car foi construído com arquitetura moderna e escalável. Nossa visão vai muito além de um classificado: seremos o sistema operacional global do colecionismo automotivo.</p>

    <table>
        <tr>
            <th>Fase / Prazo</th>
            <th>Marcos e Inovações Tecnológicas</th>
            <th>Status</th>
        </tr>
        <tr>
            <td><strong>Fase 1 (Atual)</strong><br>2026.Q1</td>
            <td>Catálogo Canônico 22k+, Garagem Virtual, Portal do Vendedor, Motor de Pré-Vendas, Importador de Planilhas e Collector Health Score.</td>
            <td><span class="badge badge-green">Concluído &bull; Operando</span></td>
        </tr>
        <tr>
            <td><strong>Fase 2</strong><br>2026.Q2</td>
            <td><strong>Sistema de Leilões ao Vivo (Live Auctions):</strong> Disputa de lances em tempo real com garantia de pagamento (Escrow) e transmissão para peças raras.</td>
            <td><span class="badge badge-blue">Em Desenvolvimento</span></td>
        </tr>
        <tr>
            <td><strong>Fase 3</strong><br>2026.Q3</td>
            <td><strong>App Mobile com Scanner de IA:</strong> O colecionador aponta a câmera do celular para o blister da miniatura e o aplicativo reconhece o modelo na hora pelo banco de dados visual!</td>
            <td><span class="badge badge-purple">Pesquisa &amp; Prototipagem</span></td>
        </tr>
        <tr>
            <td><strong>Fase 4</strong><br>2026.Q4</td>
            <td><strong>Passaporte Digital de Procedência:</strong> Certificado de autenticidade para peças de alta raridade (RLC, Conventions, Customs premiados).</td>
            <td><span class="badge badge-yellow">Planejado</span></td>
        </tr>
    </table>

    <h2>3.1 Convite Exclusivo para Vendedores Pioneiros</h2>
    <p>Estamos selecionando os primeiros 50 vendedores e importadores de miniaturas do Brasil para compor o conselho pioneiro do MiniHub Car com benefícios exclusivos:</p>
    <ul>
        <li>Isenção de mensalidade no plano PRO durante o primeiro ano.</li>
        <li>Destaque nas campanhas de marketing da plataforma para milhares de colecionadores.</li>
        <li>Migração assistida e gratuita de todas as suas planilhas de clientes e pré-vendas.</li>
        <li>Acesso prioritário ao módulo de leilões ao vivo.</li>
    </ul>

    <div class="info-card success">
        <div class="card-title">🤝 Faça Parte Desta Revolução com Carlos Portes</div>
        Venha profissionalizar suas vendas e fazer parte da comunidade que mais cresce no Brasil.<br>
        <strong>E-mail direto do fundador:</strong> carlosportes@gmail.com &bull; <strong>Plataforma:</strong> minihubcar.com.br
    </div>
</div>

</body>
</html>"""
    output_pdf = PDF_DIR / "Documento_3_Apresentacao_Comercial_MiniHubCar.pdf"
    return compile_html_to_pdf(html, output_pdf)

# ==============================================================================
# 4. DOCUMENTO 4: PLANO DE AÇÃO PARA REDES SOCIAIS & LANÇAMENTO
# ==============================================================================
def generate_doc4():
    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>MiniHub Car - Plano de Ação para Redes Sociais</title>
<style>
{COMMON_CSS}
</style>
</head>
<body>

<!-- CAPA -->
<div class="cover">
    <div class="cover-header">
        <div class="brand-title">Mini<span>Hub</span> Car</div>
        <div class="brand-badge">Kit de Lançamento &bull; Mídias Sociais</div>
    </div>
    
    <div class="cover-body">
        <div class="cover-kicker">Estratégia de Aquisição Orgânica</div>
        <div class="cover-title">Plano de Ação para Instagram, Facebook e WhatsApp</div>
        <div class="cover-subtitle">Guia passo a passo de divulgação utilizando o perfil pessoal do fundador Carlos Portes para atrair os primeiros 1.000 colecionadores e 50 vendedores homologados.</div>
        
        <div class="cover-image-container">
            <img src="{MARKET_VISION_B64}" alt="Estratégia de Comunidade">
        </div>
        
        <div class="cover-meta">
            <div class="meta-item">
                <label>Canal Principal</label>
                <value>Perfil Pessoal (Carlos Portes)</value>
            </div>
            <div class="meta-item">
                <label>Público-Alvo</label>
                <value>Colecionadores e Lojistas</value>
            </div>
            <div class="meta-item">
                <label>Meta de Adoção</label>
                <value>1.000 Garagens Ativas</value>
            </div>
        </div>
    </div>
    
    <div class="cover-footer">
        <div>MiniHub Car &copy; 2026 &bull; Estratégia de Crescimento</div>
        <div>Uso Exclusivo do Fundador</div>
    </div>
</div>

<!-- PÁGINA 1: ESTRATÉGIA E INSTAGRAM -->
<div class="page">
    <h1>1. A Força do Lançamento pelo Perfil Pessoal</h1>
    <p>No nicho de miniaturas colecionáveis, a confiança é o fator mais determinante para o sucesso. Vendedores e colecionadores são frequentemente alvos de golpes em redes sociais. Quando <strong>Carlos Portes — um colecionador ativo e real — apresenta a plataforma</strong>, o nível de adesão e reciprocidade é infinitamente superior ao de uma empresa anônima.</p>

    <div class="author-profile">
        <img src="{AVATAR_B64}" alt="Carlos Portes" class="author-avatar">
        <div class="author-info">
            <h4>Carlos Portes no Centro da Narrativa</h4>
            <div class="role">Fundador &bull; carlosportes@gmail.com</div>
            <p>A mensagem principal é a de um colecionador experiente que resolveu construir a solução que faltava no mercado para beneficiar toda a comunidade.</p>
        </div>
    </div>

    <h2>1.1 Instagram: Roteiro de Posts de Alto Impacto</h2>
    
    <h3>Post 1 (Feed): O Storytelling de Lançamento</h3>
    <div class="info-card highlight">
        <div class="card-title">📝 Texto Pronto para a Foto Pessoal / Avatar</div>
        <em>"🏎️ Quem me conhece sabe que minha paixão por miniaturas não é de hoje... São anos garimpando, esperando contêiner chegar e trocando ideias com amigos colecionadores em todo o Brasil.<br><br>
        Mas quem coleciona sabe as dores: planilhas perdidas, falta de um catálogo completo em português, compras com medo de golpe e lojistas amigos levando calote em pré-vendas.<br><br>
        Por isso criei o <strong>MiniHub Car</strong>: a primeira plataforma feita de colecionador para colecionador!<br>
        ✅ Catálogo com +22.000 miniaturas (Hot Wheels, Mini GT, Inno64, Kaido House);<br>
        ✅ Garagem Virtual com cálculo de valor de mercado da sua coleção;<br>
        ✅ Módulo de pré-vendas com proteção anticalote e parcelamento.<br><br>
        O site está no ar! Convido todos os amigos a criarem sua Garagem gratuitamente: <strong>minihubcar.com.br</strong> (Link na bio!)"</em>
    </div>

    <h3>Post 2: Carrossel Didático ("Quanto Vale sua Coleção Hoje?")</h3>
    <ul>
        <li><strong>Slide 1:</strong> "Você sabe quanto vale o seu acervo de miniaturas hoje?"</li>
        <li><strong>Slide 2:</strong> A maioria das pessoas tem R$ 5.000 a R$ 50.000 em miniaturas sem nenhum controle contábil.</li>
        <li><strong>Slide 3:</strong> Como a Garagem do MiniHub Car organiza por estantes, estado físico e cotação de mercado.</li>
        <li><strong>Slide 4:</strong> Como o catálogo oficial em português facilita a busca de variações raras.</li>
        <li><strong>Slide 5:</strong> Convite para cadastrar e descobrir o valor real com chamada para o link na bio.</li>
    </ul>
</div>

<!-- PÁGINA 2: FACEBOOK E WHATSAPP -->
<div class="page">
    <h1>2. Abordagem nos Grupos do Facebook e no WhatsApp</h1>

    <h2>2.1 Facebook: Grupos de Colecionismo (Diecast Brasil / Hot Wheels)</h2>
    <p>Para evitar moderação em grupos fechados de colecionadores, o tom deve ser 100% comunitário e focado em ajuda mútua, sem parecer propaganda agressiva:</p>
    
    <div class="info-card">
        <div class="card-title">👥 Texto para Publicação em Grupos</div>
        <em>"Fala pessoal, tudo bem? Como muitos aqui, coleciono miniaturas há bastante tempo (muito focado em 1:64, Mini GT e linhas especiais da Hot Wheels). Sempre senti falta de um catálogo completo em português e de um lugar seguro pra organizar a coleção sem precisar de planilha confusa.<br><br>
        Nos últimos meses criei o <strong>MiniHub Car (minihubcar.com.br)</strong>. Já temos mais de 22.000 miniaturas cadastradas e a criação da Garagem é 100% gratuita. E pros lojistas e importadores amigos, criamos um sistema anticalote de pré-vendas com importação de planilha do Excel.<br><br>
        Dêem uma olhada e me digam o que acharam! Quero construir essa plataforma ouvindo a opinião de cada um de vocês. Valeu!"</em>
    </div>

    <h2>2.2 WhatsApp: Mensagem Direta 1 a 1 para Lojistas e Importadores</h2>
    <div class="info-card success">
        <div class="card-title">📲 Abordagem para o Vendedor / Importador Parceiro</div>
        <em>"Fala [Nome], tudo bem?<br><br>
        Tô te mandando essa mensagem porque sei o trabalho gigante que você tem controlando reservas e parcelas de pré-vendas no caderninho e no WhatsApp. Quantas vezes você já não tomou prejuízo com gente que pediu reserva e sumiu quando o produto chegou?<br><br>
        Eu criei uma plataforma focada nisso chamada <strong>MiniHub Car</strong>. Você consegue parcelar em até 10x, subir sua planilha antiga do Excel em 1 minuto sem redigitar nada e mandar mensagem com parcelas pro cliente no WhatsApp com 1 clique.<br><br>
        E o melhor: temos o <strong>Score de Confiança</strong> que cruza o histórico do comprador na rede inteira, pra você saber se ele é bom pagador antes de empenhar seu dinheiro na importação!<br><br>
        Quero te colocar como um dos nossos vendedores pioneiros com isenção total de mensalidade. Dá uma olhada no site minihubcar.com.br e me diz o que achou!"</em>
    </div>

    <h2>2.3 Roteiro de Status do WhatsApp</h2>
    <p>Publique uma sequência de 3 telas nos Status:</p>
    <ol>
        <li><strong>Status 1 (Foto pessoal/avatar):</strong> "Depois de meses de trabalho com muito carinho, o MiniHub Car está oficialmente no ar!"</li>
        <li><strong>Status 2 (Foto do notebook com a plataforma):</strong> "Mais de 22 mil miniaturas catalogadas. Monte sua Garagem e saiba quanto vale sua coleção hoje."</li>
        <li><strong>Status 3 (Link clicável):</strong> "Acesse gratuitamente agora: minihubcar.com.br"</li>
    </ol>
</div>

</body>
</html>"""
    output_pdf = PDF_DIR / "Documento_4_Plano_Divulgacao_Redes_Sociais.pdf"
    return compile_html_to_pdf(html, output_pdf)

if __name__ == "__main__":
    print("Iniciando geração dos 4 PDFs Executivos...")
    ok1 = generate_doc1()
    ok2 = generate_doc2()
    ok3 = generate_doc3()
    ok4 = generate_doc4()
    if ok1 and ok2 and ok3 and ok4:
        print("\n🎉 Todos os 4 PDFs foram gerados com sucesso absoluto!")
    else:
        print("\n⚠️ Ocorreu um erro na geração de um ou mais documentos.")
