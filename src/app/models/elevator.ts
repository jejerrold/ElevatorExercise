export interface Elevator {
  id: number;
  direction?: number;
  currentFloor?: number;
  passengerFloors?: number[];
  targetFloors?: number[];
  isMoving?: boolean;
}
