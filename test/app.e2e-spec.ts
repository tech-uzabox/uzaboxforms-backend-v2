import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { ConfigService } from '@nestjs/config';
import { FileService } from './../src/file/file.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          if (key === 's3') {
            return {
              endpoint: 'http://localhost:9000',
              accessKeyId: 'test-access-key',
              secretAccessKey: 'test-secret-key',
              bucketName: 'test-bucket',
              region: 'us-east-1',
            };
          }
          if (key === 'jwt.secret') {
            return 'test-secret';
          }
          if (key === 'google.clientId') {
            return 'test-google-client-id';
          }
          if (key === 'google.clientSecret') {
            return 'test-google-client-secret';
          }
          if (key === 'google.callbackURL') {
            return 'http://localhost:3000/auth/google/callback';
          }
          return null;
        }),
      })
      .overrideProvider(FileService)
      .useValue({
        uploadFile: jest.fn(),
        deleteFile: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterAll(async () => {
    await app.close();
  });
});
