import { useQuery } from '@tanstack/react-query';

import {
  getEmployee,
  getEmployeeAssignments,
  getEmployeeContracts,
  getEmployeeAuditLogs,
  getEmployeeAttendance,
  getEmployeeLeave,
} from './employeesApi';

export function useEmployeeDetail(id?: string) {
  return useQuery({
    queryKey: ['employee-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) {
        throw new Error('Missing employee id');
      }

      const [employee, assignments, contracts, leaveRequests, attendanceRecords, auditLogs] = await Promise.all([
        getEmployee(id),
        getEmployeeAssignments(id),
        getEmployeeContracts(id),
        getEmployeeLeave(id),
        getEmployeeAttendance(id),
        getEmployeeAuditLogs(id),
      ]);

      return { employee, assignments, contracts, leaveRequests, attendanceRecords, auditLogs };
    },
  });
}

