import fetch from "cross-fetch";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  const trains = await (
    await fetch(
      "https://gateway.apiportal.ns.nl/virtual-train-api/api/vehicle",
      {
        headers: { "Ocp-Apim-Subscription-Key": process.env.NS_API_KEY || "" },
      }
    )
  ).json();

  res.json(trains.payload.treinen);
};
