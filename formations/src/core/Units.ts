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
        require: ["pos"],
        speed: speed,
        update(this: GameObj<MovementComp | StateComp>) {
            if (this.targetPos) {
                const targetPos = this.targetPos;
                const targetReached = this.moveUnitTo(targetPos, this.speed);
                if (targetReached) {
                    this.targetPos = null;
                    this.enterState("idle");
                }
            }
        },
        moveUnitTo(this: GameObj<PosComp | StateComp | SpriteComp>, position: Vec2, speed?: number) {
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
    faceTowardsTo: GameObj<PosComp | StateComp> | null;
}

export function faceTowardsTarget(target?: GameObj<PosComp | StateComp>): FaceTowardsTargetComp {
    return {
        id: "faceTowardsTarget",
        faceTowardsTo: target ?? null,
        update(this: GameObj<FaceTowardsTargetComp | SpriteComp | PosComp>) {
            if (this.faceTowardsTo) {
                const targetPos = this.faceTowardsTo.pos;
                if (targetPos.x > this.pos.x) {
                    this.flipX = false;
                } else {
                    this.flipX = true;
                } 
            }
        }
    }
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
    leader: GameObj<PosComp>;

    /**
     * Old leader position, used for delayed following.
     */
    oldLeaderPosition?: Vec2;
}

export function lancer(unitId: number, leader: GameObj<PosComp>): LancerComp {
    const newLancer: LancerComp = {
        id: "lancer",
        require: ["pos", "state"],
        unitId: unitId, 
        leader: leader,
        update(this: GameObj<PosComp | MovementComp | StateComp | LancerComp>) {
            // keep track of your leader
            const leaderPosition = this.leader.pos;

            if (this.oldLeaderPosition == null || this.oldLeaderPosition.dist(leaderPosition) > 30) {
                this.oldLeaderPosition = leaderPosition;
            }

            // handle formation
            if (this.formation) {
                const targetPos = this.formation.calculatePosition(this.oldLeaderPosition, unitId);
                
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
    unitSpeed: number = UNIT_SPEED, 
    states = ["idle", "move"])
    : GameObj<PosComp | MovementComp | SpriteComp | StateComp | FaceTowardsTargetComp>
    {

    const newUnit = add([position, 
        sprite(spriteName, 
            {anim: "idle", speed: unitSpeed, flipX: flipX},
        ),
        scale(unitScale), 
        area(),
        faceTowardsTarget(),
        anchor("center"),
        state("idle", states),
        movement(unitSpeed),
        UNIT_TAG
    ]);

    // add center point to each unit
    // for debug purposes
    if (UNIT_DEBUG_POINT) {
        newUnit.add([pos(0,0), circle(10), color(Color.RED)]);
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
    : GameObj<PosComp | MovementComp | SpriteComp | StateComp | FaceTowardsTargetComp> {
    const l = spawnUnit(position, spriteName, flipX, LEADER_SCALE, LEADER_SPEED);

    return l;
}

export function spawnLancer(position: PosComp, unitId: number, leader: GameObj<PosComp>)
    : GameObj<PosComp | MovementComp | SpriteComp | StateComp | LancerComp | FaceTowardsTargetComp> {
        const newLancer = spawnUnit(position, "blue_lancer", false, DEFAULT_SPRITE_SCALE);
        newLancer.use(lancer(unitId, leader))
        newLancer.use(formation())
        
        if (UNIT_DEBUG_POINT) {
            newLancer.add([pos(0,0), text(unitId), color(Color.GREEN)]);
        }

        return newLancer;
}