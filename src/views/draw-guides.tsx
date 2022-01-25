import "maplibre-gl/dist/maplibre-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useEffect, useRef } from "react";
import maplibregl, { IControl } from "maplibre-gl";
import { Box, Button } from "@chakra-ui/react";
import nl from "../static-data/nl.json";
import {
  buffer,
  bboxPolygon,
  bbox,
  featureCollection,
  rhumbBearing,
  transformRotate,
  point,
  coordAll,
  nearestPoint,
  LineString,
  Feature,
  points,
  transformTranslate,
  nearestPointOnLine,
} from "@turf/turf";
import { FeatureCollection } from "geojson";
import { BBox2d, Position } from "@turf/helpers/dist/js/lib/geojson";
import MapboxDraw, { DrawEvent } from "@mapbox/mapbox-gl-draw";
import { useStickyState } from "../hooks/use-sticky-state";
import drawGuides from "../static-data/draw-guides.json";

export const DrawGuides = () => {
  const [guides, setGuides] = useStickyState<FeatureCollection>(
    drawGuides,
    "draw-guides"
  );

  useEffect(() => {
    if (!map.current?.loaded()) return;

    draw.current.set(guides);
  }, [guides]);

  const map = useRef<maplibregl.Map>();
  const mapContainer = useRef<HTMLDivElement>(null);
  const draw = useRef(
    new MapboxDraw({
      keybindings: false,
      controls: {
        combine_features: false,
        uncombine_features: false,
      },
    })
  );

  const mapStyle: maplibregl.StyleSpecification = {
    version: 8,
    glyphs:
      "https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=get_your_own_OpIi9ZULNHzrESv6T2vL", // TODO: remove maptiler dependency
    sources: {
      spoorkaart: {
        type: "image",
        url: "/spoorkaart-2018.png",
        coordinates: [
          [2.191266033618035, 53.81729431799829],
          [7.462011970695471, 53.81729431799829],
          [7.462011970695471, 49.433120967533156],
          [2.191266033618035, 49.433120967533156],
        ],
      },

      "corrected-guides": {
        type: "geojson",
        data: featureCollection([]),
      },
    },
    layers: [
      {
        id: "spoorkaart",
        source: "spoorkaart",
        type: "raster",
        paint: {
          "raster-opacity": 0.75,
        },
      },

      {
        id: "corrected-guides",
        source: "corrected-guides",
        type: "line",
        layout: {
          "line-cap": "round",
          "line-join": "round",
          "line-sort-key": 9999,
        },
        paint: {
          "line-opacity": 0.75,
          "line-color": "coral",
          "line-width": {
            type: "exponential",
            base: 2,
            stops: [
              [0, 9.5 * Math.pow(2, 0 - 9.5)],
              [24, 9.5 * Math.pow(2, 24 - 9.5)],
            ],
          },
        },
      },
    ],
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      bounds: bbox(buffer(bboxPolygon(bbox(nl)), 50)) as BBox2d,
    });

    map.current.addControl(draw.current as unknown as IControl);

    map.current.on("load", () => {
      draw.current.set(guides);
      drawCorrectedGuides();

      const handleChange = (e: DrawEvent) => {
        setGuides(draw.current.getAll());
        drawCorrectedGuides();
      };

      map.current?.on("draw.create", handleChange);
      map.current?.on("draw.update", handleChange);
      map.current?.on("draw.delete", handleChange);
    });

    map.current.on("mousemove", (e) => {
      if (
        draw.current.getMode() === "draw_line_string" ||
        draw.current.getMode() === "direct_select"
      ) {
        drawCorrectedGuides();
      }
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    // hack: get mapbox-gl-draw keybindings to work
    const el = document.querySelector(".maplibregl-canvas");
    if (el) {
      el.className = "mapboxgl-canvas maplibregl-canvas";
    }
  }, []);

  const getCorrectedGuides = () => {
    return featureCollection(
      (draw.current.getAll().features as Feature<LineString>[])
        // connect LineStrings at end
        .reduce((featureAcc: Feature<LineString>[], feature) => {
          if (
            feature.geometry.type !== "LineString" ||
            featureAcc.length === 0 ||
            feature.geometry.coordinates.length === 0
          ) {
            return [...featureAcc, feature];
          }

          const end =
            feature.geometry.coordinates[
              feature.geometry.coordinates.length - 1
            ];

          const nearestToEnd = nearestPointOnLine(draw.current.getAll(), end);

          if (nearestToEnd?.properties?.dist || 0 < 0.5) {
            return [
              ...featureAcc,
              {
                ...feature,
                geometry: {
                  ...feature.geometry,
                  coordinates: [
                    ...feature.geometry.coordinates.slice(0, -1),
                    nearestToEnd.geometry.coordinates,
                  ],
                },
              },
            ];
          }

          return [...featureAcc, feature];
        }, [])
        // enforce correct angles
        .reduce((featureAcc: Feature<LineString>[], feature) => {
          if (feature.geometry.type !== "LineString") {
            return [...featureAcc, feature];
          }

          const coords = feature.geometry.coordinates.reduce(
            (coordAcc: Position[], coord, coordIndex) => {
              if (coordIndex === 0) {
                return [...coordAcc, coord];
              }

              const pivot = coordAcc[coordIndex - 1];
              const bearing = rhumbBearing(pivot, coord);
              const snapped = Math.round(bearing / 45) * 45;

              const correction = {
                45: 46.35,
                "-45": -46.35,
                135: 133.65,
                "-135": -133.65,
              };

              const snapCorrected =
                snapped in correction
                  ? correction[snapped.toString()]
                  : snapped;

              const rotated = transformRotate(
                point(coord),
                snapCorrected - bearing,
                { pivot }
              ).geometry.coordinates;

              return [...coordAcc, rotated];
            },
            []
          );

          return [
            ...featureAcc,
            {
              ...feature,
              geometry: { ...feature.geometry, coordinates: coords },
            },
          ];
        }, [])
        // connect LineStrings at start
        .reduce((featureAcc: Feature<LineString>[], feature) => {
          if (
            feature.geometry.type !== "LineString" ||
            featureAcc.length === 0 ||
            feature.geometry.coordinates.length === 0
          ) {
            return [...featureAcc, feature];
          }

          const start = feature.geometry.coordinates[0];

          const nearestToStart = nearestPoint(
            start,
            points(coordAll(featureCollection(featureAcc)))
          );

          const moved = transformTranslate(
            feature,
            nearestToStart.properties.distanceToPoint,
            rhumbBearing(start, nearestToStart)
          );

          return [...featureAcc, moved];
        }, []) // connect LineStrings at end
    );
  };

  const drawCorrectedGuides = () => {
    map.current?.getSource("corrected-guides")?.setData(getCorrectedGuides());
  };

  return (
    <>
      <Box ref={mapContainer} w="full" h="full" />

      <Box
        hidden
        border={"1px solid #aaa"}
        as="pre"
        pos="fixed"
        right={0}
        bottom={0}
        h="600px"
        w="300px"
        overflow="scroll"
        // pointerEvents={"none"}
      >
        {JSON.stringify(guides, null, 2)}
      </Box>

      <Box pos="fixed" right="10px" top="200px">
        <Button
          size="xs"
          onClick={() => {
            setGuides(getCorrectedGuides());
          }}
        >
          bake correction
        </Button>
      </Box>
    </>
  );
};
