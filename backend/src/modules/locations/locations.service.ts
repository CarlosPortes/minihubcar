import { LocationsRepository, LocationNode } from './locations.repository';
import { CreateLocationInput, UpdateLocationInput } from './locations.schemas';
import { BadRequestError, NotFoundError } from '../../shared/errors/api-error';

export class LocationsService {
  constructor(private readonly locationsRepository = new LocationsRepository()) {}

  async getUserLocations(userId: string) {
    const rawLocations = await this.locationsRepository.listByUserWithCounts(userId);

    // Build hierarchy tree
    const map = new Map<string, LocationNode>();
    const tree: LocationNode[] = [];

    for (const loc of rawLocations) {
      map.set(loc.id, {
        id: loc.id,
        name: loc.name,
        locationType: loc.locationType,
        parentLocationId: loc.parentLocationId,
        hasGrid: loc.hasGrid,
        gridRows: loc.gridRows,
        gridColumns: loc.gridColumns,
        status: loc.status,
        occupiedCount: loc.occupiedCount,
        totalCapacity: loc.totalCapacity,
        availableCount: loc.availableCount,
        occupancyPercent: loc.occupancyPercent,
        availabilityPercent: loc.availabilityPercent,
        children: [],
      });
    }

    for (const loc of rawLocations) {
      const node = map.get(loc.id)!;
      if (loc.parentLocationId && map.has(loc.parentLocationId)) {
        map.get(loc.parentLocationId)!.children.push(node);
      } else {
        tree.push(node);
      }
    }

    // Global summary across all locations with grid
    let globalCapacity = 0;
    let globalOccupied = 0;
    let gridLocationsCount = 0;

    for (const loc of rawLocations) {
      if (loc.totalCapacity && loc.totalCapacity > 0) {
        globalCapacity += loc.totalCapacity;
        gridLocationsCount++;
      }
      globalOccupied += loc.occupiedCount;
    }

    const globalAvailable = Math.max(0, globalCapacity - globalOccupied);
    const globalOccupancyPercent = globalCapacity > 0 ? Math.round((globalOccupied / globalCapacity) * 100) : 0;
    const globalAvailabilityPercent = Math.max(0, 100 - globalOccupancyPercent);

    return {
      list: rawLocations,
      tree,
      summary: {
        totalLocations: rawLocations.length,
        gridLocationsCount,
        globalCapacity,
        globalOccupied,
        globalAvailable,
        globalOccupancyPercent,
        globalAvailabilityPercent,
      },
    };
  }

  async createLocation(userId: string, input: CreateLocationInput) {
    if (input.parentLocationId) {
      const parent = await this.locationsRepository.findByIdAndUser(input.parentLocationId, userId);
      if (!parent) {
        throw new NotFoundError('Localização pai não encontrada ou não pertence ao usuário');
      }
    }

    if (input.hasGrid) {
      if (!input.gridRows || input.gridRows < 1) {
        throw new BadRequestError('Informe a quantidade de linhas para a grade do expositor (mínimo 1)');
      }
      if (!input.gridColumns || input.gridColumns < 1) {
        throw new BadRequestError('Informe a quantidade de colunas para a grade do expositor (mínimo 1)');
      }
    }

    const normalizedName = input.name.trim().toLowerCase();
    return this.locationsRepository.create(userId, input, normalizedName);
  }

  async updateLocation(id: string, userId: string, input: UpdateLocationInput) {
    const existing = await this.locationsRepository.findByIdAndUser(id, userId);
    if (!existing) {
      throw new NotFoundError('Localização não encontrada');
    }

    if (input.parentLocationId) {
      if (input.parentLocationId === id) {
        throw new BadRequestError('Uma localização não pode ser pai de si mesma');
      }
      const parent = await this.locationsRepository.findByIdAndUser(input.parentLocationId, userId);
      if (!parent) {
        throw new NotFoundError('Localização pai não encontrada');
      }
    }

    const willHaveGrid = input.hasGrid !== undefined ? input.hasGrid : existing.hasGrid;
    if (willHaveGrid) {
      const rows = input.gridRows !== undefined ? input.gridRows : existing.gridRows;
      const cols = input.gridColumns !== undefined ? input.gridColumns : existing.gridColumns;
      if (!rows || rows < 1) {
        throw new BadRequestError('Informe a quantidade de linhas para a grade do expositor (mínimo 1)');
      }
      if (!cols || cols < 1) {
        throw new BadRequestError('Informe a quantidade de colunas para a grade do expositor (mínimo 1)');
      }
    }

    const normalizedName = input.name ? input.name.trim().toLowerCase() : undefined;
    return this.locationsRepository.update(id, userId, input, normalizedName);
  }

  async getLocationGrid(id: string, userId: string) {
    const gridData = await this.locationsRepository.getLocationGrid(id, userId);
    if (!gridData) {
      throw new NotFoundError('Localização não encontrada');
    }
    return gridData;
  }

  async archiveLocation(id: string, userId: string) {
    const existing = await this.locationsRepository.findByIdAndUser(id, userId);
    if (!existing) {
      throw new NotFoundError('Localização não encontrada');
    }

    return this.locationsRepository.archive(id, userId);
  }
}
