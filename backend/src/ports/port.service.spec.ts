import { PortService } from "./port.service";

describe("PortService", () => {
  it("returns ports from prisma", async () => {
    const prisma = {
      port: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "1",
            portName: "Chennai Port",
            locode: "INMAA",
            latitude: 13.0827,
            longitude: 80.2707,
            timezoneOlson: "Asia/Kolkata",
            countryIso: "IN"
          }
        ])
      }
    };

    const service = new PortService(prisma as never);
    await expect(service.listPorts()).resolves.toHaveLength(1);
  });

  it("passes limit and offset through to Prisma as take/skip", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new PortService({ port: { findMany } } as never);

    await service.listPorts({ limit: 10, offset: 20 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 })
    );
  });
});

