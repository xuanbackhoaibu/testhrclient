export interface LegalEntity {
  id: string;
  code: string;
  name: string;
  shortName: string;
  taxCode: string;
  status: string;
}

export interface OrgUnit {
  id: string;
  code: string;
  legalEntityId: string;
  parentId?: string;
  name: string;
  type: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: string;
}

export interface Position {
  id: string;
  code: string;
  name: string;
  jobFunction: string;
  grade: string;
  status: string;
}

