import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationUser, User } from 'db';
import { ZodValidationPipe } from 'nestjs-zod';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';

const mockUser: User = {
  id: 'user-id-1',
  email: 'test@example.com',
  password: 'hashed',
  firstName: 'Test',
  lastName: 'User',
  photo: null,
  googleId: null,
  status: 'ENABLED',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockOrganizationUser: OrganizationUser & {
  user?: User;
  superior?: OrganizationUser;
  subordinates?: OrganizationUser[];
} = {
  id: 'org-user-id-1',
  userId: 'user-id-1',
  superiorId: null,
  title: 'CEO',
  user: mockUser,
  subordinates: [],
};

const mockOrganizationService = {
  create: jest.fn().mockResolvedValue(mockOrganizationUser),
  findAll: jest.fn().mockResolvedValue([mockOrganizationUser]),
  findOne: jest.fn().mockResolvedValue(mockOrganizationUser),
  update: jest.fn().mockResolvedValue(mockOrganizationUser),
  remove: jest.fn().mockResolvedValue(mockOrganizationUser),
  getSubordinates: jest.fn().mockResolvedValue([mockOrganizationUser]),
  getOrganizationTree: jest.fn().mockResolvedValue(mockOrganizationUser),
  getFullOrganizationHierarchy: jest
    .fn()
    .mockResolvedValue([mockOrganizationUser]),
};

describe('OrganizationController', () => {
  let controller: OrganizationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        { provide: OrganizationService, useValue: mockOrganizationService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<OrganizationController>(OrganizationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an organization user', async () => {
      const createDto = { userId: 'user-id-1', title: 'CEO' };
      expect(await controller.create(createDto)).toEqual(mockOrganizationUser);
      expect(mockOrganizationService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of organization users', async () => {
      expect(await controller.findAll()).toEqual([mockOrganizationUser]);
      expect(mockOrganizationService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single organization user', async () => {
      expect(await controller.findOne(mockOrganizationUser.id)).toEqual(
        mockOrganizationUser,
      );
      expect(mockOrganizationService.findOne).toHaveBeenCalledWith(
        mockOrganizationUser.id,
      );
    });
  });

  describe('update', () => {
    it('should update an organization user', async () => {
      const updateDto = { title: 'New CEO' };
      expect(
        await controller.update(mockOrganizationUser.id, updateDto),
      ).toEqual(mockOrganizationUser);
      expect(mockOrganizationService.update).toHaveBeenCalledWith(
        mockOrganizationUser.id,
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove an organization user', async () => {
      expect(await controller.remove(mockOrganizationUser.id)).toEqual(
        mockOrganizationUser,
      );
      expect(mockOrganizationService.remove).toHaveBeenCalledWith(
        mockOrganizationUser.id,
      );
    });
  });

  describe('getSubordinates', () => {
    it('should return subordinates', async () => {
      expect(await controller.getSubordinates(mockOrganizationUser.id)).toEqual(
        [mockOrganizationUser],
      );
      expect(mockOrganizationService.getSubordinates).toHaveBeenCalledWith(
        mockOrganizationUser.id,
      );
    });
  });

  describe('getOrganizationTree', () => {
    it('should return an organization tree', async () => {
      expect(
        await controller.getOrganizationTree(mockOrganizationUser.userId),
      ).toEqual(mockOrganizationUser);
      expect(mockOrganizationService.getOrganizationTree).toHaveBeenCalledWith(
        mockOrganizationUser.userId,
      );
    });
  });

  describe('getFullOrganizationHierarchy', () => {
    it('should return the full organization hierarchy', async () => {
      expect(await controller.getFullOrganizationHierarchy()).toEqual([
        mockOrganizationUser,
      ]);
      expect(
        mockOrganizationService.getFullOrganizationHierarchy,
      ).toHaveBeenCalled();
    });
  });
});
