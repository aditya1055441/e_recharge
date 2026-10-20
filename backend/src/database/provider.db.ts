import { prisma } from "./prisma";

export interface DbProvider {
  id: number;
  code: string;
  display_name: string;
  enabled: boolean;
  environment: string;
  priority: number;
  supported_services: string[];
  health_status: string;
  config: any;
  created_at: string;
  updated_at: string;
}

export class ProviderDatabase {
  public async getAll(): Promise<DbProvider[]> {
    const providers = await prisma.provider.findMany({
      orderBy: { priority: "asc" }
    });

    return providers.map((p) => ({
      id: Number(p.id),
      code: p.code,
      display_name: p.displayName,
      enabled: p.enabled,
      environment: p.environment,
      priority: p.priority,
      supported_services: p.supportedServices,
      health_status: p.healthStatus,
      config: p.config,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString()
    }));
  }

  public async getByCode(code: string): Promise<DbProvider | null> {
    const p = await prisma.provider.findUnique({
      where: { code }
    });

    if (!p) return null;

    return {
      id: Number(p.id),
      code: p.code,
      display_name: p.displayName,
      enabled: p.enabled,
      environment: p.environment,
      priority: p.priority,
      supported_services: p.supportedServices,
      health_status: p.healthStatus,
      config: p.config,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString()
    };
  }
}

export const providerDb = new ProviderDatabase();
