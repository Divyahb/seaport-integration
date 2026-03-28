import { Field, Float, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class Port {
  @Field(() => ID)
  id!: string;

  @Field()
  portName!: string;

  @Field()
  locode!: string;

  @Field(() => Float)
  latitude!: number;

  @Field(() => Float)
  longitude!: number;

  @Field(() => String, { nullable: true })
  timezoneOlson?: string | null;

  @Field(() => String, { nullable: true })
  countryIso?: string | null;
}
