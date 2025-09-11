export interface ApplicationDto {
  id: string;
  applicantId: string;
  applicantEmail: string;
  processId: string;
  processName: string;
  groupName: string;
  status: string;
  createdAt: Date;
  completedFormsCount?: number;
  totalFormsCount?: number;
}
