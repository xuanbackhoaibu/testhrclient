export interface WorkflowItem {
  id: string;
  title: string;
  owner: string;
  status: string;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  status: string;
  itemCount: number;
}

export interface OnboardingInstance {
  id: string;
  employeeId: string;
  employeeName: string;
  templateName: string;
  status: string;
  startDate: string;
  items: WorkflowItem[];
}

export interface OnboardingInstancePayload {
  employeeId: string;
  templateName: string;
  startDate: string;
}

