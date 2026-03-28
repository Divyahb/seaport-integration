export type PortRecord = {
  portName: string;
  locode: string;
  latitude: number;
  longitude: number;
  timezoneOlson?: string | null;
  countryIso?: string | null;
};

const PORTS_QUERY = `
  query Ports {
    ports {
      portName
      locode
      latitude
      longitude
      timezoneOlson
      countryIso
    }
  }
`;

export async function fetchPorts(): Promise<PortRecord[]> {
  const response = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:3001/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: PORTS_QUERY }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to reach GraphQL service.");
  }

  const payload = (await response.json()) as {
    data?: { ports?: PortRecord[] };
    errors?: Array<{ message: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message);
  }

  return payload.data?.ports ?? [];
}
