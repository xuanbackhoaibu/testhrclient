import { httpClient } from '../../shared/api/httpClient';
import { unwrapApiResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockOnboardingInstances, mockOnboardingTemplates } from '../../shared/mocks/mockWorkflows';
import type { ListQueryParams } from '../../shared/types/api';
import type { OnboardingInstance, OnboardingInstancePayload, OnboardingTemplate } from './onboardingTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export async function listOnboardingTemplates(params: ListQueryParams = {}): Promise<OnboardingTemplate[]> {
  void params;
  if (isMockMode) {
    await mockDelay();
    return mockOnboardingTemplates;
  }

  const response = await httpClient.get('/onboarding/templates');
  return unwrapApiResponse<OnboardingTemplate[]>(response.data);
}

export async function listOnboardingInstances(params: ListQueryParams = {}): Promise<OnboardingInstance[]> {
  void params;
  if (isMockMode) {
    await mockDelay();
    return mockOnboardingInstances;
  }

  const response = await httpClient.get('/onboarding/instances');
  return unwrapApiResponse<OnboardingInstance[]>(response.data);
}

export async function createOnboardingInstance(payload: OnboardingInstancePayload): Promise<OnboardingInstance> {
  if (isMockMode) {
    await mockDelay();
    const employee = mockEmployees.find((item) => item.id === payload.employeeId);
    const instance: OnboardingInstance = {
      id: generateId('obi'),
      employeeId: payload.employeeId,
      employeeName: employee?.fullName ?? payload.employeeId,
      templateName: payload.templateName,
      status: 'IN_PROGRESS',
      startDate: payload.startDate,
      items: [
        { id: generateId('obit'), title: 'Account provisioning', owner: 'IT', status: 'DRAFT' },
        { id: generateId('obit'), title: 'Policy orientation', owner: 'HR', status: 'DRAFT' },
      ],
    };
    mockOnboardingInstances.unshift(instance);
    appendAuditLog({ entityType: 'ONBOARDING', entityId: instance.id, action: 'CREATE', afterJson: instance as unknown as Record<string, unknown> });
    return instance;
  }

  const response = await httpClient.post('/onboarding/instances', payload);
  return unwrapApiResponse<OnboardingInstance>(response.data);
}

export async function updateOnboardingItem(id: string, payload: { status: string }): Promise<OnboardingInstance> {
  if (isMockMode) {
    await mockDelay();
    const instance = mockOnboardingInstances.find((item) => item.items.some((workflowItem) => workflowItem.id === id));
    if (!instance) {
      throw new Error('Onboarding item not found');
    }
    instance.items = instance.items.map((workflowItem) =>
      workflowItem.id === id ? { ...workflowItem, status: payload.status } : workflowItem,
    );
    appendAuditLog({ entityType: 'ONBOARDING', entityId: instance.id, action: 'UPDATE_ITEM', afterJson: { itemId: id, status: payload.status } });
    return instance;
  }

  const response = await httpClient.patch(`/onboarding/items/${id}`, payload);
  return unwrapApiResponse<OnboardingInstance>(response.data);
}

export async function completeOnboardingInstance(id: string): Promise<OnboardingInstance> {
  if (isMockMode) {
    await mockDelay();
    const instance = mockOnboardingInstances.find((item) => item.id === id);
    if (!instance) {
      throw new Error('Onboarding instance not found');
    }
    instance.status = 'COMPLETED';
    appendAuditLog({ entityType: 'ONBOARDING', entityId: id, action: 'COMPLETE', afterJson: { status: 'COMPLETED' } });
    return instance;
  }

  const response = await httpClient.post(`/onboarding/instances/${id}/complete`);
  return unwrapApiResponse<OnboardingInstance>(response.data);
}
