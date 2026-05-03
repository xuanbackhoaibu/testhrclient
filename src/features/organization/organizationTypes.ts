export interface BusinessSectorSummary {
  id: string;
  code: string;
  name: string;
}

export interface BusinessSectorOption extends BusinessSectorSummary {}

export interface Unit {
  id: string;
  code: string;
  name: string;
  shortName: string;
  abbreviation?: string | null;
  taxCode: string;
  address?: string | null;
  note?: string | null;
  status: string;
  sectorId?: string | null;
  businessSectorId?: string | null;
  sector?: BusinessSectorSummary | null;
  businessSector?: BusinessSectorSummary | null;
}

export interface UnitSelectOption {
  id: string;
  code: string;
  name: string;
  shortName?: string | null;
  sectorId?: string | null;
}

export interface Department {
  id: string;
  code: string;
  unitId: string;
  name: string;
  status: string;
  note?: string | null;
  unit?: {
    id: string;
    code: string;
    name: string;
  } | null;
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
  note?: string | null;
  status: string;
}

export interface PositionSelectOption {
  id: string;
  code: string;
  name: string;
  jobFunction?: string | null;
  grade?: string | null;
  note?: string | null;
}
