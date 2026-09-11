import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { MailModule } from './mail/mail.module.js';
import { WorkspacesModule } from './workspaces/workspaces.module.js';
import { ConversationsModule } from './conversations/conversations.module.js';
import { WebSocketsModule } from './websockets/websockets.module.js';
import { AiModule } from './ai/ai.module.js';

export function validateEnvironment(config: Record<string, any>) {
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];
  const missingVars = requiredVars.filter(
    (key) => !config[key] || String(config[key]).trim() === '',
  );

  if (missingVars.length > 0) {
    throw new Error(
      `[Environment Validation Error] Missing required environment variable(s): ${missingVars.join(
        ', ',
      )}. Please provide them in your environment or .env file.`,
    );
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.getOrThrow<string>('MONGODB_URI');
        return {
          uri,
          serverSelectionTimeoutMS: 5000,
        };
      },
    }),
    AuthModule,
    MailModule,
    WorkspacesModule,
    ConversationsModule,
    WebSocketsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}