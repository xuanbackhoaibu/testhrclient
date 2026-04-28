import type { Unit, Department, Position } from '../../features/organization/organizationTypes';

export const mockUnits: Unit[] = [
  { id: 'le-01', code: 'LE-01', name: 'HACOM Holdings', shortName: 'HACOM', taxCode: '0101234567', status: 'ACTIVE' },
  { id: 'le-02', code: 'LE-02', name: 'HACOM Retail', shortName: 'HACOM Retail', taxCode: '0101234568', status: 'ACTIVE' },
  { id: 'le-03', code: 'LE-03', name: 'HACOM Services', shortName: 'HACOM Services', taxCode: '0101234569', status: 'INACTIVE' },
];

export const mockDepartments: Department[] = [
  { id: 'ou-hq', code: 'OU-HQ', unitId: 'le-01', name: 'Head Office', type: 'DIVISION', effectiveFrom: '2024-01-01', status: 'ACTIVE' },
  { id: 'ou-hr', code: 'OU-HR', unitId: 'le-01', parentId: 'ou-hq', name: 'Human Resources', type: 'DEPARTMENT', effectiveFrom: '2024-01-01', status: 'ACTIVE' },
  { id: 'ou-sales', code: 'OU-SALES', unitId: 'le-01', parentId: 'ou-hq', name: 'Sales', type: 'DEPARTMENT', effectiveFrom: '2024-01-01', status: 'ACTIVE' },
  { id: 'ou-retail', code: 'OU-RETAIL', unitId: 'le-02', name: 'Retail Operations', type: 'DIVISION', effectiveFrom: '2024-01-01', status: 'ACTIVE' },
  { id: 'ou-it', code: 'OU-IT', unitId: 'le-01', parentId: 'ou-hq', name: 'Technology', type: 'DEPARTMENT', effectiveFrom: '2024-01-01', status: 'ACTIVE' },
  { id: 'ou-legacy', code: 'OU-LEGACY', unitId: 'le-03', name: 'Legacy Support', type: 'TEAM', effectiveFrom: '2023-01-01', effectiveTo: '2025-12-31', status: 'INACTIVE' },
];

export const mockPositions: Position[] = [
  { id: 'pos-hrm', code: 'POS-HRM', name: 'HR Manager', jobFunction: 'HR', grade: 'M2', status: 'ACTIVE' },
  { id: 'pos-hro', code: 'POS-HRO', name: 'HR Officer', jobFunction: 'HR', grade: 'S2', status: 'ACTIVE' },
  { id: 'pos-sls', code: 'POS-SLS', name: 'Sales Manager', jobFunction: 'Sales', grade: 'M2', status: 'ACTIVE' },
  { id: 'pos-dev', code: 'POS-DEV', name: 'Software Engineer', jobFunction: 'Technology', grade: 'S3', status: 'ACTIVE' },
  { id: 'pos-ana', code: 'POS-ANA', name: 'Business Analyst', jobFunction: 'Operations', grade: 'S2', status: 'INACTIVE' },
];

