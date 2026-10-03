import { CollectionRepository } from './collection.repository';
import { AddExemplarInput, CollectionFilterQuery, MoveExemplarInput, UpdateExemplarInput, ImportCollectionInput } from './collection.schemas';
import { LocationsRepository } from '../locations/locations.repository';
import { CatalogRepository } from '../catalog/catalog.repository';
import { UsersRepository } from '../users/users.repository';
import { BadRequestError, NotFoundError, ConflictError } from '../../shared/errors/api-error';

export class CollectionService {
  constructor(
    private readonly collectionRepository = new CollectionRepository(),
    private readonly locationsRepository = new LocationsRepository(),
    private readonly catalogRepository = new CatalogRepository(),
    private readonly usersRepository = new UsersRepository()
  ) {}

  async listCollection(userId: string, filter: CollectionFilterQuery) {
    return this.collectionRepository.listByUser(userId, filter);
  }

  async getExemplarDetail(id: string, userId: string) {
    const exemplar = await this.collectionRepository.findByIdAndUser(id, userId);
    if (!exemplar) {
      throw new NotFoundError('Exemplar não encontrado na sua coleção');
    }
    return exemplar;
  }

  async addExemplar(userId: string, input: AddExemplarInput) {
    // Validate variation exists
    const variation = await this.catalogRepository.getVariationById(input.variationId);
    if (!variation) {
      throw new NotFoundError('Variação não encontrada no catálogo oficial');
    }

    // Resolve condition
    const condition = await this.collectionRepository.getConditionTypeByCode(input.conditionCode);
    if (!condition) {
      throw new BadRequestError(`Condição '${input.conditionCode}' inválida`);
    }

    // Validate location if passed
    if (input.locationId) {
      const loc = await this.locationsRepository.findByIdAndUser(input.locationId, userId);
      if (!loc) {
        throw new NotFoundError('Localização informada não encontrada');
      }

      if (loc.hasGrid) {
        if (input.gridRow && (input.gridRow < 1 || input.gridRow > (loc.gridRows || 0))) {
          throw new BadRequestError(`Linha inválida para este expositor (deve ser entre 1 e ${loc.gridRows})`);
        }
        if (input.gridColumn && (input.gridColumn < 1 || input.gridColumn > (loc.gridColumns || 0))) {
          throw new BadRequestError(`Coluna inválida para este expositor (deve ser entre 1 e ${loc.gridColumns})`);
        }

        if (input.gridRow && input.gridColumn) {
          const isOccupied = await this.locationsRepository.isSlotOccupied(loc.id, input.gridRow, input.gridColumn);
          if (isOccupied) {
            throw new ConflictError(`O nicho na Linha ${input.gridRow}, Coluna ${input.gridColumn} já está ocupado por outra miniatura`);
          }
        }
      } else {
        input.gridRow = null;
        input.gridColumn = null;
      }
    }

    return this.collectionRepository.createExemplar(userId, input, condition.id);
  }

  async moveExemplar(id: string, userId: string, input: MoveExemplarInput) {
    // Validate exemplar exists and belongs to user
    const exemplar = await this.collectionRepository.findByIdAndUser(id, userId);
    if (!exemplar) {
      throw new NotFoundError('Exemplar não encontrado');
    }

    if (exemplar.status === 'SOLD') {
      throw new BadRequestError('Não é possível movimentar um exemplar que já foi vendido');
    }

    // Validate target location
    const targetLocation = await this.locationsRepository.findByIdAndUser(input.toLocationId, userId);
    if (!targetLocation) {
      throw new NotFoundError('Localização de destino não encontrada');
    }

    let toGridRow = input.toGridRow || null;
    let toGridColumn = input.toGridColumn || null;

    if (targetLocation.hasGrid) {
      if (toGridRow && (toGridRow < 1 || toGridRow > (targetLocation.gridRows || 0))) {
        throw new BadRequestError(`Linha inválida para este expositor (deve ser entre 1 e ${targetLocation.gridRows})`);
      }
      if (toGridColumn && (toGridColumn < 1 || toGridColumn > (targetLocation.gridColumns || 0))) {
        throw new BadRequestError(`Coluna inválida para este expositor (deve ser entre 1 e ${targetLocation.gridColumns})`);
      }

      if (toGridRow && toGridColumn) {
        const isOccupied = await this.locationsRepository.isSlotOccupied(
          targetLocation.id,
          toGridRow,
          toGridColumn,
          id
        );
        if (isOccupied) {
          throw new ConflictError(`O nicho na Linha ${toGridRow}, Coluna ${toGridColumn} já está ocupado por outra miniatura`);
        }
      }
    } else {
      toGridRow = null;
      toGridColumn = null;
    }

    return this.collectionRepository.moveExemplar(
      userId,
      id,
      input.toLocationId,
      toGridRow,
      toGridColumn,
      input.notes
    );
  }

  async updateExemplar(id: string, userId: string, input: UpdateExemplarInput) {
    const exemplar = await this.collectionRepository.findByIdAndUser(id, userId);
    if (!exemplar) {
      throw new NotFoundError('Exemplar não encontrado');
    }

    let conditionTypeId: string | undefined;
    if (input.conditionCode) {
      const condition = await this.collectionRepository.getConditionTypeByCode(input.conditionCode);
      if (!condition) {
        throw new BadRequestError(`Condição '${input.conditionCode}' inválida`);
      }
      conditionTypeId = condition.id;
    }

    return this.collectionRepository.updateExemplar(id, userId, input, conditionTypeId);
  }

  async deleteExemplar(id: string, userId: string) {
    const exemplar = await this.collectionRepository.findByIdAndUser(id, userId);
    if (!exemplar) {
      throw new NotFoundError('Exemplar não encontrado na sua coleção');
    }

    return this.collectionRepository.deleteExemplar(id, userId);
  }

  async importCollection(userId: string, input: ImportCollectionInput) {
    return this.collectionRepository.importExemplars(userId, input.items);
  }

  async getPublicCollection(targetUserId: string, requestingUserId?: string, filter?: CollectionFilterQuery) {
    const user = await this.usersRepository.findById(targetUserId);
    if (!user) {
      throw new NotFoundError('Colecionador não encontrado');
    }

    const isOwner = requestingUserId && requestingUserId === targetUserId;
    if (!user.isCollectionPublic && !isOwner) {
      return {
        isPrivate: true,
        collector: {
          id: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
        message: 'Este colecionador optou por manter sua coleção privada.',
        items: [],
        total: 0,
        page: 1,
        pageSize: filter?.pageSize || 24,
        totalPages: 0,
      };
    }

    const defaultFilter: CollectionFilterQuery = { status: 'ACTIVE', page: 1, pageSize: 24 };
    const result = await this.collectionRepository.listByUser(targetUserId, filter || defaultFilter);
    return {
      isPrivate: false,
      collector: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        city: user.city,
        state: user.state,
      },
      ...result,
    };
  }
}
