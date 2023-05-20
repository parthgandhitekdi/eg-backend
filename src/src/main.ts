import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
const Sentry = require("@sentry/node");

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {cors: true});

    Sentry.init({
        dsn: process.env.SENTRY_DSN_URL,
        environment: process.env.SENTRY_ENVIRONMENT,

        // Set tracesSampleRate to 1.0 to capture 100%
        // of transactions for performance monitoring.
        // We recommend adjusting this value in production
        tracesSampleRate: 0.1,
    });

    await app.listen(5000);
}

bootstrap();
