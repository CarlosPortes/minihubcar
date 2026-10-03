import { SellersRepository } from './sellers.repository';
import {
  ApplySellerInput,
  UpdateSellerProfileInput,
  ReviewSellerInput,
  CreateSellerShippingAddressInput,
  UpdateSellerShippingAddressInput,
  SaveShippingIntegrationInput,
  QuickCreateVariationInput,
} from './sellers.schemas';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/api-error';


export class SellersService {
  constructor(private readonly repository = new SellersRepository()) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async apply(userId: string, input: ApplySellerInput) {
    const existing = await this.repository.findByUserId(userId);
    if (existing) {
      if (existing.authorizationStatus === 'APPROVED') {
        throw new BadRequestError('Você já é um vendedor autorizado no MiniHub Car');
      }
      if (existing.authorizationStatus === 'PENDING') {
        throw new BadRequestError('Você já possui uma solicitação de vendedor em análise');
      }
    }

    const baseSlug = input.slug || this.slugify(input.storeName);
    let finalSlug = baseSlug;
    let counter = 1;

    while (true) {
      const slugExists = await this.repository.findBySlug(finalSlug);
      if (!slugExists) break;
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    return this.repository.createApplication(userId, input, finalSlug);
  }

  async getMe(userId: string) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      return null;
    }
    return profile;
  }

  async updateMe(userId: string, input: UpdateSellerProfileInput) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Perfil de vendedor não encontrado');
    }
    return this.repository.updateProfile(profile.id, input);
  }

  async getBySlug(slug: string) {
    const profile = await this.repository.findBySlug(slug);
    if (!profile) {
      throw new NotFoundError('Vendedor não encontrado');
    }
    return profile;
  }

  async listApplications(status?: string) {
    return this.repository.listApplications(status);
  }

  async review(sellerId: string, reviewerId: string, input: ReviewSellerInput) {
    const seller = await this.repository.findById(sellerId);
    if (!seller) {
      throw new NotFoundError('Vendedor não encontrado');
    }
    return this.repository.reviewApplication(sellerId, reviewerId, input);
  }

  async listAddresses(userId: string) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Perfil de vendedor não encontrado');
    }
    return this.repository.listAddresses(profile.id);
  }

  async createAddress(userId: string, input: CreateSellerShippingAddressInput) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Perfil de vendedor não encontrado');
    }
    return this.repository.createAddress(profile.id, input);
  }

  async updateAddress(userId: string, addressId: string, input: UpdateSellerShippingAddressInput) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Perfil de vendedor não encontrado');
    }
    return this.repository.updateAddress(profile.id, addressId, input);
  }

  async deleteAddress(userId: string, addressId: string) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Perfil de vendedor não encontrado');
    }
    return this.repository.deleteAddress(profile.id, addressId);
  }

  async listShippingIntegrations(userId: string) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Perfil de vendedor não encontrado');
    }
    return this.repository.listShippingIntegrations(profile.id);
  }

  async saveShippingIntegration(
    userId: string,
    provider: string,
    input: SaveShippingIntegrationInput
  ) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Perfil de vendedor não encontrado');
    }
    return this.repository.saveShippingIntegration(profile.id, provider, input);
  }

  async deleteShippingIntegration(userId: string, provider: string) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Perfil de vendedor não encontrado');
    }
    return this.repository.deleteShippingIntegration(profile.id, provider);
  }

  async quickCreateVariation(userId: string, input: QuickCreateVariationInput) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile || profile.authorizationStatus !== 'APPROVED' || !profile.isActive) {
      throw new ForbiddenError(
        'Apenas vendedores com credenciamento aprovado e ativo podem cadastrar miniaturas no catálogo.'
      );
    }

    if (!input.name.trim()) {
      throw new BadRequestError('O nome da miniatura é obrigatório.');
    }

    return this.repository.quickCreateVariation(profile.id, userId, profile.storeName, input);
  }
}

