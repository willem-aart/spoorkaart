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

  const stationsApiData = (await (
    await fetch(
      "https://gateway.apiportal.ns.nl/reisinformatie-api/api/v2/stations",
      { headers: { "Ocp-Apim-Subscription-Key": nsApiKey || "" } }
    )
  ).json()) as {
    payload: {
      code: string;
      lat: number;
      lng: number;
      namen: { lang: string };
    }[];
  };

  // TODO: types
  const stations = stationsApiData.payload.reduce((acc, item) => {
    const id = item.code.toLowerCase();

    return {
      ...acc,
      [id]: {
        id,
        name: item.namen.lang,
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

  rl.close();
})();

rl.on("close", () => {
  process.exit(0);
});
