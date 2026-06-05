import { createSwaggerSpec } from 'next-swagger-doc';
import { loginSwaggerSchema, signupSwaggerSchema } from '@/modules/auth/auth.schema';
import { updateStatusSwaggerSchema } from '@/modules/reports/report.schema';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'UPNFIX API',
        version: '1.0.0',
        description: 'API Documentation untuk Sistem Manajemen Fasilitas Kampus UPNFIX',
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          LoginPayload: loginSwaggerSchema,
          SignupPayload: signupSwaggerSchema,
          UpdateStatusPayload: updateStatusSwaggerSchema,
        }
      },
      security: [],
    },
  });
  return spec;
};
