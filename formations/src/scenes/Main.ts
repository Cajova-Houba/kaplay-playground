import {k, PLAYABLE_WIDTH, PLAYABLE_HEIGHT, UNIT_DEBUG_POINT, SIDE_PANEL_WIDTH} from "../App.ts";

import { CircleFormation, DirectedLineFormation, SquareFormation } from "../core/Formations.ts";
import { lancer, unit, UNIT_TAG, LEADER_TAG, ENEMY_TAG } from "../core/Units.ts";

const UNIT_SPEED = 100;
const LEADER_SPEED = UNIT_SPEED + 20;

// units in the group, not counting the leader
const GROUP_SIZE = 9;

const LEADER_SCALE = 0.8;
const SPRITE_SCALE = 0.75;
const LEADER_SPRITE_WIDTH = 12*16;
const LANCER_SPRITE_WIDTH = 320;

let selectedUnit = null;

export function createMainScene() {
    k.scene("main", () => {
    // init yard background
    // yard = that's where the formations happen
    add([k.pos(0,0), k.sprite("grass", {width: PLAYABLE_WIDTH, height: PLAYABLE_HEIGHT, tiled: true})]);

    // unit spawning functions
    const spawnUnit = (pos, spriteName, flipX = false, unitScale = SPRITE_SCALE, spriteWidth = LEADER_SPRITE_WIDTH, spriteHeight = LEADER_SPRITE_WIDTH, unitSpeed = UNIT_SPEED, states = ["idle", "move"]) => {

        // we expect the pos to be the center point 
        // but we need to adjust it to the top left corner
        // in order for it to be compatible with the 
        // Kaplay API
        const adjustVector = new Vec2(spriteWidth/2.0, spriteHeight/2.0);
        const adjustedPos = pos.pos.sub(adjustVector);

        const newUnit = add([k.pos(adjustedPos), 
            k.sprite(spriteName, 
                {anim: "idle", speed: unitSpeed, flipX: flipX},
            ),
            scale(unitScale), 
            k.area(),
            unit(adjustVector, adjustVector.scale(unitScale)),
            state("idle", states),
            UNIT_TAG
        ]);

        // add center point to each unit
        // for debug purposes
        if (UNIT_DEBUG_POINT) {
            const center = k.pos(0,0).pos.add(newUnit.adjustVector);
            newUnit.add([k.pos(center), circle(10), color(Color.RED)]);
        }

        newUnit.onStateEnter("idle", () => {
            newUnit.play("idle")
        })
        newUnit.onStateEnter("move", () => {
            newUnit.play("move");
        });
        return newUnit;
    }

    const spawnLeader = (pos, spriteName, flipX = false) => {
        const l = spawnUnit(pos, spriteName, flipX, LEADER_SCALE, LEADER_SPRITE_WIDTH, LEADER_SPRITE_WIDTH, LEADER_SPEED);

        l.onUpdate(() => {
            if (l.targetPos) {
                const targetPos = l.targetPos;
                const targetReached = l.moveUnitTo(targetPos, LEADER_SPEED);
                if (targetReached) {
                    l.targetPos = null;
                    l.enterState("idle");
                }
            }
        });
        l.targetPos = null;

        return l;
    }

    const spawnLancer = (pos, unitId, leader) => {
        const newLancer = spawnUnit(pos, "blue_lancer", false, SPRITE_SCALE, LANCER_SPRITE_WIDTH, LANCER_SPRITE_WIDTH);
        newLancer.use(lancer(unitId, leader))
        
        if (UNIT_DEBUG_POINT) {
            newLancer.add([k.pos(newLancer.adjustVector), text(unitId), color(Color.GREEN)]);
        }

        return newLancer;
    }

    // spawn enemy
    const enemy = spawnLeader(k.pos(PLAYABLE_WIDTH - 10, PLAYABLE_HEIGHT/2.0), "red_warrior", true);
    enemy.tag([LEADER_TAG, ENEMY_TAG]);

    // group
    const group = [];
    // group leader
    const leader = spawnLeader(k.pos(300,300), "blue_warrior");
    leader.tag(LEADER_TAG);

    // spawn units
    for(let i = 0; i < GROUP_SIZE; i++) {
        const p = rand(vec2(PLAYABLE_WIDTH+20, height()));
        const unit = spawnLancer(k.pos(p), i, leader);
        group.push(unit);
    }
    
    
    // controls
    const cacncelFormationBtn = add([k.pos(k.width() - SIDE_PANEL_WIDTH + 10, 50), area(), text("Cancel formation", {size: 16}), "cancelFormationButton"]); 
    cacncelFormationBtn.onClick(() => {
        group.forEach(unit => {
            unit.formation = null;
            unit.enterState("idle");
        });
    })
    const circleFormationBtn = add([k.pos(k.width() - SIDE_PANEL_WIDTH + 10, 100), area(), text("Circle formation", {size: 16}), "circleFormationButton"]);
    circleFormationBtn.onClick(() => {
        const circleFormation = new CircleFormation(GROUP_SIZE);
        group.forEach(unit => {
            unit.formation = circleFormation;
        });


        // debugging
        // const start = leader.pos.add(leader.adjustVector);
        // const start = leader.pos;
        // const start = leader.pos.add(leader.adjustVector.scale(SPRITE_SCALE));
        // const start = leader.getCenter()

        // add([k.pos(start), circle(10), color(Color.BLACK)]);

        // for (let index = 0; index < group.length; index++) {
        //     const target = CIRCLE_FORMATION.calculatePosition(start, index);
        //     debug.log(start, target);
        //     add([k.pos(target), circle(10), color(Color.BLACK)]);
        // }
    });

    const squareFormationBtn = add([k.pos(k.width() - SIDE_PANEL_WIDTH + 10, 150), area(), text("Square formation", {size: 16}), "squareFormationBtn"]);
    squareFormationBtn.onClick(() => {
        const formation = new SquareFormation(GROUP_SIZE);
        group.forEach(unit => {
            unit.formation = formation;
        });
    });

    const lineFormationBtn = add([k.pos(k.width() - SIDE_PANEL_WIDTH + 10, 200), area(), text("Line formation", {size: 16}), "lineFormationBtn"]);
    lineFormationBtn.onClick(() => {
        const formation = new DirectedLineFormation(GROUP_SIZE, enemy);
        group.forEach(unit => {
            unit.formation = formation;
        });
    });


    // handle events
    onClick(LEADER_TAG, (unit) => {
        if (selectedUnit != null) {
            k.destroy(selectedUnit.outline);
        } else {
            const p = unit.c("pos").pos;

            debug.log("Selecting unit "+unit);

            const outlineObj = k.add([
                k.pos(p.x + LEADER_SPRITE_WIDTH/2.8, p.y + LEADER_SPRITE_WIDTH/2.8),
                circle(LEADER_SPRITE_WIDTH/3.0, {fill: false}), 
                outline(3, Color.YELLOW)
            ]);
            const currTime = time();
            selectedUnit = {
                unit: unit,
                outline: outlineObj,
                selectedAt: currTime
            }
        }
    });

    // Run when user clicks
    onMousePress(() => {
        const pos = k.mousePos()

        debug.log(pos);
        
        // if the time is not here
        // the movement would be executed in the same frame as the selection
        // meaning 1) the player would not see the selection outline
        // and 2) the mous position indicating the movement target
        // would be on the selected unit
        debug.log(time());
        if (selectedUnit != null && pos.x <= PLAYABLE_WIDTH && Math.abs(time() - selectedUnit.selectedAt) > 0.01) {
            debug.log(selectedUnit.unit.scaledAdjustVector);
            selectedUnit.unit.targetPos = pos.sub(selectedUnit.unit.scaledAdjustVector);
            k.destroy(selectedUnit.outline);
            selectedUnit = null;
        }
    });
})
}