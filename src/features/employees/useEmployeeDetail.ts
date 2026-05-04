import { useQuery } from '@tanstack/react-query';

import {
  getEmployeeById,
  getEmployeeAccount,
  getEmployeeAssignments,
  getEmployeeContracts,
  getEmployeeAuditLogs,
  getEmployeeAttendance,
  getEmployeeLeave,
} from './employeesApi';

export function useEmployeeDetail(
  employeeId?: string,
  options: { includeAccount?: boolean } = {},
) {
  const includeAccount = options.includeAccount ?? false;

  return useQuery({
    queryKey: ['employee-detail', employeeId, includeAccount],
    enabled: Boolean(employeeId),
    queryFn: async () => {
      if (!employeeId) {
        throw new Error('Missing employee id');
      }

      const [employee, account, assignments, contracts, leaveRequests, attendanceRecords, auditLogs] = await Promise.all([
        getEmployeeById(employeeId, { source: 'useEmployeeDetail' }),
        includeAccount ? getEmployeeAccount(employeeId) : Promise.resolve(null),
        getEmployeeAssignments(employeeId),
        getEmployeeContracts(employeeId),
        getEmployeeLeave(employeeId),
        getEmployeeAttendance(employeeId),
        getEmployeeAuditLogs(employeeId),
      ]);

      return { employee, account, assignments, contracts, leaveRequests, attendanceRecords, auditLogs };
    },
  });
}
