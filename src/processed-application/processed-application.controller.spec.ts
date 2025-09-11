import { Test, TestingModule } from '@nestjs/testing';
import { ProcessedApplicationController } from './processed-application.controller';
import { ProcessedApplicationService } from './processed-application.service';
import { CreateProcessedApplicationDto } from './dto/create-processed-application.dto';
import { AuthenticatedUser } from '../auth/decorators/get-user.decorator';

describe('ProcessedApplicationController', () => {
  let controller: ProcessedApplicationController;
  let service: ProcessedApplicationService;

  const mockProcessedApplicationService = {
    create: jest.fn(),
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-id-1',
    email: 'test@example.com',
    roles: ['Staff'],
    status: 'ENABLED',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date(),
    updatedAt: new Date(),
    googleId: null,
    photo: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessedApplicationController],
      providers: [
        {
          provide: ProcessedApplicationService,
          useValue: mockProcessedApplicationService,
        },
      ],
    }).compile();

    controller = module.get<ProcessedApplicationController>(
      ProcessedApplicationController,
    );
    service = module.get<ProcessedApplicationService>(ProcessedApplicationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call the service with the correct data', async () => {
      const createDto: CreateProcessedApplicationDto = {
        applicantProcessId: 'ap-1',
        formId: 'form-1',
        reviewerId: 'user-id-1',
        responses: { q1: 'a1' },
      };

      await controller.create(createDto, mockUser);

      expect(service.create).toHaveBeenCalledWith({
        ...createDto,
        reviewerId: mockUser.id,
      });
    });
  });
});
