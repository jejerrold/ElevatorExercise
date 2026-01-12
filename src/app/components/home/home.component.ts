import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Floor } from '../../models/floor';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Direction } from '../../enums/direction';
import { Elevator } from '../../models/elevator';
@Component({
  selector: 'app-home',
  imports: [
    MatTableModule,
    CommonModule,
    FormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  dataSource = new MatTableDataSource<Floor>([]);
  displayedColumns: string[] = ['floorNumber', 'elevators', 'actions'];
  floors: number[] = [];
  minFloor: number = 1;
  requestedFloors: number[] = [];
  actions: string[] = [];
  isConfigured: boolean = false;

  //default parameters
  floorCount: number = 10;
  elevatorCount: number = 4;
  delaysBetweenFloors: number = 3;

  constructor(private cdr: ChangeDetectorRef) {}

  elevators: Elevator[] = [];

  ngOnInit(): void {}

  setParameters() {
    const floorElevators: number[] = [];
    for (let i = 1; i <= this.elevatorCount; i++) {
      floorElevators.push(i);
      this.elevators.push({
        id: i,
        currentFloor: this.minFloor,
        direction: Direction.Idle,
        targetFloors: [],
        isMoving: false,
      });
    }

    const floors: Floor[] = [];
    for (let i = this.floorCount; i >= this.minFloor; i--) {
      floors.push({
        id: i,
        elevators: floorElevators,
        currentElevators: i == this.minFloor ? [...floorElevators] : [],
      });
      this.floors.push(i);
    }
    this.dataSource.data = floors;
    this.isConfigured = true;
  }

  // Trigger elevator call from a floor
  callElevator(floorId: number, direction: 'Up' | 'Down') {
    this.actions.push(`${direction} request on floor ${floorId} received.`);
    let elevator = this.selectElevator(floorId);
    this.requestedFloors.push(floorId);
    elevator!.targetFloors?.push(floorId);
    this.moveElevator(elevator.id, floorId);
  }

  // Handle floor selection from inside the elevator
  async selectFloor(elevatorNumber: number, floorNum: number) {
    const elevator = this.elevators.find((e) => e.id === elevatorNumber);
    if (elevator) {
      elevator.passengerFloors = elevator.passengerFloors || [];
      elevator.passengerFloors.push(floorNum);
      elevator.targetFloors?.push(floorNum);
    }
    this.actions.push(`Car ${elevatorNumber} is requested at floor ${floorNum}`);

    // If the elevator is not moving, start moving it to the requested floor. No need to start if it's already moving.
    if (elevator && !elevator.isMoving) {
      this.moveElevator(elevatorNumber, floorNum);
    }
  }

  // Select the nearest elevator that is either idle or moving towards the requested floor
  selectElevator(floorId: number) {
    const nearestElevator = this.elevators.reduce((nearest, current) => {
      const nearestDistance = Math.abs((nearest.currentFloor ?? 1) - floorId);
      const currentDistance = Math.abs((current.currentFloor ?? 1) - floorId);
      // Check if elevator is moving in the right direction or is idle
      const nearestMovingTowards =
        (nearest.direction === Direction.Up && floorId > (nearest.currentFloor ?? 1)) ||
        (nearest.direction === Direction.Down && floorId < (nearest.currentFloor ?? 1)) ||
        nearest.direction === Direction.Idle;

      // Check if current elevator is moving in the right direction or is idle
      const currentMovingTowards =
        (current.direction === Direction.Up && floorId > (current.currentFloor ?? 1)) ||
        (current.direction === Direction.Down && floorId < (current.currentFloor ?? 1)) ||
        current.direction === Direction.Idle;

      // Prioritize elevators moving towards the floor
      if (currentMovingTowards && !nearestMovingTowards) {
        return current;
      } else if (!currentMovingTowards && nearestMovingTowards) {
        return nearest;
      }

      // If both or neither are moving towards, choose by distance
      return currentDistance < nearestDistance ? current : nearest;
    });
    return nearestElevator;
  }

  //Track Elevator Movement Here
  async moveElevator(elevatorNumber: number, targetFloor: number) {
    // Find the elevator to move based on elevatorNumber
    const elevator = this.elevators.find((e) => e.id === elevatorNumber);

    // Set the elevator as moving as it is important to prevent multiple simultaneous moves
    elevator!.isMoving = true;
    if (elevator) {
      // Determine direction based on target floor and move elevator floor by floor
      if (elevator.currentFloor! < targetFloor) {
        elevator.direction = Direction.Up;
        for (let floor = elevator.currentFloor! + 1; floor <= targetFloor; floor++) {
          await this.ProcessFloorActions(elevator, floor);
        }
      } else if (elevator.currentFloor! > targetFloor) {
        elevator.direction = Direction.Down;
        for (let floor = elevator.currentFloor! - 1; floor >= targetFloor; floor--) {
          await this.ProcessFloorActions(elevator, floor);
        }
      }

      // Once the elevator reaches the target floor, update its target floors list by removing the reached floor
      var updatedElevator = this.elevators.find((e) => e.id === elevatorNumber);
      updatedElevator!.targetFloors = updatedElevator!.targetFloors?.filter(
        (floor) => floor !== targetFloor
      );
      if (updatedElevator) {
        // Set direction to None when elevator reaches target
        if (updatedElevator.targetFloors?.length === 0) {
          updatedElevator.direction = Direction.Idle;
        } else {
          // Determine new direction based on remaining targets
          let floorNum = 0;
          if (updatedElevator.targetFloors && updatedElevator.targetFloors.length > 0) {
            // If there are still target floors (possibly added while moving), determine the next target based on current direction
            if (updatedElevator.direction === Direction.Up) {
              floorNum = Math.max(...updatedElevator.targetFloors);

              // if there are no more targets in the current direction, switch direction
              if (updatedElevator.currentFloor! > Math.max(...updatedElevator.targetFloors)) {
                updatedElevator.direction = Direction.Down;
                floorNum = Math.min(...updatedElevator.targetFloors);
              }
            } else {
              floorNum = Math.min(...updatedElevator.targetFloors);

              // if there are no more targets in the current direction, switch direction
              if (updatedElevator.currentFloor! < Math.min(...updatedElevator.targetFloors)) {
                updatedElevator.direction = Direction.Up;
                floorNum = Math.max(...updatedElevator.targetFloors);
              }
            }
            this.moveElevator(elevatorNumber, floorNum);
          }
        }
        elevator!.isMoving = false;
      }
    }
  }

  // Process actions at each floor during elevator movement either picking up or dropping off passengers
  async ProcessFloorActions(elevator: Elevator, floor: number) {
    // Update elevator's current floor
    elevator.currentFloor = floor;

    // Log the elevator's position
    this.actions.push(`Car ${elevator.id} is at floor ${elevator.currentFloor}`);
    // Check if elevator needs to drop off passengers at this floor
    if (elevator.passengerFloors && elevator.passengerFloors.includes(floor)) {
      // Simulate door open/close delay
      this.actions.push(
        `Car ${elevator.id} is dropping passengers at floor ${elevator.currentFloor}`
      );
      await this.delay(this.delaysBetweenFloors * 1000); // 2 seconds for doors to open/close

      // Remove floor from elevator's target list
      elevator.passengerFloors.splice(elevator.passengerFloors.indexOf(floor), 1);
    }

    // Check if there are any requests from this floor
    if (this.requestedFloors.includes(floor)) {
      // Simulate door open/close delay
      this.actions.push(
        `Car ${elevator.id} is getting passengers at floor ${elevator.currentFloor}`
      );
      await this.delay(this.delaysBetweenFloors * 1000);

      // Remove floor from requested floors list
      this.requestedFloors.splice(this.requestedFloors.indexOf(floor), 1); // Remove floor from requested list
    }

    // Update the data source to reflect the elevator's current position in the UI
    this.mapElevatorToDataSource(elevator);
    this.cdr.detectChanges(); // Trigger change detection
    await this.delay(this.delaysBetweenFloors * 1000); // 1 second delay between floors
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Update the data source to reflect the elevator's current position in the UI
  mapElevatorToDataSource(elevator: Elevator) {
    // Remove elevator from all floors first
    this.dataSource.data.forEach((f) => {
      const index = f.currentElevators?.indexOf(elevator.id);
      if (index !== undefined && index > -1) {
        f.currentElevators?.splice(index, 1);
      }
    });

    const floor = this.dataSource.data.find((f) => f.id === elevator.currentFloor);
    floor?.currentElevators?.push(elevator.id);
  }
}
