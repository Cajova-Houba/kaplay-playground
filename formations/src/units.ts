import type { Comp, GameObj, PosComp, SpriteComp, StateComp, Vec2 } from "kaplay";
import { Formation } from "./formations";

export const UNIT_TAG = "unit";
export const UNIT_SPEED = 100;


/**
 * Unit component. Requires the following comps: pos, sprite, state.
 */
export interface UnitComp extends Comp {

    /**
     * Unscaled vector from the object's position (=its top left corner) to its center. 
     */
    adjustVector: Vec2;

    /**
     * Scaled adjuctVector.
     */
    scaledAdjustVector: Vec2;

    /**
     * Returns the center of this unit (using its position and scaledAdjustVector).
     */
    getCenter(): Vec2;

    moveUnitTo(position: Vec2, speed?: number): boolean;
}

export function unit(adjustVector: Vec2, scaledAdjustVector: Vec2): UnitComp {
    const newUnit = {
        id: "unit",
        require: ["state", "sprite", "area", "pos"],
        adjustVector: adjustVector,
        scaledAdjustVector: scaledAdjustVector,
        getCenter(this: GameObj<PosComp | UnitComp>) {
            return this.pos.add(this.scaledAdjustVector);
        },
        moveUnitTo(this: GameObj<PosComp | StateComp | SpriteComp | UnitComp>, position: Vec2, speed?: number) {
            if (this.state == "idle") {
                this.enterState("move");
            }

            const moveSpeed = speed ?? UNIT_SPEED;

            this.moveTo(position, moveSpeed);

            const currentPos = this.pos;

            if (position.x > currentPos.x) {
                this.flipX = false;
            } else {
                this.flipX = true;
            }

            // check if the target was reached
            return position.dist(currentPos) < 10;
        }

    };

    return newUnit;
}

export interface LancerComp extends Comp {

    /**
     * Unique id of this unit, sequential, starting from 0.
     */
    unitId: number;

    /**
     * What formation are we having right now.
     */
    formation?: Formation;

    /**
     * Leader of this lancer, used especially for its position.
     */
    leader: GameObj<PosComp | UnitComp>;

    /**
     * Old leader position, used for delayed following.
     */
    oldLeaderPosition?: Vec2;
}

export function lancer(unitId: number, leader: GameObj<PosComp | UnitComp>): LancerComp {
    const newLancer: LancerComp = {
        id: "lancer",
        require: ["unit"],
        unitId: unitId, 
        leader: leader,
        update(this: GameObj<PosComp | StateComp | UnitComp | LancerComp>) {
            // keep track of your leader
            const leaderPosition = this.leader.getCenter();

            if (this.oldLeaderPosition == null || this.oldLeaderPosition.dist(leaderPosition) > 30) {
                this.oldLeaderPosition = leaderPosition;
            }

            // handle formation
            if (this.formation) {
                const targetPos = this.formation.calculatePosition(this.oldLeaderPosition, unitId).sub(this.scaledAdjustVector);
                
                if (targetPos.dist(this.pos) > 10)  {
                    const targetReached = this.moveUnitTo(targetPos);
                    // debug.log(lancer.state);
                    if (targetReached && this.state != "idle") {
                        this.enterState("idle");
                        // lancer.formation = null;
                    }
                } else if (this.state != "idle") {
                    this.enterState("idle");
                }
                
            }
        }
    };

    return newLancer;
}