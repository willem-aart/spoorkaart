const { writeFile } = require("fs/promises");

// @ts-expect-error
const fetch = require("cross-fetch");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// @ts-expect-error
const prompt = (query) => new Promise((resolve) => rl.question(query, resolve));

(async () => {
  const nsApiKey = await prompt("Please enter NS API key: ");

  // TODO: execute promises in parallel
  const stationsApiData = (await (
    await fetch(
      "https://gateway.apiportal.ns.nl/reisinformatie-api/api/v2/stations",
      { headers: { "Ocp-Apim-Subscription-Key": nsApiKey || "" } }
    )
  ).json()) as {
    payload: {
      code: string;
      stationType: string;
      lat: number;
      lng: number;
      namen: { lang: string };
    }[];
  };

  // TODO: add explicit types
  const stations = stationsApiData.payload.reduce((acc, item) => {
    const id = item.code.toLowerCase();

    return {
      ...acc,
      [id]: {
        id,
        name: item.namen.lang,
        type: item.stationType,
        coordinates: {
          world: [item.lng, item.lat],
        },
      },
    };
  }, {});

  await writeFile(
    "./src/static-data/generated/stations.json",
    JSON.stringify(stations, null, 2)
  );

  const trackSectionsApiData = (await (
    await fetch(
      "https://gateway.apiportal.ns.nl/Spoorkaart-API/api/v1/spoorkaart",
      { headers: { "Ocp-Apim-Subscription-Key": nsApiKey || "" } }
    )
  ).json()) as {
    payload: {
      features: {
        properties: {
          from: string;
          to: string;
        };
        geometry: {
          coordinates: number[][];
        };
      }[];
    };
  };

  // TODO: add explicit types
  const trackSections = trackSectionsApiData.payload.features.reduce(
    (acc, item) => {
      const id = `${item.properties.from} -> ${item.properties.to}`;

      return {
        ...acc,
        [id]: {
          id,
          fromStationId: item.properties.from,
          toStationId: item.properties.to,
          coordinates: {
            world: item.geometry.coordinates,
          },
        },
      };
    },
    {}
  );

  await writeFile(
    "./src/static-data/generated/track-sections.json",
    JSON.stringify(trackSections, null, 2)
  );

  rl.close();
})();

rl.on("close", () => {
  process.exit(0);
});
