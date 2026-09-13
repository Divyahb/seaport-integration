import { Args, Int, Query, Resolver } from "@nestjs/graphql";
import { Port } from "./port.model";
import { PortService } from "./port.service";

@Resolver(() => Port)
export class PortResolver {
  constructor(private readonly portService: PortService) {}

  @Query(() => [Port], { name: "ports" })
  ports(
    @Args("limit", { type: () => Int, nullable: true }) limit?: number,
    @Args("offset", { type: () => Int, nullable: true }) offset?: number
  ) {
    return this.portService.listPorts({ limit, offset });
  }

  @Query(() => Port, { name: "port", nullable: true })
  port(@Args("locode") locode: string) {
    return this.portService.getPortByLocode(locode);
  }
}

