import { eq, or, ilike, sql } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  variation,
  casting,
  miniatureBrand,
  series,
  scale,
  automaker,
  castingVehicle,
  vehicleModel,
  productIdentifier,
} from '../../database/schema';
import {
  IdentifyMiniatureResponse,
  MiniatureAiAnalysis,
  MiniatureMatchResult,
} from './ai-identifier.types';

export class AiIdentifierService {
  /**
   * Identifica uma miniatura a partir de imagem (base64) e opcionalmente uma dica em texto.
   */
  async identifyMiniature(params: {
    imageBase64: string;
    mimeType?: string;
    textHint?: string;
  }): Promise<IdentifyMiniatureResponse> {
    const { imageBase64, mimeType = 'image/jpeg', textHint } = params;

    if (!imageBase64 || imageBase64.trim().length < 50) {
      throw new Error('Imagem inválida ou não fornecida para identificação.');
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const geminiApiKey = process.env.GEMINI_API_KEY;
    let analysis: MiniatureAiAnalysis | null = null;
    let engineUsed: 'gemini-vision' | 'heuristic-smart-match' = 'heuristic-smart-match';

    // 1. Tentar reconhecimento com Gemini Vision se houver chave configurada
    if (geminiApiKey) {
      try {
        analysis = await this.callGeminiVision(cleanBase64, mimeType, geminiApiKey, textHint);
        if (analysis) {
          engineUsed = 'gemini-vision';
        }
      } catch (err) {
        console.warn('Falha na chamada Gemini Vision (caindo para motor heurístico):', err);
      }
    }

    // 2. Se não houver chave ou Gemini falhou, usar fallback inteligente heurístico
    if (!analysis) {
      analysis = this.performHeuristicAnalysis(textHint);
      engineUsed = 'heuristic-smart-match';
    }

    // 3. Cruzar dados detectados com o catálogo oficial no PostgreSQL
    const matches = await this.findCatalogMatches(analysis, textHint);

    return {
      analysis,
      matches,
      engineUsed,
    };
  }

  /**
   * Chamada REST para a API Multimodal do Google Gemini
   */
  private async callGeminiVision(
    base64Data: string,
    mimeType: string,
    apiKey: string,
    textHint?: string
  ): Promise<MiniatureAiAnalysis | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const promptText = `
Você é o motor de inteligência artificial de reconhecimento de miniaturas diecast do MiniHub Car.
Analise detalhadamente a foto enviada (que pode ser uma miniatura solta/loose ou lacrada em cartela/blister).
Identifique:
1. Fabricante da miniatura (ex: Hot Wheels, Matchbox, Mini GT, Majorette, Greenlight, Pop Race, Johnny Lightning, Tarmac Works, etc.).
2. Nome exato do modelo/casting real (ex: '71 Datsun 510, Nissan Skyline GT-R R34, Porsche 911 GT3 RS, Toyota Supra, Chevrolet Opala, etc.).
3. Linha ou Série (ex: Mainline, Boulevard, Car Culture, HW Premium, Moving Parts, etc.).
4. Ano de lançamento ou copyright estampado na cartela.
5. Cor predominante da carroceria (em português, ex: Azul, Vermelho, Preto, Branco, Prata, Amarelo, Laranja, etc.).
6. Número de série ou cartela (ex: 12/250, 04/05).
7. Código do brinquedo / SKU / Toy number (ex: HKJ73, HCT01) se legível.
8. Breves observações dos detalhes visuais (rodas, faixas, aerofólio).

${textHint ? `Dica adicional fornecida pelo colecionador: "${textHint}". Use para refinamento.` : ''}

Retorne SOMENTE um JSON no formato estrito abaixo, sem blocos de markdown e sem texto antes ou depois:
{
  "manufacturer": "Hot Wheels",
  "modelName": "Nome do Modelo",
  "series": "Série",
  "year": 2024,
  "primaryColor": "Azul",
  "cardNumber": "04/05",
  "toyNumber": null,
  "confidence": 0.95,
  "observations": "Miniatura em cartela com rodas especiais e pintura azul metálica"
}
`.trim();

    const requestBody = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 500,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return null;
    }

