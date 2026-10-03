import { eq, and, sql, ilike } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  location,
  collectionExemplar,
  exemplarLocation,
  variation,
  productIdentifier,
  conditionType,
  casting,
  miniatureBrand,
} from '../../database/schema';
import { acquisition, acquisitionItem } from '../../database/schema/transactions';
import {
  ImportLocationItem,
  ImportCollectionItem,
} from './import-export.schemas';

export interface LocationImportSuccess {
  line: number;
  name: string;
  parentName?: string | null;
  locationType?: string | null;
  hasGrid: boolean;
  dimensions?: string | null;
  status: 'CREATED' | 'UPDATED' | 'REUSED';
}

export interface LocationImportFailure {
  line: number;
  name: string;
  reason: string;
}

export interface LocationImportResult {
  total: number;
  successCount: number;
  failedCount: number;
  successes: LocationImportSuccess[];
  failures: LocationImportFailure[];
}

export interface CollectionImportSuccess {
  line: number;
  code: string;
  name: string;
  brand?: string | null;
  condition: string;
  locationName?: string | null;
  slot?: string | null;
  quantity: number;
  exemplarIds: string[];
}

export interface CollectionImportFailure {
  line: number;
  code: string;
  locationName?: string | null;
  reason: string;
}

export interface CollectionImportResult {
  total: number;
  successCount: number;
  failedCount: number;
  successes: CollectionImportSuccess[];
  failures: CollectionImportFailure[];
}

export class ImportExportService {
  /**
   * Generates sample CSV templates with BOM for Excel compatibility
   */
  generateTemplate(type: 'locations' | 'collection'): string {
    const BOM = '\uFEFF';
    if (type === 'locations') {
      const headers = ['Nome', 'Local_Pai', 'Tipo', 'Tem_Grade', 'Linhas', 'Colunas'];
      const rows = [
        ['Estante Principal', '', 'ESTANTE', 'NAO', '', ''],
        ['Prateleira 1', 'Estante Principal', 'PRATELEIRA', 'SIM', '5', '10'],
        ['Prateleira 2', 'Estante Principal', 'PRATELEIRA', 'SIM', '5', '10'],
        ['Expositor Parede Sala', '', 'EXPOSITOR', 'SIM', '10', '10'],
        ['Caixa Organizadora A', '', 'CAIXA', 'NAO', '', ''],
      ];
      const csv = [headers.join(';'), ...rows.map((r) => r.map((c) => `"${c}"`).join(';'))].join('\r\n');
      return BOM + csv;
    } else {
      const headers = [
        'Codigo_Identificador',
        'Quantidade',
        'Condicao',
        'Localizacao',
        'Linha_Grade',
        'Coluna_Grade',
        'Preco_Pago',
        'Data_Aquisicao',
        'Observacoes',
      ];
      const rows = [
        ['HKG34', '1', 'MINT', 'Prateleira 1', '1', '1', '15.90', '2024-05-10', 'Exemplo com Código Mattel e nicho de grade'],
        ['JBC92', '1', 'CARDED', 'Expositor Parede Sala', '2', '4', '29.90', '2024-06-15', 'Exemplo Lacrado na cartela original'],
        ['027084120134', '2', 'LOOSE', '', '', '', '10.00', '2024-01-20', 'Exemplo por Código de Barras sem localização'],
      ];
      const csv = [headers.join(';'), ...rows.map((r) => r.map((c) => `"${c}"`).join(';'))].join('\r\n');
      return BOM + csv;
    }
  }

  /**
   * Helper to parse CSV string with auto-detection of delimiter (; or ,) and quote escaping
   */
  parseCSVText(content: string): Array<{ line: number; data: Record<string, string> }> {
    const cleaned = content.replace(/^\uFEFF/, '').trim();
    if (!cleaned) return [];

    const rawLines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (rawLines.length < 2) return [];

    const firstLine = rawLines[0]!;
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const normalizeHeader = (h: string): string => {
      return h
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/^_+|_+$/g, '');
    };

    const headers = parseLine(firstLine).map(normalizeHeader);
    const parsedRows: Array<{ line: number; data: Record<string, string> }> = [];

