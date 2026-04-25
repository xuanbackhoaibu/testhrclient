export interface Movement {
  id: string;
  employeeId: string;
  employeeName: string;
  movementType: string;
  effectiveDate: string;
  reason: string;
  afterJson: Record<string, unknown>;
  status: string;
}

export interface MovementPayload {
  employeeId: string;
  movementType: string;
  effectiveDate: string;
  reason: string;
  afterJson: string;
}

