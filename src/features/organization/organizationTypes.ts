export interface Unit {
  id: string;
  code: string;
  name: string;
  shortName: string;
  taxCode: string;
  status: string;
}

export interface UnitSelectOption {
  id: string;
  code: string;
  name: string;
  shortName?: string | null;
}

export interface Department {
  id: string;
  code: string;
  unitId: string;
  name: string;
  type: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: string;
}

export interface DepartmentSelectOption {
  id: string;
  code: string;
  unitId: string;
  name: string;
}

export interface Position {
  id: string;
  code: string;
  name: string;
  jobFunction: string;
  grade: string;
  status: string;
}

export interface PositionSelectOption {
  id: string;
  code: string;
  name: string;
  jobFunction?: string | null;
  grade?: string | null;
}
