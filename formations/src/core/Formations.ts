import type { GameObj, PosComp, Vec2 } from "kaplay";
import "kaplay/global";

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
        const deltaFromLeader = vec2(this.radius * Math.cos(angleRad), -this.radius * Math.sin(angleRad));
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
            deltaFromLeader = vec2(halfSize, halfSize*(- Math.tan(angleRad)));

        // top right corner
        } else if (angle == 45) {
            deltaFromLeader = vec2(halfSize, -halfSize);

        // top side
        } else if (angle > 45 && angle <= 90) {
            deltaFromLeader = vec2(halfSize*(Math.tan((90-angle) * Math.PI / 180)), -halfSize);
        } else if (angle > 90 && angle < 135) {
            deltaFromLeader = vec2(-halfSize*(Math.tan((angle-90) * Math.PI / 180)), -halfSize);

        // top left corner
        } else if (angle == 135) {
            deltaFromLeader = vec2(-halfSize, -halfSize);
        
        // left side    
        } else if (angle > 135 && angle < 225) {
            deltaFromLeader = vec2(-halfSize, halfSize*(Math.tan(angleRad)))
        
        // bottom left corner
        } else if (angle == 225) {
            deltaFromLeader = vec2(-halfSize, halfSize);
        
        // bottom side
        } else if (angle > 225 && angle <= 270) {
            deltaFromLeader = vec2(-halfSize*(Math.tan((270-angle) * Math.PI / 180)), halfSize);
        } else if (angle > 270 && angle < 315) {
            deltaFromLeader = vec2(halfSize*(Math.tan((angle-270) * Math.PI / 180)), halfSize);
        
        // bottom right corner
        } else {
            deltaFromLeader = vec2(halfSize, halfSize);
        }
        return leaderPosition.add(deltaFromLeader);
    }

}

/**
 * Line formation with the leader in the middle.
 */
export class LineFormation implements Formation {

    readonly unitSpace: number;
    readonly groupSize: number;
    readonly middlePos: number;

    constructor(groupSize: number, unitSpace?: number) {
        this.unitSpace = unitSpace ?? 60;
        this.groupSize = groupSize;
        this.middlePos = groupSize / 2;
    }

    calculatePosition(leaderPosition: Vec2, unitId: number): Vec2 {
        const rightSide = this.middlePos > unitId;

        if (rightSide) {
            return leaderPosition.add(vec2(this.unitSpace * (1 + unitId), 0));
        } else {
            return leaderPosition.add(vec2(-this.unitSpace * (1 + (unitId - this.middlePos)), 0));
        }
    }
}

/**
 * Line formation with the leader in the middle, directed towards a target.
 */
export class DirectedLineFormation extends LineFormation {

    readonly target: GameObj<PosComp>;

    constructor(groupSize: number, target: GameObj<PosComp>, unitSpace?: number) {
        super(groupSize, unitSpace);
        this.target = target;
    }

    calculatePosition(leaderPosition: Vec2, unitId: number): Vec2 {
        // direction vector
        const leaderToTarget = this.target.pos.sub(leaderPosition);

        const formationNormal = leaderToTarget.normal().unit().scale(this.unitSpace);

        const rightSide = this.middlePos > unitId;

        if (rightSide) {
            return leaderPosition.add(formationNormal.scale(1 + unitId));
        } else {
            return leaderPosition.sub(formationNormal.scale(unitId - this.middlePos));
        }
    }
}

export class MultilineFormation implements Formation {
    
    readonly unitSpace: number;
    readonly groupSize: number;
    readonly target: GameObj<PosComp>;
    readonly unitsPerLine: number;
    readonly middlePos: number;

    constructor(groupSize: number, target: GameObj<PosComp>, unitSpace: number = 60, unitsPerLine: number = 3) {
        this.unitSpace = unitSpace;
        this.groupSize = groupSize;
        this.target = target;
        this.unitsPerLine = unitsPerLine;
        this.middlePos = Math.floor(unitsPerLine / 2.0);

        if (unitsPerLine < 2) {
            throw new Error("Units per line must be at least 2");
        }
    }

    calculatePosition(leaderPosition: Vec2, unitId: number): Vec2 {
        // the general vector formula for getting the position is:
        // P = LEADER -3xN -1 (1+ L_i)xL + P_ixN
        // where:
        // N = normal vector to the direction from the leader to the target, scaled by unit space
        // L = line vector in the direction from the leader to the target, scaled by unit space
        // L_i = line index (0 for the line closest to the leader, 1 for the second line, etc.)
        // P_i = position in line (0 for the leftmost unit, 1 for the second unit from the left, etc.)

        // direction vector
        const leaderToTarget = this.target.pos.sub(leaderPosition);

        const formationNormal = leaderToTarget.normal().unit().scale(this.unitSpace);
        const lineVector = leaderToTarget.unit().scale(this.unitSpace);

        const lineIndex = Math.floor(unitId / this.unitsPerLine);
        const positionInLine = unitId % this.unitsPerLine;

        const shiftVector = 
            // from the leader to the left side of the line = start of the line
            formationNormal.scale(-1 * this.middlePos)
            
            // shift by line index
            .add(lineVector.scale(-1 * (1+lineIndex)))
            
            // shift by position in line
            .add(formationNormal.scale(positionInLine));

        console.log("Unit id: "+unitId+", line index: "+lineIndex+", position in line: "+positionInLine+", shift vector: "+shiftVector);

        return leaderPosition.add(shiftVector);
    }
}

/**
 * Wedge formation with the leader in the front.
 */
export class WedgeFormation implements Formation {
    readonly unitSpace: number;
    readonly groupSize: number
    readonly target: GameObj<PosComp>;

    constructor(groupSize: number, target: GameObj<PosComp>, unitSpace: number = 60) {
        this.unitSpace = unitSpace;
        this.groupSize = groupSize;
        this.target = target;
    }

    calculatePosition(leaderPosition: Vec2, unitId: number): Vec2 {
        const leaderToTarget = this.target.pos.sub(leaderPosition);

        const formationNormal = leaderToTarget.normal().unit().scale(this.unitSpace);
        const lineVector = leaderToTarget.unit().scale(this.unitSpace);

        const lineIndex = Math.floor(unitId / 2) + 1;
        const side = unitId % 2 === 0 ? -1 : 1;

        const shiftVector = 
            // from the leader to the correct line
            lineVector.scale(-1 * lineIndex)

            // left or right side of the wedge
            .add(formationNormal.scale(side * lineIndex));

        return leaderPosition.add(shiftVector);
    }
}
