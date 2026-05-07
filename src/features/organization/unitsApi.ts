import { api, httpClient, unwrapApiEnvelope } from '../../shared/api/httpClient';
import { ApiError } from '../../shared/api/api.types';
import { normalizePaginatedResponse } from '../../shared/api/response';
import {
  debugApiError,
  debugApiRequest,
  debugApiResponse,
} from '../../shared/debug/hrmDebug';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockUnits } from '../../shared/mocks/mockOrganization';
import type { ListQueryParams, PaginatedData, PaginatedResponse } from '../../shared/types/api';
import type { Unit, UnitSelectOption } from './organizationTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';
const unitCodePattern = /^[A-Z0-9_-]+$/;
const unitCodeStopWords = new Set(['CONG', 'TY', 'CO', 'PHAN', 'TNHH', 'MTV', 'PHONG', 'BAN', 'TRUNG', 'TAM']);

export function normalizeVietnameseText(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase();
}

export function normalizeUnitCodeInput(value: string): string {
  return normalizeVietnameseText(value)
    .replace(/[^A-Z0-9_-]+/g, '')
    .replace(/_+/g, '_')
    .replace(/-+/g, '-');
}

export function isValidUnitCode(value: string): boolean {
  return unitCodePattern.test(value);
}

export function generateUnitShortCode(name: string): string {
  const normalized = normalizeVietnameseText(name);
  const words = normalized.replace(/[^A-Z0-9]+/g, ' ').split(/\s+/).filter(Boolean);
  const significantWords = words.filter((word) => !unitCodeStopWords.has(word));
  const sourceWords = significantWords.length ? significantWords : words;
  const acronym = sourceWords.map((word) => word[0]).join('');
  if (acronym.length >= 2) {
    return acronym;
  }
  const fallbackSource = sourceWords.join('') || normalized;
  return fallbackSource.replace(/[^A-Z0-9]+/g, '').slice(0, 8) || 'DV';
}

function ensureUniqueMockUnitCode(baseCode: string, currentId?: string) {
  for (let suffix = 0; suffix <= 9999; suffix += 1) {
    const code = suffix === 0 ? baseCode : `${baseCode}${suffix + 1}`;
    const duplicate = mockUnits.find((item) => item.code === code && item.id !== currentId);
    if (!duplicate) {
      return code;
    }
  }
  throw new Error('Không thể sinh mã viết tắt không trùng.');
}

export async function listUnits(params: ListQueryParams = {}): Promise<PaginatedResponse<Unit>> {
  if (isMockMode) {
    await mockDelay();
    const filtered = mockUnits.filter(
      (item) =>
        includesIgnoreCase(item.code, params.search) ||
        includesIgnoreCase(item.name, params.search) ||
        (!params.search && true),
    ).filter((item) => (params.status ? item.status === params.status : true));

    return paginate(filtered, params);
  }

  const response = await api.get<PaginatedData<Unit>>('/units', { params });
  return normalizePaginatedResponse<Unit>(response, params);
}

export async function listUnitsSelect(): Promise<UnitSelectOption[]> {
  if (isMockMode) {
    await mockDelay();
    return mockUnits
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        shortName: item.shortName,
      }));
  }

  return api.get<UnitSelectOption[]>('/units/select');
}

export async function generateUnitCode(name: string, currentId?: string): Promise<{ code: string }> {
  if (isMockMode) {
    await mockDelay();
    return { code: ensureUniqueMockUnitCode(generateUnitShortCode(name), currentId) };
  }

  return api.get<{ code: string }>('/units/generate-code', {
    params: { name, currentId },
  });
}

export async function createUnit(payload: Partial<Omit<Unit, 'id'>> & { name: string }): Promise<Unit> {
  if (isMockMode) {
    await mockDelay();
    const code = payload.code ? normalizeUnitCodeInput(payload.code) : ensureUniqueMockUnitCode(generateUnitShortCode(payload.name));
    const entity = {
      id: generateId('le'),
      shortName: '',
      taxCode: '',
      status: 'ACTIVE',
      ...payload,
      code,
    } as Unit;
    mockUnits.unshift(entity);
    appendAuditLog({ entityType: 'UNIT', entityId: entity.id, action: 'CREATE', afterJson: entity as unknown as Record<string, unknown> });
    return entity;
  }

  return api.post<Unit>('/units', payload);
}

export async function updateUnit(id: string, payload: Partial<Omit<Unit, 'id'>>): Promise<Unit> {
  if (isMockMode) {
    await mockDelay();
    const entity = mockUnits.find((item) => item.id === id);
    if (!entity) {
      throw new Error('Legal entity not found');
    }

    const before = { ...entity };
    Object.assign(entity, payload);
    appendAuditLog({
      entityType: 'UNIT',
      entityId: id,
      action: 'UPDATE',
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: entity as unknown as Record<string, unknown>,
    });
    return entity;
  }

  const url = `/units/${id}`;
  debugApiRequest({
    action: 'unit.update',
    method: 'PATCH',
    url: `${httpClient.defaults.baseURL ?? ''}${url}`,
    payload,
  });

  try {
    const response = await httpClient.patch(url, payload);
    const data = unwrapApiEnvelope<Unit>(response.data);
    debugApiResponse({
      action: 'unit.update',
      method: 'PATCH',
      url: `${httpClient.defaults.baseURL ?? ''}${url}`,
      payload,
      status: response.status,
      requestId: response.headers['x-request-id'] as string | undefined,
    });
    return data;
  } catch (error) {
    const apiError = error instanceof ApiError ? error : undefined;
    debugApiError({
      action: 'unit.update',
      method: 'PATCH',
      url: `${httpClient.defaults.baseURL ?? ''}${url}`,
      payload,
      status: apiError?.statusCode,
      requestId: apiError?.requestId,
      responseBody: apiError,
    });
    throw error;
  }
}
