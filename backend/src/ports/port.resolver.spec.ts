import { PortResolver } from "./port.resolver";
import { PortService } from "./port.service";

describe("PortResolver", () => {
  it("delegates port lookups to the service", async () => {
    const service: Pick<PortService, "getPortByLocode" | "listPorts"> = {
      getPortByLocode: jest.fn().mockResolvedValue({
        id: "1",
        portName: "Chennai Port",
        locode: "INMAA",
        latitude: 13.0827,
        longitude: 80.2707,
        timezoneOlson: "Asia/Kolkata",
        countryIso: "IN"
      }),
      listPorts: jest.fn()
    };

    const resolver = new PortResolver(service as PortService);
    await expect(resolver.port("INMAA")).resolves.toMatchObject({ locode: "INMAA" });
  });
});
