import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { WidgetDataService } from './widget-data.service';
import { WidgetController } from './widget.controller';
import { WidgetService } from './widget.service';
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        try {
          const store = await redisStore({
            socket: {
              host: configService.get<string>('REDIS_HOST', 'localhost'),
              port: configService.get<number>('REDIS_PORT', 6379),
            },
            ttl: 60 * 1000, // 60 seconds
          });

          console.log('✅ Redis store created successfully');
          return { store };
        } catch (error) {
          console.error('❌ Failed to create Redis store:', error);
          throw error;
        }
      },
    }),
  ],
  providers: [WidgetService, WidgetDataService],
  controllers: [WidgetController],
  exports: [WidgetDataService, WidgetService],
})
export class WidgetModule {}
