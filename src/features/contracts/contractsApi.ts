import { httpClient } from '../../shared/api/httpClient';
import { normalizePaginatedResponse, unwrapApiResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockContracts } from '../../shared/mocks/mockWorkflows';
import type { ListQueryParams, PaginatedResponse } from '../../shared/types/api';
import type { Contract, ContractPayload } from './contractTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export async function listContracts(params: ListQueryParams = {}): Promise<PaginatedResponse<Contract>> {
  if (isMockMode) {
    await mockDelay();
    const filtered = mockContracts
      .filter((item) => (params.employeeId ? item.employeeId === params.employeeId : true))
      .filter((item) => (params.status ? item.status === params.status : true))
      .filter(
        (item) =>
          includesIgnoreCase(item.employeeName, params.search) ||
          includesIgnoreCase(item.contractNo, params.search) ||
          (!params.search && true),
      );

    return paginate(filtered, params);
  }

  const response = await httpClient.get('/contracts', { params });
  return normalizePaginatedResponse<Contract>(response.data, params);
}

export async function createContract(payload: ContractPayload): Promise<Contract> {
  if (isMockMode) {
    await mockDelay();
    const employee = mockEmployees.find((item) => item.id === payload.employeeId);
    const contract: Contract = {
      id: generateId('ctr'),
      employeeName: employee?.fullName ?? payload.employeeId,
      ...payload,
    };
    mockContracts.unshift(contract);
    appendAuditLog({ entityType: 'CONTRACT', entityId: contract.id, action: 'CREATE', afterJson: contract as unknown as Record<string, unknown> });
    return contract;
  }

  const response = await httpClient.post('/contracts', payload);
  return unwrapApiResponse<Contract>(response.data);
}

export async function updateContract(id: string, payload: Partial<ContractPayload>): Promise<Contract> {
  if (isMockMode) {
    await mockDelay();
    const contract = mockContracts.find((item) => item.id === id);
    if (!contract) {
      throw new Error('Contract not found');
    }
    const before = { ...contract };
    Object.assign(contract, payload);
    appendAuditLog({
      entityType: 'CONTRACT',
      entityId: id,
      action: 'UPDATE',
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: contract as unknown as Record<string, unknown>,
    });
    return contract;
  }

  const response = await httpClient.patch(`/contracts/${id}`, payload);
  return unwrapApiResponse<Contract>(response.data);
}

export async function terminateContract(id: string, payload: { endDate: string }): Promise<Contract> {
  if (isMockMode) {
    await mockDelay();
    const contract = mockContracts.find((item) => item.id === id);
    if (!contract) {
      throw new Error('Contract not found');
    }
    const before = { ...contract };
    contract.endDate = payload.endDate;
    contract.status = 'TERMINATED';
    appendAuditLog({
      entityType: 'CONTRACT',
      entityId: id,
      action: 'TERMINATE',
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: contract as unknown as Record<string, unknown>,
    });
    return contract;
  }

  const response = await httpClient.post(`/contracts/${id}/terminate`, payload);
  return unwrapApiResponse<Contract>(response.data);
}
