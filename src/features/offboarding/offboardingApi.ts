import { api } from '../../shared/api/httpClient';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockOffboardingInstances, mockOffboardingTemplates } from '../../shared/mocks/mockWorkflows';
import type { ListQueryParams } from '../../shared/types/api';
import type { OffboardingInstance, OffboardingInstancePayload, OffboardingTemplate } from './offboardingTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export async function listOffboardingTemplates(params: ListQueryParams = {}): Promise<OffboardingTemplate[]> {
  void params;
  if (isMockMode) {
    await mockDelay();
    return mockOffboardingTemplates;
  }

  return api.get<OffboardingTemplate[]>('/offboarding/templates');
}

export async function listOffboardingInstances(params: ListQueryParams = {}): Promise<OffboardingInstance[]> {
  void params;
  if (isMockMode) {
    await mockDelay();
    return mockOffboardingInstances;
  }

  return api.get<OffboardingInstance[]>('/offboarding/instances');
}

export async function createOffboardingInstance(payload: OffboardingInstancePayload): Promise<OffboardingInstance> {
  if (isMockMode) {
    await mockDelay();
    const employee = mockEmployees.find((item) => item.id === payload.employeeId);
    const instance: OffboardingInstance = {
      id: generateId('ofi'),
      employeeId: payload.employeeId,
      employeeName: employee?.fullName ?? payload.employeeId,
      templateName: payload.templateName,
      status: 'IN_PROGRESS',
      startDate: payload.startDate,
      items: [
        { id: generateId('ofit'), title: 'Exit interview', owner: 'HR', status: 'DRAFT' },
        { id: generateId('ofit'), title: 'Asset return', owner: 'IT', status: 'DRAFT' },
      ],
    };
    mockOffboardingInstances.unshift(instance);
    appendAuditLog({ entityType: 'OFFBOARDING', entityId: instance.id, action: 'CREATE', afterJson: instance as unknown as Record<string, unknown> });
    return instance;
  }

  return api.post<OffboardingInstance>('/offboarding/instances', payload);
}

export async function updateOffboardingItem(id: string, payload: { status: string }): Promise<OffboardingInstance> {
  if (isMockMode) {
    await mockDelay();
    const instance = mockOffboardingInstances.find((item) => item.items.some((workflowItem) => workflowItem.id === id));
    if (!instance) {
      throw new Error('Offboarding item not found');
    }
    instance.items = instance.items.map((workflowItem) =>
      workflowItem.id === id ? { ...workflowItem, status: payload.status } : workflowItem,
    );
    appendAuditLog({ entityType: 'OFFBOARDING', entityId: instance.id, action: 'UPDATE_ITEM', afterJson: { itemId: id, status: payload.status } });
    return instance;
  }

  return api.patch<OffboardingInstance>(`/offboarding/items/${id}`, payload);
}

export async function completeOffboardingInstance(id: string): Promise<OffboardingInstance> {
  if (isMockMode) {
    await mockDelay();
    const instance = mockOffboardingInstances.find((item) => item.id === id);
    if (!instance) {
      throw new Error('Offboarding instance not found');
    }
    instance.status = 'COMPLETED';
    appendAuditLog({ entityType: 'OFFBOARDING', entityId: id, action: 'COMPLETE', afterJson: { status: 'COMPLETED' } });
    return instance;
  }

  return api.post<OffboardingInstance>(`/offboarding/instances/${id}/complete`);
}
