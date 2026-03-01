import { UNIT_DEBUG_POINT } from "../App";
import type { Comp, GameObj, PosComp, SpriteComp, StateComp, Vec2 } from "kaplay";
import { Formation } from "./Formations";
import "kaplay/global";

export const DEFAULT_SPRITE_SCALE = 0.75;

export const UNIT_SPEED = 100;
export const LEADER_SPEED = UNIT_SPEED + 20;

export const UNIT_TAG = "unit";
export const LEADER_TAG = "leader";
export const ENEMY_TAG = "enemy";

const LEADER_SPRITE_WIDTH = 12*16;
const LANCER_SPRITE_WIDTH = 320;
const LEADER_SCALE = 0.8;

export interface FormationComp extends Comp {
    formation?: Formation | null;
}

export function formation(): FormationComp {
    return {
        id: "formation"
    }
}

export interface MovementComp extends Comp {
    speed: number;
    targetPos?: Vec2 | null;
    moveUnitTo(position: Vec2, speed?: number): boolean;
}

export function movement(speed: number): MovementComp {
    return {
        id: "movement",
        require: ["pos", "unit"],
        speed: speed,
        update(this: GameObj<MovementComp | StateComp | UnitComp>) {
            if (this.targetPos) {
                const targetPos = this.targetPos;
                const targetReached = this.moveUnitTo(targetPos, this.speed);
                if (targetReached) {
                    this.targetPos = null;
                    this.enterState("idle");
                }
            }
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

    }
}

/**
 * Face towards an enemy.
 */
export interface FaceTowardsTargetComp extends Comp {
    faceTowardsTo: GameObj<PosComp | UnitComp | StateComp> | null;
}

export function faceTowardsTarget(target?: GameObj<PosComp | UnitComp | StateComp>): FaceTowardsTargetComp {
    return {
        id: "faceTowardsTarget",
        faceTowardsTo: target ?? null,
        update(this: GameObj<FaceTowardsTargetComp | SpriteComp | PosComp | UnitComp>) {
            if (this.faceTowardsTo) {
                const targetPos = this.faceTowardsTo.getCenter();
                if (targetPos.x > this.getCenter().x) {
                    this.flipX = false;
                } else {
                    this.flipX = true;
                } 
            }
        }
    }
}

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
        update(this: GameObj<PosComp | MovementComp | StateComp | UnitComp | LancerComp>) {
            // keep track of your leader
            const leaderPosition = this.leader.getCenter();

            if (this.oldLeaderPosition == null || this.oldLeaderPosition.dist(leaderPosition) > 30) {
                this.oldLeaderPosition = leaderPosition;
            }

            // handle formation
            if (this.formation) {
                const targetPos = this.formation.calculatePosition(this.oldLeaderPosition, unitId).sub(this.scaledAdjustVector);
                
                if (targetPos.dist(this.pos) > 5)  {
                    const targetReached = this.moveUnitTo(targetPos);
                    if (targetReached && this.state != "idle") {
                        this.enterState("idle");
                    }
                } else if (this.state != "idle") {
                    this.enterState("idle");
                }
                
            }
        }
    };

    return newLancer;
}

export function spawnUnit(position: PosComp, 
    spriteName: string, 
    flipX: boolean = false, 
    unitScale: number = DEFAULT_SPRITE_SCALE, 
    spriteWidth: number = LEADER_SPRITE_WIDTH, 
    spriteHeight: number = LEADER_SPRITE_WIDTH, 
    unitSpeed: number = UNIT_SPEED, 
    states = ["idle", "move"])
    : GameObj<PosComp | MovementComp | SpriteComp | StateComp | UnitComp | FaceTowardsTargetComp>
    {
    // we expect the pos to be the center point 
    // but we need to adjust it to the top left corner
    // in order for it to be compatible with the 
    // Kaplay API
    const adjustVector = vec2(spriteWidth/2.0, spriteHeight/2.0);
    const adjustedPos = position.pos.sub(adjustVector);

    const newUnit = add([pos(adjustedPos), 
        sprite(spriteName, 
            {anim: "idle", speed: unitSpeed, flipX: flipX},
        ),
        scale(unitScale), 
        area(),
        faceTowardsTarget(),
        unit(adjustVector, adjustVector.scale(unitScale)),
        state("idle", states),
        movement(unitSpeed),
        UNIT_TAG
    ]);

    // add center point to each unit
    // for debug purposes
    if (UNIT_DEBUG_POINT) {
        const center = pos(0,0).pos.add(newUnit.adjustVector);
        newUnit.add([pos(center), circle(10), color(Color.RED)]);
    }

    newUnit.onStateEnter("idle", () => {
        newUnit.play("idle")
    })
    newUnit.onStateEnter("move", () => {
        newUnit.play("move");
    });
    return newUnit;
}

export function spawnLeader(position: PosComp,  spriteName: string, flipX: boolean = false)
    : GameObj<PosComp | MovementComp | SpriteComp | StateComp | UnitComp | FaceTowardsTargetComp> {
    const l = spawnUnit(position, spriteName, flipX, LEADER_SCALE, LEADER_SPRITE_WIDTH, LEADER_SPRITE_WIDTH, LEADER_SPEED);

    return l;
}

export function spawnLancer(position: PosComp, unitId: number, leader: GameObj<PosComp | StateComp | UnitComp>)
    : GameObj<PosComp | MovementComp | SpriteComp | StateComp | UnitComp | LancerComp | FaceTowardsTargetComp> {
        const newLancer = spawnUnit(position, "blue_lancer", false, DEFAULT_SPRITE_SCALE, LANCER_SPRITE_WIDTH, LANCER_SPRITE_WIDTH);
        newLancer.use(lancer(unitId, leader))
        newLancer.use(formation())
        
        if (UNIT_DEBUG_POINT) {
            newLancer.add([pos(newLancer.adjustVector), text(unitId), color(Color.GREEN)]);
        }

        return newLancer;
}