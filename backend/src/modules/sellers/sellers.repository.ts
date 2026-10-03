import { eq, desc, and } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  sellerProfile,
  sellerAuthorization,
  sellerShippingAddress,
  sellerShippingIntegration,
  appUser,
  miniatureBrand,
  automaker,
  vehicleModel,
  casting,
  castingVehicle,
  scale,
  variation,
  commercialProduct,
  catalogRequest,
} from '../../database/schema';
import {
  ApplySellerInput,
  UpdateSellerProfileInput,
  ReviewSellerInput,
  CreateSellerShippingAddressInput,
  UpdateSellerShippingAddressInput,
  SaveShippingIntegrationInput,
  QuickCreateVariationInput,
} from './sellers.schemas';


export class SellersRepository {
  async findByUserId(userId: string) {
    const [profile] = await db
      .select()
      .from(sellerProfile)
      .where(eq(sellerProfile.userId, userId))
      .limit(1);

    if (!profile) return null;

    const [latestAuth] = await db
      .select()
      .from(sellerAuthorization)
      .where(eq(sellerAuthorization.sellerId, profile.id))
      .orderBy(desc(sellerAuthorization.createdAt))
      .limit(1);

    return {
      ...profile,
      authorizationStatus: latestAuth?.status || 'NONE',
      authorizationNotes: latestAuth?.notes || null,
      reviewedAt: latestAuth?.reviewedAt || null,
    };
  }

  async findById(sellerId: string) {
    const [profile] = await db
      .select()
      .from(sellerProfile)
      .where(eq(sellerProfile.id, sellerId))
      .limit(1);

    if (!profile) return null;

    const [latestAuth] = await db
      .select()
      .from(sellerAuthorization)
      .where(eq(sellerAuthorization.sellerId, profile.id))
      .orderBy(desc(sellerAuthorization.createdAt))
      .limit(1);

    return {
      ...profile,
      authorizationStatus: latestAuth?.status || 'NONE',
      authorizationNotes: latestAuth?.notes || null,
    };
  }

  async findBySlug(slug: string) {
    const [profile] = await db
      .select({
        id: sellerProfile.id,
        storeName: sellerProfile.storeName,
        slug: sellerProfile.slug,
        bio: sellerProfile.bio,
        city: sellerProfile.city,
        state: sellerProfile.state,
        reputationScore: sellerProfile.reputationScore,
        totalSalesCount: sellerProfile.totalSalesCount,
        isActive: sellerProfile.isActive,
        createdAt: sellerProfile.createdAt,
      })
      .from(sellerProfile)
      .where(and(eq(sellerProfile.slug, slug), eq(sellerProfile.isActive, true)))
      .limit(1);

    return profile || null;
  }

  async createApplication(userId: string, input: ApplySellerInput, generatedSlug: string) {
    return db.transaction(async (tx) => {
      const [profile] = await tx
        .insert(sellerProfile)
        .values({
          userId,
          storeName: input.storeName,
          slug: input.slug || generatedSlug,
          bio: input.bio || null,
          postalCode: input.postalCode || null,
          street: input.street || null,
          number: input.number || null,
          complement: input.complement || null,
          neighborhood: input.neighborhood || null,
          city: input.city || null,
          state: input.state || null,
          phone: input.phone || null,
          isActive: true,
        })
        .returning();

      if (!profile) {
        throw new Error('Erro ao criar perfil de vendedor');
      }

      const [auth] = await tx
        .insert(sellerAuthorization)
        .values({
          sellerId: profile.id,
          status: 'PENDING',
        })
        .returning();

      if (!auth) {
        throw new Error('Erro ao registrar autorização do vendedor');
      }

      // If postal code and street was provided, automatically create primary dispatch address
      if (input.postalCode && input.street && input.number && input.city && input.state) {
        await tx.insert(sellerShippingAddress).values({
          sellerId: profile.id,
          label: 'Endereço Principal / Loja',
          contactName: input.storeName,
          postalCode: input.postalCode,
          street: input.street,
          number: input.number,
          complement: input.complement || null,
          neighborhood: input.neighborhood || '',
          city: input.city,
          state: input.state,
          phone: input.phone || null,
          isDefault: true,
        });
      }

      return {
        ...profile,
        authorizationStatus: auth.status,
      };
    });
  }

