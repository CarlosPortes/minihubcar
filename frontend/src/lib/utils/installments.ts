export interface CalculatedInstallment {
  installmentNumber: number;
  totalInstallments: number;
  amount: string;
  dueDateIso: string;
  dueDateFormatted: string;
  isFirst: boolean;
  description: string;
}

/**
 * Calcula o cronograma de parcelamento para pré-vendas com vencimento no mesmo dia
 * nos meses subsequentes e divisão proporcional do saldo restante após a 1ª parcela.
 */
export function calculateInstallmentSchedule(
  totalAmount: number,
  count: number,
  firstDateStr: string,
  customFirstAmount?: number
): CalculatedInstallment[] {
  if (count <= 0 || totalAmount <= 0) return [];

  // 1. Definição do valor da 1ª parcela
  let firstAmount: number;
  if (count === 1) {
    firstAmount = totalAmount;
  } else if (customFirstAmount !== undefined && !isNaN(customFirstAmount) && customFirstAmount > 0) {
    firstAmount = Math.min(customFirstAmount, totalAmount);
  } else {
    firstAmount = Math.floor((totalAmount / count) * 100) / 100;
  }

  // 2. Divisão do saldo restante proporcionalmente
  const remainingAmount = Math.max(0, Math.round((totalAmount - firstAmount) * 100) / 100);
  const remainingCount = count - 1;
  const baseRemaining = remainingCount > 0 ? Math.floor((remainingAmount / remainingCount) * 100) / 100 : 0;
  const roundingRemainder = remainingCount > 0
    ? Math.round((remainingAmount - baseRemaining * remainingCount) * 100) / 100
    : 0;

  // 3. Resolução da data base
  let baseYear = new Date().getFullYear();
  let baseMonth = new Date().getMonth();
  let baseDay = 10;

  if (firstDateStr && firstDateStr.trim()) {
    const parts = firstDateStr.split('-').map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      baseYear = parts[0];
      baseMonth = parts[1] - 1;
      baseDay = parts[2];
    }
  }

  const schedule: CalculatedInstallment[] = [];

  for (let i = 1; i <= count; i++) {
    let amount = 0;
    if (i === 1) {
      amount = firstAmount;
    } else if (i === count) {
      amount = baseRemaining + roundingRemainder;
    } else {
      amount = baseRemaining;
    }

    // Cálculo da data do mês correspondente preservando o dia
    const targetMonthIndex = baseMonth + (i - 1);
    const targetYear = baseYear + Math.floor(targetMonthIndex / 12);
    const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const actualDay = Math.min(baseDay, daysInTargetMonth);

    const dStr = String(actualDay).padStart(2, '0');
    const mStr = String(targetMonth + 1).padStart(2, '0');
    const yStr = String(targetYear);

    const isoDate = `${yStr}-${mStr}-${dStr}`;
    const formattedDate = `${dStr}/${mStr}/${yStr}`;

    schedule.push({
      installmentNumber: i,
      totalInstallments: count,
      amount: amount.toFixed(2),
      dueDateIso: isoDate,
      dueDateFormatted: formattedDate,
      isFirst: i === 1,
      description: i === 1 && count > 1
        ? '1ª Parcela (Entrada / Reserva)'
        : `Parcela ${i} de ${count}`,
    });
  }

  return schedule;
}
