/**
 * A lower number means a higher priority.
 */
export const mapLabelPriorityByStationType: { [type: string]: number } = {
  MEGA_STATION: 0,
  KNOOPPUNT_INTERCITY_STATION: 1,
  INTERCITY_STATION: 2,
  KNOOPPUNT_SNELTREIN_STATION: 3,
  SNELTREIN_STATION: 4,
  KNOOPPUNT_STOPTREIN_STATION: 5,
  STOPTREIN_STATION: 6,
  FACULTATIEF_STATION: 7,
};
