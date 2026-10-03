import { GarageRepository } from './garage.repository';
import { ShippingService } from './shipping.service';
import { ShippingQuoteInput, DispatchGarageInput } from './garage.schemas';

export class GarageService {
  constructor(
    private readonly repository = new GarageRepository(),
    private readonly shippingService = new ShippingService()
  ) {}

  async listMyGarage(buyerUserId: string) {
    return this.repository.listMyGarage(buyerUserId);
  }

  async cancelGarageItem(orderItemId: string, buyerUserId: string, reason?: string) {
    return this.repository.cancelGarageItem(orderItemId, buyerUserId, reason);
  }

  async calculateShippingQuote(buyerUserId: string, input: ShippingQuoteInput) {
    // 1. Get selected items from garage
    const items = await this.repository.getSelectedGarageItems(input.sellerId, input.itemIds, buyerUserId);

    // 2. Delegate to ShippingService
    return this.shippingService.calculateQuote({
      sellerId: input.sellerId,
      items,
      destinationZip: input.destinationZip,
      customWeightGrams: input.customWeightGrams,
      includeInsurance: input.includeInsurance,
    });
  }

  async dispatchGarage(buyerUserId: string, input: DispatchGarageInput) {
    return this.repository.dispatchGarage(buyerUserId, input);
  }
}
