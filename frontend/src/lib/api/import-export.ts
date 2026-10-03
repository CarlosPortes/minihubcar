import { apiClient } from './client';

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

export const importExportApi = {
  importLocationsText: async (csvText: string): Promise<LocationImportResult> => {
    const res = await apiClient<{ data: LocationImportResult }>('/import/locations', {
      method: 'POST',
      body: JSON.stringify({ csvText }),
    });
    return res.data;
  },

  importLocationsFile: async (file: File): Promise<LocationImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient<{ data: LocationImportResult }>('/import/locations/file', {
      method: 'POST',
      body: formData,
    });
    return res.data;
  },

  importCollectionText: async (csvText: string): Promise<CollectionImportResult> => {
    const res = await apiClient<{ data: CollectionImportResult }>('/import/collection', {
      method: 'POST',
      body: JSON.stringify({ csvText }),
    });
    return res.data;
  },

  importCollectionFile: async (file: File): Promise<CollectionImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient<{ data: CollectionImportResult }>('/import/collection/file', {
      method: 'POST',
      body: formData,
    });
    return res.data;
  },
};