  async updateProfile(sellerId: string, input: UpdateSellerProfileInput) {
    const [updated] = await db
      .update(sellerProfile)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(sellerProfile.id, sellerId))
      .returning();

    return updated;
  }

  async listAddresses(sellerId: string) {
    return db
      .select()
      .from(sellerShippingAddress)
      .where(eq(sellerShippingAddress.sellerId, sellerId))
      .orderBy(desc(sellerShippingAddress.isDefault), desc(sellerShippingAddress.createdAt));
  }

  async createAddress(sellerId: string, input: CreateSellerShippingAddressInput) {
    return db.transaction(async (tx) => {
      // If setting this one as default, unset existing default
      if (input.isDefault) {
        await tx
          .update(sellerShippingAddress)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(sellerShippingAddress.sellerId, sellerId));
      }

      const existing = await tx
        .select({ id: sellerShippingAddress.id })
        .from(sellerShippingAddress)
        .where(eq(sellerShippingAddress.sellerId, sellerId))
        .limit(1);

      const isDefault = input.isDefault !== undefined ? input.isDefault : existing.length === 0;

      const [created] = await tx
        .insert(sellerShippingAddress)
        .values({
          sellerId,
          label: input.label,
          contactName: input.contactName || null,
          postalCode: input.postalCode,
          street: input.street,
          number: input.number,
          complement: input.complement || null,
          neighborhood: input.neighborhood,
          city: input.city,
          state: input.state,
          phone: input.phone || null,
          isDefault,
        })
        .returning();

      return created;
    });
  }

  async updateAddress(sellerId: string, addressId: string, input: UpdateSellerShippingAddressInput) {
    return db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(sellerShippingAddress)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(sellerShippingAddress.sellerId, sellerId));
      }

      const [updated] = await tx
        .update(sellerShippingAddress)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(and(eq(sellerShippingAddress.id, addressId), eq(sellerShippingAddress.sellerId, sellerId)))
        .returning();

      return updated;
    });
  }

  async deleteAddress(sellerId: string, addressId: string) {
    const [deleted] = await db
      .delete(sellerShippingAddress)
      .where(and(eq(sellerShippingAddress.id, addressId), eq(sellerShippingAddress.sellerId, sellerId)))
      .returning();

    return deleted;
  }

  async listApplications(status?: string) {
    const conditions = status ? [eq(sellerAuthorization.status, status)] : [];

    const rows = await db
      .select({
        id: sellerAuthorization.id,
        sellerId: sellerAuthorization.sellerId,
        status: sellerAuthorization.status,
        notes: sellerAuthorization.notes,
        createdAt: sellerAuthorization.createdAt,
        reviewedAt: sellerAuthorization.reviewedAt,
        storeName: sellerProfile.storeName,
        slug: sellerProfile.slug,
        city: sellerProfile.city,
        state: sellerProfile.state,
        userId: appUser.id,
        userName: appUser.name,
        userEmail: appUser.email,
      })
      .from(sellerAuthorization)
      .innerJoin(sellerProfile, eq(sellerAuthorization.sellerId, sellerProfile.id))
      .innerJoin(appUser, eq(sellerProfile.userId, appUser.id))
      .where(and(...conditions))
      .orderBy(desc(sellerAuthorization.createdAt));

    return rows.map((r) => ({
      id: r.id,
      sellerId: r.sellerId,
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      seller: {
        id: r.sellerId,
        storeName: r.storeName,
        slug: r.slug,
        city: r.city,
        state: r.state,
        user: {
          id: r.userId,
          name: r.userName,
          email: r.userEmail,
        },
      },
    }));
  }

  async reviewApplication(sellerId: string, reviewerId: string, input: ReviewSellerInput) {
    return db.transaction(async (tx) => {
      const [existingAuth] = await tx
        .select()
        .from(sellerAuthorization)
        .where(eq(sellerAuthorization.sellerId, sellerId))
        .orderBy(desc(sellerAuthorization.createdAt))
        .limit(1);

      let newAuth;
      if (existingAuth) {
        const [updated] = await tx
          .update(sellerAuthorization)
          .set({
            status: input.status,
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            notes: input.notes || null,
            updatedAt: new Date(),
          })
          .where(eq(sellerAuthorization.id, existingAuth.id))
          .returning();
        newAuth = updated;
      } else {
        const [inserted] = await tx
          .insert(sellerAuthorization)
          .values({
            sellerId,
            status: input.status,
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            notes: input.notes || null,
          })
          .returning();
        newAuth = inserted;
      }

      // If suspended or rejected, set inactive
      if (input.status === 'SUSPENDED' || input.status === 'REJECTED') {
        await tx
          .update(sellerProfile)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(sellerProfile.id, sellerId));
      } else if (input.status === 'APPROVED') {
        await tx
          .update(sellerProfile)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(sellerProfile.id, sellerId));
      }

      return newAuth;
    });
  }

  // ============================================================================
  // LOGISTICS & SHIPPING INTEGRATIONS (BYOK - Bring Your Own Key)
  // ============================================================================

  private maskApiKey(apiKey: string): string {
    if (!apiKey) return '';
    if (apiKey.length <= 8) return '****';
    return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
  }

  async listShippingIntegrations(sellerId: string) {
    const rows = await db
      .select()
      .from(sellerShippingIntegration)
      .where(eq(sellerShippingIntegration.sellerId, sellerId));

    return rows.map((r) => ({
      id: r.id,
      sellerId: r.sellerId,
      provider: r.provider,
      hasToken: !!r.apiKey,
      maskedApiKey: this.maskApiKey(r.apiKey),
      extraConfig: r.extraConfig || {},
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async getShippingIntegration(sellerId: string, provider: string) {
    const [row] = await db
      .select()
      .from(sellerShippingIntegration)
      .where(
        and(
          eq(sellerShippingIntegration.sellerId, sellerId),
          eq(sellerShippingIntegration.provider, provider)
        )
      )
      .limit(1);

    return row || null;
  }

  async getRawShippingIntegrations(sellerId: string) {
    return db
      .select()
      .from(sellerShippingIntegration)
      .where(
        and(
          eq(sellerShippingIntegration.sellerId, sellerId),
          eq(sellerShippingIntegration.isActive, true)
        )
      );
  }

  async saveShippingIntegration(
    sellerId: string,
    provider: string,
    input: SaveShippingIntegrationInput
  ) {
    const [existing] = await db
      .select()
      .from(sellerShippingIntegration)
      .where(
        and(
          eq(sellerShippingIntegration.sellerId, sellerId),
          eq(sellerShippingIntegration.provider, provider)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(sellerShippingIntegration)
        .set({
          apiKey: input.apiKey,
          extraConfig: input.extraConfig || {},
          isActive: input.isActive ?? true,
          updatedAt: new Date(),
        })
        .where(eq(sellerShippingIntegration.id, existing.id))
        .returning();

      if (!updated) {
        throw new Error('Falha ao atualizar integração de frete');
      }

      return {
        id: updated.id,
        sellerId: updated.sellerId,
        provider: updated.provider,
        hasToken: true,
        maskedApiKey: this.maskApiKey(updated.apiKey),
        extraConfig: updated.extraConfig || {},
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    }

    const [inserted] = await db
      .insert(sellerShippingIntegration)
      .values({
        sellerId,
        provider,
        apiKey: input.apiKey,
        extraConfig: input.extraConfig || {},
        isActive: input.isActive ?? true,
      })
      .returning();

    if (!inserted) {
      throw new Error('Falha ao registrar integração de frete');
    }

    return {
      id: inserted.id,
      sellerId: inserted.sellerId,
      provider: inserted.provider,
      hasToken: true,
      maskedApiKey: this.maskApiKey(inserted.apiKey),
      extraConfig: inserted.extraConfig || {},
      isActive: inserted.isActive,
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
    };
  }

  async deleteShippingIntegration(sellerId: string, provider: string) {
    const [deleted] = await db
      .delete(sellerShippingIntegration)
      .where(
        and(
          eq(sellerShippingIntegration.sellerId, sellerId),
          eq(sellerShippingIntegration.provider, provider)
        )
      )
      .returning();

    return !!deleted;
  }

  async quickCreateVariation(sellerId: string, userId: string, sellerStoreName: string, input: QuickCreateVariationInput) {
    return db.transaction(async (tx) => {
      // 1. Resolve Brand
      let resolvedBrandId = input.brandId;
      let resolvedBrandName = input.brandName?.trim();

      if (resolvedBrandId) {
        const [foundBrand] = await tx
          .select({ id: miniatureBrand.id, name: miniatureBrand.name })
          .from(miniatureBrand)
          .where(eq(miniatureBrand.id, resolvedBrandId))
          .limit(1);
        if (foundBrand) {
          resolvedBrandName = foundBrand.name;
        }
      } else if (resolvedBrandName) {
        const normBrand = resolvedBrandName.toLowerCase();
        let [foundBrand] = await tx
          .select({ id: miniatureBrand.id, name: miniatureBrand.name })
          .from(miniatureBrand)
          .where(eq(miniatureBrand.normalizedName, normBrand))
          .limit(1);

        if (!foundBrand) {
          const [insertedBrand] = await tx
            .insert(miniatureBrand)
            .values({
              name: resolvedBrandName,
              normalizedName: normBrand,
              status: 'ACTIVE',
            })
            .returning();
          foundBrand = insertedBrand;
        }
        if (foundBrand) {
          resolvedBrandId = foundBrand.id;
        }
      }

      if (!resolvedBrandId) {
        const [defaultBrand] = await tx
          .select({ id: miniatureBrand.id, name: miniatureBrand.name })
          .from(miniatureBrand)
          .limit(1);
        if (defaultBrand) {
          resolvedBrandId = defaultBrand.id;
          resolvedBrandName = defaultBrand.name;
        } else {
          const [insertedBrand] = await tx
            .insert(miniatureBrand)
            .values({
              name: 'Diversos / Outros',
              normalizedName: 'diversos / outros',
              status: 'ACTIVE',
            })
            .returning();
          if (!insertedBrand) {
            throw new Error('Falha ao registrar marca padrão');
          }
          resolvedBrandId = insertedBrand.id;
          resolvedBrandName = insertedBrand.name;
        }
      }

      // 2. Resolve Automaker (optional)
      let resolvedAutomakerId = input.automakerId || null;
      let resolvedAutomakerName = input.automakerName?.trim() || null;

      if (resolvedAutomakerId) {
        const [foundAuto] = await tx
          .select({ id: automaker.id, name: automaker.name })
          .from(automaker)
          .where(eq(automaker.id, resolvedAutomakerId))
          .limit(1);
        if (foundAuto) {
          resolvedAutomakerName = foundAuto.name;
        }
      } else if (resolvedAutomakerName) {
        const normAuto = resolvedAutomakerName.toLowerCase();
        let [foundAuto] = await tx
          .select({ id: automaker.id, name: automaker.name })
          .from(automaker)
          .where(eq(automaker.normalizedName, normAuto))
          .limit(1);

        if (!foundAuto) {
          const [insertedAuto] = await tx
            .insert(automaker)
            .values({
              name: resolvedAutomakerName,
              normalizedName: normAuto,
              status: 'ACTIVE',
            })
            .returning();
          foundAuto = insertedAuto;
        }
        if (foundAuto) {
          resolvedAutomakerId = foundAuto.id;
        }
      }

      // 3. Resolve Vehicle Model (optional)
      let resolvedVehicleModelId = input.vehicleModelId || null;
      let resolvedVehicleModelName = input.vehicleModelName?.trim() || null;

      if (resolvedVehicleModelId) {
        const [foundModel] = await tx
          .select({ id: vehicleModel.id, name: vehicleModel.name })
          .from(vehicleModel)
          .where(eq(vehicleModel.id, resolvedVehicleModelId))
          .limit(1);
        if (foundModel) {
          resolvedVehicleModelName = foundModel.name;
        }
      } else if (resolvedVehicleModelName && resolvedAutomakerId) {
        const normModel = resolvedVehicleModelName.toLowerCase();
        let [foundModel] = await tx
          .select({ id: vehicleModel.id, name: vehicleModel.name })
          .from(vehicleModel)
          .where(
            and(
              eq(vehicleModel.automakerId, resolvedAutomakerId),
              eq(vehicleModel.normalizedName, normModel)
            )
          )
          .limit(1);

        if (!foundModel) {
          const [insertedModel] = await tx
            .insert(vehicleModel)
            .values({
              automakerId: resolvedAutomakerId,
              name: resolvedVehicleModelName,
              normalizedName: normModel,
              status: 'ACTIVE',
            })
            .returning();
          foundModel = insertedModel;
        }
        if (foundModel) {
          resolvedVehicleModelId = foundModel.id;
        }
      }

      // 4. Resolve Scale (default 1:64)
      let resolvedScaleId = input.scaleId || null;
      if (!resolvedScaleId) {
        const denom = input.scaleDenominator || 64;
        const [foundScale] = await tx
          .select({ id: scale.id })
          .from(scale)
          .where(eq(scale.denominator, denom))
          .limit(1);

        if (foundScale) {
          resolvedScaleId = foundScale.id;
        } else {
          const [insertedScale] = await tx
            .insert(scale)
            .values({
              name: `1:${denom}`,
              numerator: 1,
              denominator: denom,
              normalizedValue: (1 / denom).toFixed(6),
              status: 'ACTIVE',
            })
            .returning();
          if (insertedScale) {
            resolvedScaleId = insertedScale.id;
          }
        }
      }

      // 5. Casting
      const rawCastingName =
        input.castingName?.trim() ||
        resolvedVehicleModelName ||
        input.name.trim();
      const normCasting = rawCastingName.toLowerCase();

      let [foundCasting] = await tx
        .select()
        .from(casting)
        .where(
          and(
            eq(casting.miniatureBrandId, resolvedBrandId),
            eq(casting.normalizedName, normCasting)
          )
        )
        .limit(1);

      if (!foundCasting) {
        const [insertedCasting] = await tx
          .insert(casting)
          .values({
            miniatureBrandId: resolvedBrandId,
            automakerId: resolvedAutomakerId,
            name: rawCastingName,
            normalizedName: normCasting,
            status: 'ACTIVE',
          })
          .returning();
        foundCasting = insertedCasting;
      }

      if (!foundCasting) {
        throw new Error('Falha ao processar molde da miniatura');
      }

      if (resolvedVehicleModelId) {
        const [existingLink] = await tx
          .select()
          .from(castingVehicle)
          .where(
            and(
              eq(castingVehicle.castingId, foundCasting.id),
              eq(castingVehicle.vehicleModelId, resolvedVehicleModelId)
            )
          )
          .limit(1);

        if (!existingLink) {
          await tx.insert(castingVehicle).values({
            castingId: foundCasting.id,
            vehicleModelId: resolvedVehicleModelId,
            relationshipType: 'EXACT',
          });
        }
      }

      // 6. Insert Variation
      const [newVariation] = await tx
        .insert(variation)
        .values({
          castingId: foundCasting.id,
          scaleId: resolvedScaleId,
          name: input.name.trim(),
          releaseYear: input.releaseYear || null,
          color: input.color?.trim() || null,
          photoUrl: input.photoUrl?.trim() || null,
          description: input.description?.trim() || null,
          status: 'ACTIVE',
        })
        .returning();

      if (!newVariation) {
        throw new Error('Falha ao cadastrar variação da miniatura');
      }

      // 7. Ensure CommercialProduct
      let [cp] = await tx
        .select()
        .from(commercialProduct)
        .where(eq(commercialProduct.variationId, newVariation.id))
        .limit(1);

      if (!cp) {
        const [newCp] = await tx
          .insert(commercialProduct)
          .values({
            variationId: newVariation.id,
            isActive: true,
          })
          .returning();
        cp = newCp;
      }

      if (!cp) {
        throw new Error('Falha ao vincular produto comercial');
      }

      // 8. Log Governance Catalog Request for Admin Review
      await tx.insert(catalogRequest).values({
        userId,
        requestType: 'CREATE',
        proposedData: {
          variationId: newVariation.id,
          name: newVariation.name,
          brandName: resolvedBrandName,
          automakerName: resolvedAutomakerName,
          vehicleModelName: resolvedVehicleModelName,
          releaseYear: newVariation.releaseYear,
          color: newVariation.color,
          photoUrl: newVariation.photoUrl,
          sellerStoreName,
          sellerId,
        },
        reason: `Miniatura cadastrada pelo vendedor homologado "${sellerStoreName}" para lançamento de oferta/pré-venda.`,
        status: 'PENDING',
      });

      return {
        id: newVariation.id,
        name: newVariation.name,
        photoUrl: newVariation.photoUrl,
        releaseYear: newVariation.releaseYear,
        color: newVariation.color,
        brandName: resolvedBrandName || '',
        automakerName: resolvedAutomakerName || '',
        modelName: resolvedVehicleModelName || '',
        commercialProductId: cp.id,
        castingId: foundCasting.id,
      };
    });
  }

}