    for (let i = 1; i < rawLines.length; i++) {
      const values = parseLine(rawLines[i]!);
      const rowData: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowData[h] = values[idx] || '';
      });
      parsedRows.push({ line: i + 1, data: rowData });
    }

    return parsedRows;
  }

  /**
   * Imports Locations Structure with validation and hierarchy resolution
   */
  async importLocations(
    userId: string,
    rawInput: string | ImportLocationItem[]
  ): Promise<LocationImportResult> {
    let rowsToProcess: Array<{ line: number; item: ImportLocationItem }> = [];

    if (typeof rawInput === 'string') {
      const parsed = this.parseCSVText(rawInput);
      rowsToProcess = parsed.map((p) => {
        const d = p.data;
        // Map various common header aliases
        const name = d.nome || d.name || d.local || d.nome_do_local || '';
        const parentName = d.local_pai || d.parent_name || d.pai || d.localizacao_pai || '';
        const type = d.tipo || d.tipo_local || d.location_type || d.type || 'ESTANTE';
        const rawGrid = (d.tem_grade || d.has_grid || d.grade || '').toUpperCase();
        const hasGrid = ['SIM', 'S', 'TRUE', '1', 'YES', 'Y'].includes(rawGrid);
        const rawRows = d.linhas || d.grid_rows || d.rows;
        const rows = rawRows ? parseInt(rawRows, 10) : undefined;
        const rawCols = d.colunas || d.grid_columns || d.cols;
        const cols = rawCols ? parseInt(rawCols, 10) : undefined;

        return {
          line: p.line,
          item: {
            name: name.trim(),
            parentName: parentName.trim() || null,
            locationType: type.trim().toUpperCase() || null,
            hasGrid,
            gridRows: rows && !isNaN(rows) ? rows : null,
            gridColumns: cols && !isNaN(cols) ? cols : null,
          },
        };
      });
    } else {
      rowsToProcess = rawInput.map((item, idx) => ({ line: idx + 2, item }));
    }

    const successes: LocationImportSuccess[] = [];
    const failures: LocationImportFailure[] = [];

    // Preload user's existing locations
    const existingLocations = await db
      .select({
        id: location.id,
        name: location.name,
        normalizedName: location.normalizedName,
        parentLocationId: location.parentLocationId,
        hasGrid: location.hasGrid,
        gridRows: location.gridRows,
        gridColumns: location.gridColumns,
      })
      .from(location)
      .where(and(eq(location.userId, userId), eq(location.status, 'ACTIVE')));

    // Location cache: normalizedName -> locationId
    const locationNameMap = new Map<string, string>();
    existingLocations.forEach((loc) => {
      locationNameMap.set(loc.normalizedName, loc.id);
    });

    // Pass 1: Roots (without parent) or items whose parent already exists
    const pendingPass2: Array<{ line: number; item: ImportLocationItem }> = [];

    for (const entry of rowsToProcess) {
      const { line, item } = entry;
      if (!item.name) {
        failures.push({
          line,
          name: '(vazio)',
          reason: "O campo 'Nome' do local é obrigatório.",
        });
        continue;
      }

      if (item.hasGrid && ((item.gridRows ?? 0) < 1 || (item.gridColumns ?? 0) < 1)) {
        failures.push({
          line,
          name: item.name,
          reason: 'Para locais com grade (Tem_Grade = SIM), informe Linhas e Colunas maiores que zero.',
        });
        continue;
      }

      if (!item.parentName) {
        // Root location
        const normalized = item.name.toLowerCase().trim();
        const existingId = locationNameMap.get(normalized);

        if (existingId) {
          successes.push({
            line,
            name: item.name,
            parentName: null,
            locationType: item.locationType,
            hasGrid: item.hasGrid,
            dimensions: item.hasGrid ? `${item.gridRows}x${item.gridColumns}` : null,
            status: 'REUSED',
          });
        } else {
          try {
            const [created] = await db
              .insert(location)
              .values({
                userId,
                name: item.name,
                normalizedName: normalized,
                parentLocationId: null,
                locationType: item.locationType || 'ESTANTE',
                hasGrid: item.hasGrid,
                gridRows: item.hasGrid ? item.gridRows : null,
                gridColumns: item.hasGrid ? item.gridColumns : null,
              })
              .returning();

            if (created) {
              locationNameMap.set(normalized, created.id);
              successes.push({
                line,
                name: item.name,
                parentName: null,
                locationType: item.locationType,
                hasGrid: item.hasGrid,
                dimensions: item.hasGrid ? `${item.gridRows}x${item.gridColumns}` : null,
                status: 'CREATED',
              });
            }
          } catch (err: any) {
            failures.push({
              line,
              name: item.name,
              reason: `Erro ao persistir localização: ${err.message || 'Falha no banco de dados'}`,
            });
          }
        }
      } else {
        // Needs parent check
        const normalizedParent = item.parentName.toLowerCase().trim();
        if (locationNameMap.has(normalizedParent)) {
          // Parent already known
          await this.insertChildLocation(userId, line, item, locationNameMap.get(normalizedParent)!, locationNameMap, successes, failures);
        } else {
          pendingPass2.push(entry);
        }
      }
    }

    // Pass 2: Process pending items with parents that were created in Pass 1
    for (const entry of pendingPass2) {
      const { line, item } = entry;
      const normalizedParent = item.parentName!.toLowerCase().trim();
      const parentId = locationNameMap.get(normalizedParent);

      if (!parentId) {
        failures.push({
          line,
          name: item.name,
          reason: `Local pai '${item.parentName}' não foi encontrado no seu cadastro nem no arquivo enviado.`,
        });
        continue;
      }

      await this.insertChildLocation(userId, line, item, parentId, locationNameMap, successes, failures);
    }

    return {
      total: rowsToProcess.length,
      successCount: successes.length,
      failedCount: failures.length,
      successes,
      failures,
    };
  }

  private async insertChildLocation(
    userId: string,
    line: number,
    item: ImportLocationItem,
    parentId: string,
    locationNameMap: Map<string, string>,
    successes: LocationImportSuccess[],
    failures: LocationImportFailure[]
  ) {
    const normalized = item.name.toLowerCase().trim();
    const existingId = locationNameMap.get(normalized);

    if (existingId) {
      successes.push({
        line,
        name: item.name,
        parentName: item.parentName,
        locationType: item.locationType,
        hasGrid: item.hasGrid,
        dimensions: item.hasGrid ? `${item.gridRows}x${item.gridColumns}` : null,
        status: 'REUSED',
      });
      return;
    }

    try {
      const [created] = await db
        .insert(location)
        .values({
          userId,
          name: item.name,
          normalizedName: normalized,
          parentLocationId: parentId,
          locationType: item.locationType || 'PRATELEIRA',
          hasGrid: item.hasGrid,
          gridRows: item.hasGrid ? item.gridRows : null,
          gridColumns: item.hasGrid ? item.gridColumns : null,
        })
        .returning();

      if (created) {
        locationNameMap.set(normalized, created.id);
        successes.push({
          line,
          name: item.name,
          parentName: item.parentName,
          locationType: item.locationType,
          hasGrid: item.hasGrid,
          dimensions: item.hasGrid ? `${item.gridRows}x${item.gridColumns}` : null,
          status: 'CREATED',
        });
      }
    } catch (err: any) {
      failures.push({
        line,
        name: item.name,
        reason: `Erro ao persistir localização: ${err.message || 'Falha no banco de dados'}`,
      });
    }
  }

  /**
   * Imports Collection with rigid validation:
   * 1. Product code must exist in official catalog (Mattel Code / Barcode / SKU).
   * 2. Physical location must exist in user's locations if specified.
   * 3. Grid coordinates validated against bounds and collision if specified.
   */
  async importCollection(
    userId: string,
    rawInput: string | ImportCollectionItem[]
  ): Promise<CollectionImportResult> {
    let rowsToProcess: Array<{ line: number; item: ImportCollectionItem }> = [];

    if (typeof rawInput === 'string') {
      const parsed = this.parseCSVText(rawInput);
      rowsToProcess = parsed.map((p) => {
        const d = p.data;
        const code = d.codigo_identificador || d.codigo || d.sku || d.mattel_code || d.barcode || d.codigo_mattel || d.codigo_produto || '';
        const qtyRaw = d.quantidade || d.qtd || d.qty || '1';
        const qty = parseInt(qtyRaw, 10);
        const condition = d.condicao || d.estado || d.estado_conservacao || d.condition || 'MINT';
        const loc = d.localizacao || d.local || d.localizacao_fisica || d.location || '';
        const rawRow = d.linha_grade || d.linha || d.grid_row;
        const row = rawRow ? parseInt(rawRow, 10) : null;
        const rawCol = d.coluna_grade || d.coluna || d.grid_column;
        const col = rawCol ? parseInt(rawCol, 10) : null;

        let price: number | null = null;
        const rawPrice = d.preco_pago || d.preco || d.valor || d.valor_pago || d.price || '';
        if (rawPrice) {
          const cleaned = rawPrice.replace(/[R$\s]/g, '').replace(',', '.');
          const num = parseFloat(cleaned);
          if (!isNaN(num)) price = num;
        }

        const date = d.data_aquisicao || d.data || d.acquisition_date || '';
        const notes = d.observacoes || d.obs || d.notes || '';
        const purchaseLoc = d.local_compra || d.compra_local || d.purchase_location || '';

        return {
          line: p.line,
          item: {
            code: code.trim(),
            quantity: isNaN(qty) || qty < 1 ? 1 : Math.min(qty, 100),
            conditionCode: condition.trim().toUpperCase(),
            locationName: loc.trim() || null,
            gridRow: row && !isNaN(row) ? row : null,
            gridColumn: col && !isNaN(col) ? col : null,
            purchasePrice: price,
            purchaseLocation: purchaseLoc.trim() || null,
            acquisitionDate: date.trim() || null,
            notes: notes.trim() || null,
          },
        };
      });
    } else {
      rowsToProcess = rawInput.map((item, idx) => ({ line: idx + 2, item }));
    }

    const successes: CollectionImportSuccess[] = [];
    const failures: CollectionImportFailure[] = [];

    // Preload conditions map (code -> id)
    const conditions = await db.select().from(conditionType);
    const conditionMap = new Map<string, string>();
    conditions.forEach((c) => {
      conditionMap.set(c.code.toUpperCase(), c.id);
    });

    // Synonyms helper
    const resolveConditionId = (rawCode: string): string => {
      const upper = (rawCode || '').toUpperCase().trim();
      if (conditionMap.has(upper)) return conditionMap.get(upper)!;
      if (['PERFEITO', 'NOVO', 'PERFEITA'].includes(upper)) return conditionMap.get('MINT') || conditions[0]!.id;
      if (['LACRADO', 'CARTELA', 'BLISTER'].includes(upper)) return conditionMap.get('CARDED') || conditions[0]!.id;
      if (['EXCELENTE', 'QUASE NOVO', 'NEAR MINT'].includes(upper)) return conditionMap.get('NEAR_MINT') || conditions[0]!.id;
      if (['BOM', 'REGULAR'].includes(upper)) return conditionMap.get('GOOD') || conditions[0]!.id;
      if (['SOLTO', 'LOOSE', 'SEM EMBALAGEM'].includes(upper)) return conditionMap.get('LOOSE') || conditions[0]!.id;
      if (['AVARIADO', 'DETALHES', 'DANIFICADO', 'DAMAGED'].includes(upper)) return conditionMap.get('DAMAGED') || conditions[0]!.id;
      return conditionMap.get('MINT') || conditions[0]!.id;
    };

    // Preload user's existing locations
    const userLocations = await db
      .select({
        id: location.id,
        name: location.name,
        normalizedName: location.normalizedName,
        hasGrid: location.hasGrid,
        gridRows: location.gridRows,
        gridColumns: location.gridColumns,
      })
      .from(location)
      .where(and(eq(location.userId, userId), eq(location.status, 'ACTIVE')));

    const locationMap = new Map<string, typeof userLocations[0]>();
    userLocations.forEach((loc) => {
      locationMap.set(loc.normalizedName, loc);
    });

    // Helper to format date YYYY-MM-DD
    const normalizeDate = (raw?: string | null): string => {
      if (!raw) return new Date().toISOString().split('T')[0]!;
      // Detect DD/MM/YYYY
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [d, m, y] = raw.split('/');
        return `${y}-${m}-${d}`;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      return new Date().toISOString().split('T')[0]!;
    };

    for (const entry of rowsToProcess) {
      const { line, item } = entry;

      // 1. Validate Code presence
      if (!item.code) {
        failures.push({
          line,
          code: '(vazio)',
          locationName: item.locationName,
          reason: 'O código de identificação da miniatura (SKU / Mattel Code / Barcode) é obrigatório.',
        });
        continue;
      }

      // 2. Validate Code in Official Catalog
      const normalizedCode = item.code.toLowerCase().trim();
      let matchedVariationId: string | null = null;
      let matchedVariationName = '';
      let matchedBrandName: string | null = null;

      // Search in productIdentifier
      const [foundByIdentifier] = await db
        .select({
          variationId: productIdentifier.variationId,
          variationName: variation.name,
          brandName: miniatureBrand.name,
        })
        .from(productIdentifier)
        .innerJoin(variation, eq(productIdentifier.variationId, variation.id))
        .innerJoin(casting, eq(variation.castingId, casting.id))
        .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
        .where(eq(productIdentifier.normalizedCode, normalizedCode))
        .limit(1);

      if (foundByIdentifier) {
        matchedVariationId = foundByIdentifier.variationId;
        matchedVariationName = foundByIdentifier.variationName;
        matchedBrandName = foundByIdentifier.brandName;
      } else {
        // Fallback: search in variation by collectorNumber or name
        const [foundByVariation] = await db
          .select({
            variationId: variation.id,
            variationName: variation.name,
            brandName: miniatureBrand.name,
          })
          .from(variation)
          .innerJoin(casting, eq(variation.castingId, casting.id))
          .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
          .where(
            sql`${variation.collectorNumber} = ${item.code.trim()} OR ${variation.name} ILIKE ${item.code.trim()}`
          )
          .limit(1);

        if (foundByVariation) {
          matchedVariationId = foundByVariation.variationId;
          matchedVariationName = foundByVariation.variationName;
          matchedBrandName = foundByVariation.brandName;
        }
      }

      if (!matchedVariationId) {
        failures.push({
          line,
          code: item.code,
          locationName: item.locationName,
          reason: `Miniatura com código '${item.code}' não foi encontrada no catálogo oficial. Verifique se o Código Mattel, SKU ou Código de Barras está correto.`,
        });
        continue;
      }

      // 3. Validate Location if specified
      let resolvedLocation: typeof userLocations[0] | null = null;
      if (item.locationName) {
        const normLoc = item.locationName.toLowerCase().trim();
        resolvedLocation = locationMap.get(normLoc) || null;

        if (!resolvedLocation) {
          failures.push({
            line,
            code: item.code,
            locationName: item.locationName,
            reason: `Localização '${item.locationName}' não existe no seu cadastro. Cadastre este local primeiro na aba de locais ou deixe a coluna vazia.`,
          });
          continue;
        }

        // Validate Grid Slot
        if (resolvedLocation.hasGrid && (item.gridRow || item.gridColumn)) {
          if (!item.gridRow || !item.gridColumn) {
            failures.push({
              line,
              code: item.code,
              locationName: item.locationName,
              reason: `Para posições em expositor com grade ('${resolvedLocation.name}'), é necessário informar tanto a Linha quanto a Coluna do nicho.`,
            });
            continue;
          }

          if (resolvedLocation.gridRows && item.gridRow > resolvedLocation.gridRows) {
            failures.push({
              line,
              code: item.code,
              locationName: item.locationName,
              reason: `A Linha ${item.gridRow} excede o limite do expositor '${resolvedLocation.name}' (máximo: ${resolvedLocation.gridRows} linhas).`,
            });
            continue;
          }

          if (resolvedLocation.gridColumns && item.gridColumn > resolvedLocation.gridColumns) {
            failures.push({
              line,
              code: item.code,
              locationName: item.locationName,
              reason: `A Coluna ${item.gridColumn} excede o limite do expositor '${resolvedLocation.name}' (máximo: ${resolvedLocation.gridColumns} colunas).`,
            });
            continue;
          }

          // Check Slot collision
          const [occupied] = await db
            .select({ id: exemplarLocation.id })
            .from(exemplarLocation)
            .where(
              and(
                eq(exemplarLocation.locationId, resolvedLocation.id),
                eq(exemplarLocation.gridRow, item.gridRow),
                eq(exemplarLocation.gridColumn, item.gridColumn),
                eq(exemplarLocation.isCurrent, true)
              )
            )
            .limit(1);

          if (occupied) {
            failures.push({
              line,
              code: item.code,
              locationName: item.locationName,
              reason: `O nicho na Linha ${item.gridRow}, Coluna ${item.gridColumn} de '${resolvedLocation.name}' já está ocupado por outra miniatura.`,
            });
            continue;
          }
        }
      }

      // 4. Persistence in Database
      try {
        const conditionId = resolveConditionId(item.conditionCode);
        const priceStr = item.purchasePrice != null ? item.purchasePrice.toFixed(2) : null;
        const acqDate = normalizeDate(item.acquisitionDate);
        const qty = item.quantity || 1;
        const createdExemplarIds: string[] = [];

        await db.transaction(async (tx) => {
          for (let q = 0; q < qty; q++) {
            // First unit gets grid slot; subsequent units if qty > 1 go into general location without slot
            const assignRow = q === 0 ? item.gridRow : null;
            const assignCol = q === 0 ? item.gridColumn : null;

            const [newExemplar] = await tx
              .insert(collectionExemplar)
              .values({
                userId,
                variationId: matchedVariationId!,
                conditionTypeId: conditionId,
                notes: item.notes || null,
                acquisitionDate: acqDate,
                purchasePrice: priceStr,
                purchaseLocation: item.purchaseLocation || null,
                status: 'ACTIVE',
              })
              .returning();

            if (!newExemplar) {
              throw new Error('Falha ao salvar exemplar no banco');
            }

            createdExemplarIds.push(newExemplar.id);

            // Link Location if resolved
            if (resolvedLocation) {
              await tx.insert(exemplarLocation).values({
                userId,
                exemplarId: newExemplar.id,
                locationId: resolvedLocation.id,
                gridRow: assignRow,
                gridColumn: assignCol,
                isCurrent: true,
              });
            }

            // Register Acquisition
            const [acq] = await tx
              .insert(acquisition)
              .values({
                userId,
                acquisitionType: 'PURCHASE',
                acquisitionDate: acqDate,
                sourceName: item.purchaseLocation || null,
                notes: item.notes || null,
              })
              .returning();

            if (acq) {
              await tx.insert(acquisitionItem).values({
                acquisitionId: acq.id,
                exemplarId: newExemplar.id,
                quantity: 1,
                unitCost: priceStr || '0.00',
                totalCost: priceStr || '0.00',
              });
            }
          }
        });

        const slotStr =
          resolvedLocation && item.gridRow && item.gridColumn
            ? `Linha ${item.gridRow}, Coluna ${item.gridColumn}`
            : null;

        successes.push({
          line,
          code: item.code,
          name: matchedVariationName,
          brand: matchedBrandName,
          condition: item.conditionCode,
          locationName: resolvedLocation?.name || null,
          slot: slotStr,
          quantity: qty,
          exemplarIds: createdExemplarIds,
        });
      } catch (err: any) {
        failures.push({
          line,
          code: item.code,
          locationName: item.locationName,
          reason: `Erro interno ao salvar exemplar: ${err.message || 'Falha de transação no banco de dados'}`,
        });
      }
    }

    return {
      total: rowsToProcess.length,
      successCount: successes.length,
      failedCount: failures.length,
      successes,
      failures,
    };
  }
}

export const importExportService = new ImportExportService();
