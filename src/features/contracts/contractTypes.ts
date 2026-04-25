export interface Contract {
  id: string;
  employeeId: string;
  employeeName: string;
  contractNo: string;
  contractType: string;
  startDate: string;
  endDate?: string;
  status: string;
}

export interface ContractPayload {
  employeeId: string;
  contractNo: string;
  contractType: string;
  startDate: string;
  endDate?: string;
  status: string;
}

