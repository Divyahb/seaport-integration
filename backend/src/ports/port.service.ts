import { Injectable } from "@nestjs/common";
import type { Port } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PortService {
  constructor(private readonly prisma: PrismaService) { }

  async listPorts(): Promise<Port[]> {
    return this.prisma.port.findMany({
      orderBy: {
        portName: "asc"
      }
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

