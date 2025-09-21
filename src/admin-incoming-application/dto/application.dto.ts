import { ApiProperty } from '@nestjs/swagger';

export class ReviewerDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;
}

export class FormHistoryDto {
  @ApiProperty()
  formId: string;

  @ApiProperty()
  formName: string;

  @ApiProperty()
  completedAt: Date;

  @ApiProperty({ type: ReviewerDto, nullable: true })
  reviewer: ReviewerDto | null;

  @ApiProperty()
  nextStepType: string;

  @ApiProperty({ type: [String] })
  nextStepRoles: string[];
}

export class ApplicantDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;
}

export class NextFormDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  formName: string;

  @ApiProperty({ nullable: true })
  config?: any;
}

export class ApplicationDto {
  @ApiProperty()
  _id: string;

  @ApiProperty({ type: ApplicantDto })
  applicant: ApplicantDto;

  @ApiProperty()
  currentLevel: number;

  @ApiProperty()
  totalForms: number;

  @ApiProperty({ type: NextFormDto, nullable: true })
  nextForm: NextFormDto | null;

  @ApiProperty({ type: ReviewerDto, nullable: true })
  currentReviewer: ReviewerDto | null;

  @ApiProperty({ type: [FormHistoryDto] })
  formHistory: FormHistoryDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  status: string;
}

export class ProcessGroupDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  group: string;
}

export class GroupedApplicationsDto {
  @ApiProperty({ type: ProcessGroupDto })
  process: ProcessGroupDto;

  @ApiProperty({ type: [ApplicationDto] })
  applications: ApplicationDto[];
}

export class DetailedFormHistoryDto {
  @ApiProperty()
  formId: string;

  @ApiProperty()
  formName: string;

  @ApiProperty()
  completedAt: Date;

  @ApiProperty({ type: ReviewerDto, nullable: true })
  reviewer: ReviewerDto | null;

  @ApiProperty({ nullable: true })
  responses: any;

  @ApiProperty()
  nextStepType: string;

  @ApiProperty({ type: [String] })
  nextStepRoles: string[];

  @ApiProperty({ nullable: true })
  nextStaff: string | null;

  @ApiProperty()
  notificationType: string;

  @ApiProperty({ nullable: true })
  notificationComment: string | null;
}

export class SingleApplicationDto {
  @ApiProperty({ type: ProcessGroupDto })
  process: ProcessGroupDto;

  @ApiProperty()
  application: {
    _id: string;
    applicant: ApplicantDto;
    status: string;
    currentLevel: number;
    totalForms: number;
    createdAt: Date;
    isCompleted: boolean;
    progress: string;
  };

  @ApiProperty({ type: [DetailedFormHistoryDto] })
  formHistory: DetailedFormHistoryDto[];

  @ApiProperty({ type: NextFormDto, nullable: true })
  nextForm: NextFormDto | null;
}

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiProperty({ nullable: true })
  message?: string;

  @ApiProperty({ nullable: true })
  error?: any;
}

export class ProcessApplicationsDto {
  @ApiProperty({ type: ProcessGroupDto })
  process: ProcessGroupDto;

  @ApiProperty({ type: [ApplicationDto] })
  applications: ApplicationDto[];
}
