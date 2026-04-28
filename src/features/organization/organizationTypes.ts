export interface Unit {
  id: string;
  code: string;
  name: string;
  shortName: string;
  taxCode: string;
  status: string;
}

export interface Department {
  id: string;
  code: string;
  unitId: string;
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

