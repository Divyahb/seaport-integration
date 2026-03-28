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
});

