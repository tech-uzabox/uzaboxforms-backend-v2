import { Test, TestingModule } from '@nestjs/testing';
import { Process } from 'db';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../db/prisma.service';
import { ProcessService } from './process.service';

const mockPrismaService = {
  process: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
  },
  processRole: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  processForm: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  role: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockProcess: Process = {
  id: 'process-id-1',
  name: 'Test Process',
  type: 'PRIVATE',
  groupId: 'group-id-1',
  creatorId: 'creator-id-1',
  status: 'ENABLED',
  archived: false,
  staffViewForms: false,
  applicantViewProcessLevel: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProcessService', () => {
  let service: ProcessService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<ProcessService>(ProcessService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new process without roles', async () => {
      const createProcessDto = {
        name: 'New Process',
        groupId: 'group-id-1',
        creatorId: 'user-id-1',
        type: mockProcess.type,
        status: mockProcess.status,
        archived: mockProcess.archived,
        staffViewForms: mockProcess.staffViewForms,
        applicantViewProcessLevel: mockProcess.applicantViewProcessLevel,
      };
      mockPrismaService.process.create.mockResolvedValue(mockProcess);

      const result = await service.create(createProcessDto);
      expect(result).toEqual(mockProcess);
      expect(prisma.process.create).toHaveBeenCalledWith({
        data: {
          name: createProcessDto.name,
          type: createProcessDto.type,
          status: createProcessDto.status,
          archived: createProcessDto.archived,
          staffViewForms: createProcessDto.staffViewForms,
          applicantViewProcessLevel: createProcessDto.applicantViewProcessLevel,
          group: { connect: { id: createProcessDto.groupId } },
          creator: { connect: { id: createProcessDto.creatorId } },
          roles: undefined,
        },
        include: {
          creator: true,
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    it('should create a new process with roles', async () => {
      const createProcessDto = {
        name: 'New Process',
        groupId: 'group-id-1',
        creatorId: 'user-id-1',
        type: mockProcess.type,
        status: mockProcess.status,
        archived: mockProcess.archived,
        staffViewForms: mockProcess.staffViewForms,
        applicantViewProcessLevel: mockProcess.applicantViewProcessLevel,
        roles: ['role-id-1', 'role-id-2'],
      };
      mockPrismaService.role.findMany.mockResolvedValue([
        { id: 'role-id-1' },
        { id: 'role-id-2' },
      ]);
      mockPrismaService.process.create.mockResolvedValue(mockProcess);

      const result = await service.create(createProcessDto);
      expect(result).toEqual(mockProcess);
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['role-id-1', 'role-id-2'] } },
        select: { id: true },
      });
      expect(prisma.process.create).toHaveBeenCalledWith({
        data: {
          name: createProcessDto.name,
          type: createProcessDto.type,
          status: createProcessDto.status,
          archived: createProcessDto.archived,
          staffViewForms: createProcessDto.staffViewForms,
          applicantViewProcessLevel: createProcessDto.applicantViewProcessLevel,
          group: { connect: { id: createProcessDto.groupId } },
          creator: { connect: { id: createProcessDto.creatorId } },
          roles: {
            create: [
              { roleId: 'role-id-1', status: 'ENABLED' },
              { roleId: 'role-id-2', status: 'ENABLED' },
            ],
          },
        },
        include: {
          creator: true,
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    it('should throw error for non-existent role IDs', async () => {
      const createProcessDto = {
        name: 'New Process',
        groupId: 'group-id-1',
        creatorId: 'user-id-1',
        type: mockProcess.type,
        status: mockProcess.status,
        archived: mockProcess.archived,
        staffViewForms: mockProcess.staffViewForms,
        applicantViewProcessLevel: mockProcess.applicantViewProcessLevel,
        roles: ['role-id-1', 'invalid-role-id'],
      };
      mockPrismaService.role.findMany.mockResolvedValue([{ id: 'role-id-1' }]);

      await expect(service.create(createProcessDto)).rejects.toThrow(
        'Role(s) with ID(s) invalid-role-id not found',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of processes', async () => {
      mockPrismaService.process.findMany.mockResolvedValue([mockProcess]);

      const result = await service.findAll();
      expect(result).toEqual([mockProcess]);
      expect(prisma.process.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single process by id', async () => {
      mockPrismaService.process.findUnique.mockResolvedValue(mockProcess);

      const result = await service.findOne(mockProcess.id);
      expect(result).toEqual(mockProcess);
      expect(prisma.process.findUnique).toHaveBeenCalledWith({
        where: { id: mockProcess.id },
      });
    });
  });

  describe('update', () => {
    it('should update a process', async () => {
      const updateProcessDto = { name: 'Updated Process' };
      const updatedProcess = { ...mockProcess, ...updateProcessDto };
      mockPrismaService.process.update.mockResolvedValue(updatedProcess);

      const result = await service.update(mockProcess.id, updateProcessDto);
      expect(result).toEqual(updatedProcess);
      expect(prisma.process.update).toHaveBeenCalledWith({
        where: { id: mockProcess.id },
        data: updateProcessDto,
      });
    });
  });

  describe('remove', () => {
    it('should delete a process', async () => {
      mockPrismaService.process.delete.mockResolvedValue(mockProcess);

      await service.remove(mockProcess.id);
      expect(prisma.process.delete).toHaveBeenCalledWith({
        where: { id: mockProcess.id },
      });
    });
  });

  describe('submitProcessForm', () => {
    it('should configure forms within a process', async () => {
      const processForms = [
        {
          formId: 'form-id-1',
          order: 1,
          nextStepType: 'STATIC',
          nextStaffId: 'staff-id-1',
        },
        {
          formId: 'form-id-2',
          order: 2,
          nextStepType: 'DYNAMIC',
          nextStepRoles: ['role-id-1'],
        },
      ];
      const configData = {
        staffViewForms: true,
        applicantViewProcessLevel: true,
        processForms,
      };

      mockPrismaService.process.update.mockResolvedValue(mockProcess);
      mockPrismaService.processForm.deleteMany.mockResolvedValue({});
      mockPrismaService.processForm.createMany.mockResolvedValue({});

      const result = await service.submitProcessForm(
        mockProcess.id,
        configData,
      );
      expect(result).toEqual(mockProcess);
      expect(prisma.process.update).toHaveBeenCalledWith({
        where: { id: mockProcess.id },
        data: { staffViewForms: true, applicantViewProcessLevel: true },
      });
      expect(prisma.processForm.deleteMany).toHaveBeenCalledWith({
        where: { processId: mockProcess.id },
      });
      expect(prisma.processForm.createMany).toHaveBeenCalledWith({
        data: processForms.map((pf) => ({ ...pf, processId: mockProcess.id })),
      });
    });
  });

  describe('duplicate', () => {
    it('should duplicate a process', async () => {
      const newProcessName = 'Test Process - Copy';
      const duplicatedProcess = {
        ...mockProcess,
        id: 'new-process-id',
        name: newProcessName,
      };

      mockPrismaService.process.findUnique.mockResolvedValue({
        ...mockProcess,
        forms: [],
        roles: [],
      });
      mockPrismaService.process.create.mockResolvedValue(duplicatedProcess);
      mockPrismaService.process.findFirst.mockResolvedValue(null); // For name uniqueness check

      const result = await service.duplicate(mockProcess.id, 'user-id-1');
      expect(result).toEqual(duplicatedProcess);
      expect(prisma.process.findUnique).toHaveBeenCalledWith({
        where: { id: mockProcess.id },
        include: { forms: true, roles: true },
      });
      expect(prisma.process.create).toHaveBeenCalledWith({
        data: {
          name: newProcessName,
          type: mockProcess.type,
          groupId: mockProcess.groupId,
          creatorId: 'user-id-1',
          status: mockProcess.status,
          archived: mockProcess.archived,
          staffViewForms: mockProcess.staffViewForms,
          applicantViewProcessLevel: mockProcess.applicantViewProcessLevel,
          forms: { create: [] }, // Expect nested create
          roles: { create: [] }, // Expect nested create
        },
      });
    });

    it('should handle duplicate name by appending a number', async () => {
      const newProcessName = 'Test Process - Copy';
      const newProcessName2 = 'Test Process - Copy (2)';
      const duplicatedProcess = {
        ...mockProcess,
        id: 'new-process-id-2',
        name: newProcessName2,
      };

      mockPrismaService.process.findUnique.mockResolvedValue({
        ...mockProcess,
        forms: [],
        roles: [],
      });
      mockPrismaService.process.findFirst
        .mockResolvedValueOnce({ id: 'existing-copy', name: newProcessName })
        .mockResolvedValueOnce(null); // Second check for (2) is unique
      mockPrismaService.process.create.mockResolvedValue(duplicatedProcess);

      const result = await service.duplicate(mockProcess.id, 'user-id-1');
      expect(result).toEqual(duplicatedProcess);
      expect(prisma.process.create).toHaveBeenCalledWith({
        data: {
          name: newProcessName2,
          type: mockProcess.type,
          groupId: mockProcess.groupId,
          creatorId: 'user-id-1',
          status: mockProcess.status,
          archived: mockProcess.archived,
          staffViewForms: mockProcess.staffViewForms,
          applicantViewProcessLevel: mockProcess.applicantViewProcessLevel,
          forms: { create: [] }, // Expect nested create
          roles: { create: [] }, // Expect nested create
        },
      });
    });
  });
});
