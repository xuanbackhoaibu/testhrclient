export interface OffboardingTemplate {
  id: string;
  name: string;
  status: string;
  itemCount: number;
}

export interface OffboardingInstance {
  id: string;
  employeeId: string;
  employeeName: string;
  templateName: string;
  status: string;
  startDate: string;
  items: import('../onboarding/onboardingTypes').WorkflowItem[];
}

export interface OffboardingInstancePayload {
  employeeId: string;
  templateName: string;
  startDate: string;
}

