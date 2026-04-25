export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string;
  actorName: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
  createdAt: string;
}

