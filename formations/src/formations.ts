import type { Vec2 } from "kaplay";
import kaplay from "kaplay";
const k = kaplay({ global: false });

export interface Formation {
    /**
     * Calculates the position of a unit given by its id in a formation.
     * 
     * @param leaderPosition Position of the leader of the formation.
     * @param unitId Id of the unit to calculate the position of.
     */
    calculatePosition(leaderPosition: Vec2, unitId: number): Vec2;
}

/**
 * Circle formation around the leader.
 */
export class CircleFormation implements Formation {
    
    readonly radius: number;
    readonly groupSize: number;

    constructor(groupSize: number) {
        this.radius = 100;
        this.groupSize = groupSize;
    }

    calculatePosition(leaderPosition: Vec2, unitId: number): Vec2 {
        const angleRad = (unitId * 360 / this.groupSize) * Math.PI / 180;
        const deltaFromLeader = k.vec2(this.radius * Math.cos(angleRad), this.radius * Math.sin(angleRad));
        return leaderPosition.add(deltaFromLeader);
    }
}

/**
 * Square formation around the leader.
 */
export class SquareFormation implements Formation {

    /**
     * Size of a one side of the square.
     */
    readonly size: number;
    readonly groupSize: number;

    constructor(groupSize: number) {
        this.size = 200;
        this.groupSize = groupSize;
    }

    calculatePosition(leaderPosition: Vec2, unitId: number): Vec2 {
        const angle = (unitId * 360 / this.groupSize);
        const angleRad = angle * Math.PI / 180;
        // for top and bottom sides, tan goes to the infinity otherwise
        const backShiftAngleRad = (angle - 90) * Math.PI / 180;
        const forwradShiftAngleRad = (angle + 90) * Math.PI / 180;
        const halfSize = this.size / 2.0;
        let deltaFromLeader;

        // right side
        if (angle < 45 || angle > 315) {
            deltaFromLeader = k.vec2(halfSize, halfSize*(- Math.tan(angleRad)));

        // top right corner
        } else if (angle == 45) {
            deltaFromLeader = k.vec2(halfSize, -halfSize);

        // top side
        } else if (angle > 45 && angle <= 90) {
            deltaFromLeader = k.vec2(halfSize*(Math.tan((90-angle) * Math.PI / 180)), -halfSize);
        } else if (angle > 90 && angle < 135) {
            deltaFromLeader = k.vec2(-halfSize*(Math.tan((angle-90) * Math.PI / 180)), -halfSize);

        // top left corner
        } else if (angle == 135) {
            deltaFromLeader = k.vec2(-halfSize, -halfSize);
        
        // left side    
        } else if (angle > 135 && angle < 225) {
            deltaFromLeader = k.vec2(-halfSize, halfSize*(Math.tan(angleRad)))
        
        // bottom left corner
        } else if (angle == 225) {
            deltaFromLeader = k.vec2(-halfSize, halfSize);
        
        // bottom side
        } else if (angle > 225 && angle <= 270) {
            deltaFromLeader = k.vec2(-halfSize*(Math.tan((270-angle) * Math.PI / 180)), halfSize);
        } else if (angle > 270 && angle < 315) {
            deltaFromLeader = k.vec2(halfSize*(Math.tan((angle-270) * Math.PI / 180)), halfSize);
        
        // bottom right corner
        } else {
            deltaFromLeader = k.vec2(halfSize, halfSize);
        }
        return leaderPosition.add(deltaFromLeader);
    }

}