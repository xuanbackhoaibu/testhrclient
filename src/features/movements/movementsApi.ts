import { httpClient } from '../../shared/api/httpClient';
import { normalizePaginatedResponse, unwrapApiResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockMovements } from '../../shared/mocks/mockWorkflows';
import type { ListQueryParams, PaginatedResponse } from '../../shared/types/api';
import type { Movement, MovementPayload } from './movementTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

function findMovement(id: string) {
  const movement = mockMovements.find((item) => item.id === id);
  if (!movement) {
    throw new Error('Movement not found');
  }
  return movement;
}

export async function listMovements(params: ListQueryParams = {}): Promise<PaginatedResponse<Movement>> {
  if (isMockMode) {
    await mockDelay();
    const filtered = mockMovements
      .filter((item) => (params.employeeId ? item.employeeId === params.employeeId : true))
      .filter((item) => (params.movementType ? item.movementType === params.movementType : true))
      .filter((item) => (params.status ? item.status === params.status : true))
      .filter(
        (item) =>
          includesIgnoreCase(item.employeeName, params.search) ||
          includesIgnoreCase(item.reason, params.search) ||
          (!params.search && true),
      );

    return paginate(filtered, params);
  }

  const response = await httpClient.get('/movements', { params });
  return normalizePaginatedResponse<Movement>(response.data, params);
}

export async function createMovement(payload: MovementPayload): Promise<Movement> {
  if (isMockMode) {
    await mockDelay();
    const employee = mockEmployees.find((item) => item.id === payload.employeeId);
    const movement: Movement = {
      id: generateId('mov'),
      employeeId: payload.employeeId,
      employeeName: employee?.fullName ?? payload.employeeId,
      movementType: payload.movementType,
      effectiveDate: payload.effectiveDate,
      reason: payload.reason,
      afterJson: JSON.parse(payload.afterJson),
      status: 'DRAFT',
    };

    mockMovements.unshift(movement);
    appendAuditLog({ entityType: 'MOVEMENT', entityId: movement.id, action: 'CREATE', afterJson: movement.afterJson });
    return movement;
  }

  const response = await httpClient.post('/movements', payload);
  return unwrapApiResponse<Movement>(response.data);
}

async function updateMovementStatus(id: string, status: string, action: string): Promise<Movement> {
  if (isMockMode) {
    await mockDelay();
    const movement = findMovement(id);
    const before = { ...movement };
    movement.status = status;
    appendAuditLog({
      entityType: 'MOVEMENT',
      entityId: id,
      action,
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: movement as unknown as Record<string, unknown>,
    });
    return movement;
  }

  const response = await httpClient.post(`/movements/${id}/${action.toLowerCase()}`);
  return unwrapApiResponse<Movement>(response.data);
}

export function submitMovement(id: string) {
  return updateMovementStatus(id, 'SUBMITTED', 'SUBMIT');
}

export function approveMovement(id: string) {
  return updateMovementStatus(id, 'APPROVED', 'APPROVE');
}

export function rejectMovement(id: string) {
  return updateMovementStatus(id, 'REJECTED', 'REJECT');
}

export function cancelMovement(id: string) {
  return updateMovementStatus(id, 'CANCELLED', 'CANCEL');
}
