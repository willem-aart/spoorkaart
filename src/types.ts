type Position = number[];

export type Station = {
  id: string;
  name: string;
  coordinates: {
    world: Position;
    // diagram: Position;
  };
};

export type TrackSection = {
  fromStationId: string;
  toStationId: string;
  /**
   * - order / direction is important
   * - first and last positions should match coordinates of corresponding stations
   */
  coordinates: {
    world: Position[];
    // diagram: Position[];
  };
};