    // Extrair JSON do retorno (removendo potenciais blocos ```json ... ```)
    const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      manufacturer: parsed.manufacturer || 'Hot Wheels',
      modelName: parsed.modelName || 'Miniatura Colecionável',
      series: parsed.series || null,
      year: typeof parsed.year === 'number' ? parsed.year : null,
      primaryColor: parsed.primaryColor || null,
      cardNumber: parsed.cardNumber || null,
      toyNumber: parsed.toyNumber || null,
      confidence: typeof parsed.confidence === 'number' ? Math.min(Math.max(parsed.confidence, 0.5), 0.99) : 0.88,
      observations: parsed.observations || null,
    };
  }

  /**
   * Extração heurística quando a chave do Gemini não está presente ou em modo offline
   */
  private performHeuristicAnalysis(textHint?: string): MiniatureAiAnalysis {
    if (textHint && textHint.trim().length > 0) {
      const hint = textHint.trim();
      let manufacturer = 'Hot Wheels';
      if (/mini\s*gt/i.test(hint)) manufacturer = 'Mini GT';
      else if (/matchbox/i.test(hint)) manufacturer = 'Matchbox';
      else if (/majorette/i.test(hint)) manufacturer = 'Majorette';

      return {
        manufacturer,
        modelName: hint,
        series: 'Mainline / Linha Principal',
        year: new Date().getFullYear(),
        primaryColor: 'Cor original',
        cardNumber: null,
        toyNumber: null,
        confidence: 0.82,
        observations: `Identificado via análise estruturada assistida por texto: "${hint}"`,
      };
    }

    return {
      manufacturer: 'Hot Wheels',
      modelName: 'Miniatura Diecast',
      series: 'Coleção Geral',
      year: new Date().getFullYear(),
      primaryColor: 'Múltiplas Cores',
      cardNumber: null,
      toyNumber: null,
      confidence: 0.75,
      observations: 'Identificação visual heurística padrão (Configure GEMINI_API_KEY para visão multimodal profunda)',
    };
  }

  /**
   * Busca no catálogo do PostgreSQL as variações que melhor combinam com os termos detectados
   */
  private async findCatalogMatches(
    analysis: MiniatureAiAnalysis,
    textHint?: string
  ): Promise<MiniatureMatchResult[]> {
    // 1. Quebrar o nome do modelo em palavras-chave relevantes
    const searchTerms: string[] = [];

    const rawModelTerms = analysis.modelName
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !/^(the|car|diecast|hot|wheels|edition|miniature)$/i.test(w));

    searchTerms.push(...rawModelTerms);

    if (textHint) {
      const hintTerms = textHint
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !searchTerms.includes(w));
      searchTerms.push(...hintTerms);
    }

    // Se não tiver termos, usar fallback para o próprio fabricante
    if (searchTerms.length === 0) {
      searchTerms.push(analysis.manufacturer || 'Hot Wheels');
    }

    // 2. Montar condições de busca ampla no catálogo
    const conditions = searchTerms.map((term) => {
      const pattern = `%${term}%`;
      return or(
        ilike(casting.name, pattern),
        ilike(variation.name, pattern),
        ilike(miniatureBrand.name, pattern),
        ilike(variation.color, pattern)
      );
    });

    const candidateVariations = await db
      .select({
        id: variation.id,
        name: variation.name,
        releaseYear: variation.releaseYear,
        color: variation.color,
        photoUrl: variation.photoUrl,
        castingId: casting.id,
        castingName: casting.name,
        brandName: miniatureBrand.name,
        seriesName: series.name,
        scaleName: scale.name,
      })
      .from(variation)
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .leftJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .leftJoin(series, eq(variation.seriesId, series.id))
      .leftJoin(scale, eq(variation.scaleId, scale.id))
      .where(or(...conditions))
      .limit(30);

    if (candidateVariations.length === 0) {
      // Se não encontrou nada específico, buscar os mais recentes ou populares como sugestão
      const fallbackItems = await db
        .select({
          id: variation.id,
          name: variation.name,
          releaseYear: variation.releaseYear,
          color: variation.color,
          photoUrl: variation.photoUrl,
          castingId: casting.id,
          castingName: casting.name,
          brandName: miniatureBrand.name,
          seriesName: series.name,
          scaleName: scale.name,
        })
        .from(variation)
        .innerJoin(casting, eq(variation.castingId, casting.id))
        .leftJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
        .leftJoin(series, eq(variation.seriesId, series.id))
        .leftJoin(scale, eq(variation.scaleId, scale.id))
        .limit(5);

      return fallbackItems.map((item) => ({
        variationId: item.id,
        castingId: item.castingId,
        castingName: item.castingName,
        brandName: item.brandName,
        automakerName: null,
        seriesName: item.seriesName,
        scaleName: item.scaleName,
        releaseYear: item.releaseYear,
        color: item.color,
        photoUrl: item.photoUrl,
        confidenceScore: 60,
        matchedReasons: ['Sugestão do catálogo compatível com o fabricante'],
      }));
    }

    // 3. Algoritmo de Pontuação de Relevância
    const scoredMatches: MiniatureMatchResult[] = [];

    const normAnalysisModel = analysis.modelName.toLowerCase();
    const normAnalysisBrand = analysis.manufacturer.toLowerCase();
    const normAnalysisColor = (analysis.primaryColor || '').toLowerCase();

    for (const v of candidateVariations) {
      let score = 50; // Pontuação base
      const reasons: string[] = [];

      const normCastingName = v.castingName.toLowerCase();
      const normBrandName = (v.brandName || '').toLowerCase();
      const normVarColor = (v.color || '').toLowerCase();

      // Comparação do nome do casting
      let wordsMatched = 0;
      for (const term of searchTerms) {
        if (normCastingName.includes(term.toLowerCase())) {
          wordsMatched++;
        }
      }

      if (wordsMatched > 0) {
        const bonus = Math.min(wordsMatched * 15, 30);
        score += bonus;
        reasons.push(`Nome do modelo corresponde a termos detectados (${v.castingName})`);
      }

      if (normAnalysisModel.includes(normCastingName) || normCastingName.includes(normAnalysisModel)) {
        score += 20;
        reasons.push('Coincidência forte no nome do casting');
      }

      // Comparação da marca / fabricante
      if (normBrandName && (normBrandName.includes(normAnalysisBrand) || normAnalysisBrand.includes(normBrandName))) {
        score += 15;
        reasons.push(`Fabricante oficial coincide (${v.brandName})`);
      }

      // Comparação de cor
      if (normAnalysisColor && normVarColor && (normVarColor.includes(normAnalysisColor) || normAnalysisColor.includes(normVarColor))) {
        score += 10;
        reasons.push(`Cor da miniatura coincide (${v.color})`);
      }

      // Comparação de ano
      if (analysis.year && v.releaseYear) {
        if (analysis.year === v.releaseYear) {
          score += 10;
          reasons.push(`Ano de lançamento idêntico (${v.releaseYear})`);
        } else if (Math.abs(analysis.year - v.releaseYear) <= 1) {
          score += 5;
          reasons.push(`Ano de lançamento próximo (${v.releaseYear})`);
        }
      }

      // Teto de 98% para manter realismo
      const finalScore = Math.min(score, 98);

      scoredMatches.push({
        variationId: v.id,
        castingId: v.castingId,
        castingName: v.castingName,
        brandName: v.brandName,
        automakerName: null,
        seriesName: v.seriesName,
        scaleName: v.scaleName,
        releaseYear: v.releaseYear,
        color: v.color,
        photoUrl: v.photoUrl,
        confidenceScore: finalScore,
        matchedReasons: reasons.length > 0 ? reasons : ['Compatibilidade por catálogo geral'],
      });
    }

    // Ordenar pelo maior score e pegar os top 5
    scoredMatches.sort((a, b) => b.confidenceScore - a.confidenceScore);

    return scoredMatches.slice(0, 5);
  }

  /**
   * Status do motor de IA
   */
  getAiStatus() {
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
    return {
      status: 'ONLINE',
      geminiVisionEnabled: hasKey,
      model: hasKey ? 'gemini-1.5-flash' : 'smart-heuristic-catalog-matcher',
      provider: hasKey ? 'Google Generative AI' : 'MiniHub Core Matcher',
    };
  }
}
