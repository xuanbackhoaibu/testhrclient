import { useQuery } from '@tanstack/react-query';

import {
  getEmployee,
  getEmployeeAccount,
  getEmployeeAssignments,
  getEmployeeContracts,
  getEmployeeAuditLogs,
  getEmployeeAttendance,
  getEmployeeLeave,
} from './employeesApi';

export function useEmployeeDetail(
  id?: string,
  options: { includeAccount?: boolean } = {},
) {
  const includeAccount = options.includeAccount ?? false;

  return useQuery({
    queryKey: ['employee-detail', id, { includeAccount }],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) {
        throw new Error('Missing employee id');
      }

      const [employee, account, assignments, contracts, leaveRequests, attendanceRecords, auditLogs] = await Promise.all([
        getEmployee(id),
        includeAccount ? getEmployeeAccount(id) : Promise.resolve(null),
        getEmployeeAssignments(id),
        getEmployeeContracts(id),
        getEmployeeLeave(id),
        getEmployeeAttendance(id),
        getEmployeeAuditLogs(id),
      ]);

      return { employee, account, assignments, contracts, leaveRequests, attendanceRecords, auditLogs };
    },
  });
}
