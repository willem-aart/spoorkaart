import { Box, Flex, Radio, RadioGroup } from "@chakra-ui/react";
import { useStickyState } from "./hooks/use-sticky-state";
import { DrawGuides } from "./views/draw-guides";
import { DrawStations } from "./views/draw-stations";
import { StationNames } from "./views/station-names";
const views = {
  drawGuides: "ondersteunende geometrie tekenen",
  drawStations: "stations tekenen",
  drawTrackSections: "trajecten tekenen (i.o)",
  stationNames: "stationsnamen",
  trainRadar: "treinradar (i.o)",
};

export const App = () => {
  const [view, setView] = useStickyState<keyof typeof views>(
    "drawGuides",
    "view"
  );

  return (
    <Flex direction="column" pos="fixed" h="full" w="full" p={4}>
      <Flex gap={4}>
        <Box fontWeight="bold">weergave:</Box>
        <RadioGroup
          value={view}
          onChange={(v) => {
            setView(v as keyof typeof views);
          }}
        >
          <Flex gap={4} direction="row" flexWrap="wrap">
            {Object.entries(views).map(([key, label]) => (
              <Radio key={key} value={key} isDisabled={label.includes("(i.o)")}>
                {label}
              </Radio>
            ))}
          </Flex>
        </RadioGroup>
      </Flex>

      <Box flexGrow={1} pos="relative">
        {(view === "drawGuides" && <DrawGuides />) ||
          (view === "drawStations" && <DrawStations />) ||
          (view === "stationNames" && <StationNames />)}
      </Box>
    </Flex>
  );
};
