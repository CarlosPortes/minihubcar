import { NotFoundError } from '../../shared/errors/api-error';
import { SellersRepository } from './sellers.repository';
import { SellersFinanceRepository } from './sellers-finance.repository';
import { SellerFinanceFilter } from './sellers-finance.schemas';

export class SellersFinanceService {
  constructor(
    private readonly sellersRepo = new SellersRepository(),
    private readonly financeRepo = new SellersFinanceRepository()
  ) {}

  async getFinancialReport(userId: string, filter?: SellerFinanceFilter) {
    const seller = await this.sellersRepo.findByUserId(userId);
    if (!seller) {
      throw new NotFoundError('Perfil de vendedor não encontrado');
    }

    const report = await this.financeRepo.getFinancialReport(seller.id, userId, filter);

    return {
      storeName: seller.storeName,
      slug: seller.slug,
      ...report,
    };
  }
}
