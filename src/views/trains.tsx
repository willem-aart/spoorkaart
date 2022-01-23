import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { Box } from "@chakra-ui/react";
import nl from "../static-data/nl.json";
import stations from "../static-data/generated/stations.json";
import trackSections from "../static-data/generated/track-sections.json";
import {
  buffer,
  bboxPolygon,
  bbox,
  lineStrings,
  point,
  featureCollection,
} from "@turf/turf";
import { BBox2d } from "@turf/helpers/dist/js/lib/geojson";
import { mapLabelPriorityByStationType } from "../constants";

export const Trains = () => {
  const map = useRef<maplibregl.Map>();
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,

        glyphs:
          "https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=get_your_own_OpIi9ZULNHzrESv6T2vL", // TODO: remove maptiler dependency

        sources: {
          nl: {
            type: "geojson",
            data: nl,
          },
          trackSections: {
            type: "geojson",
            data: lineStrings(
              Object.values(trackSections).map(
                (trackSection) => trackSection.coordinates.world
              )
            ),
          },
          stations: {
            type: "geojson",
            data: featureCollection(
              Object.values(stations).map((station) =>
                point(station.coordinates.world, {
                  name: station.name,
                  labelPriority:
                    mapLabelPriorityByStationType[station.type] || 0,
                })
              )
            ),
          },
        },

        layers: [
          {
            id: "nlFill",
            source: "nl",
            type: "fill",
            paint: { "fill-color": "#fef4d0" },
          },
          {
            id: "nlBorder",
            source: "nl",
            type: "line",
            paint: {
              "line-color": "#00a3d3",
            },
          },
          {
            id: "trackSections",
            source: "trackSections",
            type: "line",
          },
          {
            id: "stations",
            source: "stations",
            type: "circle",
            paint: {
              "circle-radius": 2,
              "circle-color": "#fff",
              "circle-stroke-width": 1,
              "circle-pitch-alignment": "map",
            },
          },
          {
            id: "stationNames",
            source: "stations",
            type: "symbol",
            layout: {
              // visibility: "none",
              "text-field": ["get", "name"],
              "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
              "text-allow-overlap": false,
              "text-padding": 10,
              "text-size": [
                "interpolate",
                ["exponential", 2],
                ["to-number", ["get", "labelPriority"]],
                0,
                13,
                7,
                8,
              ],
              "text-offset": [0, -0.5],
              "text-anchor": "bottom",
              "text-pitch-alignment": "map",
              "symbol-sort-key": ["to-number", ["get", "labelPriority"]],
            },
            paint: {
              "text-halo-width": 5,
              "text-halo-color": "#fff",
            },
          },
        ],
      },
      bounds: bbox(buffer(bboxPolygon(bbox(nl)), 10)) as BBox2d,
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return <Box ref={mapContainer} w="full" h="full" />;
};
