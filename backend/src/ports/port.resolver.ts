import { Args, Query, Resolver } from "@nestjs/graphql";
import { Port } from "./port.model";
import { PortService } from "./port.service";

@Resolver(() => Port)
export class PortResolver {
  constructor(private readonly portService: PortService) {}

  @Query(() => [Port], { name: "ports" })
  ports() {
    return this.portService.listPorts();
  }

  @Query(() => Port, { name: "port", nullable: true })
  port(@Args("locode") locode: string) {
    return this.portService.getPortByLocode(locode);
  }
}

