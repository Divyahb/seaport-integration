import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type Port = {
  portName: string,
  locode: string,
  latitude: number,
  longitude: number,
  timezoneOlson?: string | null,
  countryIso?: string | null
}

@Injectable()
export class PortService {
  constructor(private readonly prisma: PrismaService) { }

  async listPorts(options?: { limit?: number; offset?: number }): Promise<Port[]> {
    return this.prisma.port.findMany({
      orderBy: {
        portName: "asc"
      },
      take: options?.limit,
      skip: options?.offset
    });
  }

  async getPortByLocode(locode: string): Promise<Port | null> {
    return this.prisma.port.findUnique({
      where: {
        locode
      }
    });
  }
}

