import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { Box } from "@chakra-ui/react";
import nl from "../static-data/nl.json";
import stations from "../static-data/generated/stations.json";
import { points, buffer, bboxPolygon, bbox } from "@turf/turf";
import { BBox2d } from "@turf/helpers/dist/js/lib/geojson";

export const Trains = () => {
  const map = useRef<maplibregl.Map>();
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,

        sources: {
          nl: {
            type: "geojson",
            data: nl,
          },

          stations: {
            type: "geojson",
            data: points(
              Object.values(stations).map(
                (station) => station.coordinates.world
              )
            ),
          },
        },
        layers: [
          {
            id: "nl-fill",
            source: "nl",
            type: "fill",
            paint: { "fill-color": "#fef4d0" },
          },

          {
            id: "nl-border",
            source: "nl",
            type: "line",
            paint: {
              "line-color": "#00a3d3",
            },
          },

          {
            id: "stations",
            source: "stations",
            type: "circle",
            paint: {
              "circle-radius": 3,
              "circle-color": "#fff",
              "circle-stroke-width": 1,
            },
          },
        ],
      },
      bounds: bbox(buffer(bboxPolygon(bbox(nl)), 25)) as BBox2d,
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return <Box ref={mapContainer} w="full" h="full" />;
};
