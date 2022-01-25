import "maplibre-gl/dist/maplibre-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useEffect, useLayoutEffect, useRef } from "react";
import maplibregl, { IControl } from "maplibre-gl";
import { Box, Button } from "@chakra-ui/react";
import nl from "../static-data/nl.json";
import {
  buffer,
  bboxPolygon,
  bbox,
  featureCollection,
  nearestPointOnLine,
} from "@turf/turf";
import { FeatureCollection, Feature, Point } from "geojson";
import { BBox2d } from "@turf/helpers/dist/js/lib/geojson";
import MapboxDraw, { DrawEvent } from "@mapbox/mapbox-gl-draw";
import { useStickyState } from "../hooks/use-sticky-state";
import guides from "../static-data/draw-guides.json";
import drawStations from "../static-data/draw-stations.json";

export const DrawStations = () => {
  const [stations, setStations] = useStickyState<FeatureCollection>(
    drawStations,
    "draw-stations"
  );

  useLayoutEffect(() => {
    if (!map.current?.loaded()) return;

    draw.current.set(stations);
  }, [stations]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Backquote") {
        snapToGuides();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, []);

  const map = useRef<maplibregl.Map>();
  const mapContainer = useRef<HTMLDivElement>(null);
  const draw = useRef(
    new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        point: true,
        trash: true,
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

      guides: {
        type: "geojson",
        data: guides,
      },
    },
    layers: [
      {
        id: "spoorkaart",
        source: "spoorkaart",
        type: "raster",
        paint: {
          "raster-opacity": 0.5,
        },
      },

      {
        id: "guides",
        source: "guides",
        type: "line",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-opacity": 0.5,
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
      draw.current.set(stations);

      const handleChange = (e: DrawEvent) => {
        setStations(draw.current.getAll());
      };

      map.current?.on("draw.create", handleChange);
      map.current?.on("draw.update", handleChange);
      map.current?.on("draw.delete", handleChange);
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

  const snapToGuides = () => {
    setStations(
      featureCollection(
        (draw.current.getAll().features as Feature<Point>[]).map((feature) => {
          const nearest = nearestPointOnLine(
            guides,
            feature.geometry.coordinates
          );

          // console.log(nearest.properties.dist);

          if ((nearest.properties.dist || 0) < 0.1) return feature;

          return {
            ...feature,
            geometry: {
              ...feature.geometry,
              coordinates: nearest.geometry.coordinates,
            },
          };
        })
      )
    );
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
        {JSON.stringify(stations, null, 2)}
      </Box>

      <Box pos="fixed" right="10px" top="150px">
        <Button size="xs" onClick={snapToGuides}>
          snap to guides
        </Button>
      </Box>
    </>
  );
};
