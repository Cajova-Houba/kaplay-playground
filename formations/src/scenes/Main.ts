import {k, PLAYABLE_WIDTH, PLAYABLE_HEIGHT, SIDE_PANEL_WIDTH} from "../App.ts";
import { CircleFormation, DirectedLineFormation, SquareFormation } from "../core/Formations.ts";
import { spawnLeader, spawnLancer, LEADER_TAG, ENEMY_TAG, LancerComp, FormationComp } from "../core/Units.ts";
import type { GameObj, StateComp } from "kaplay";

// units in the group, not counting the leader
const GROUP_SIZE = 9;

const LEADER_SPRITE_WIDTH = 12*16;

class SelectedUnit {
    unit: GameObj;
    outline: GameObj;
    selectedAt: number;

    constructor(unit: GameObj, outline: GameObj) {
        this.unit = unit;
        this.outline = outline;
        this.selectedAt = time();
    }
}

let selectedUnit: SelectedUnit | null = null;

export function createMainScene() {
    k.scene("main", () => {
    // init yard background
    // yard = that's where the formations happen
    add([k.pos(0,0), k.sprite("grass", {width: PLAYABLE_WIDTH, height: PLAYABLE_HEIGHT, tiled: true})]);

    // spawn enemy
    const enemy = spawnLeader(k.pos(PLAYABLE_WIDTH - 10, PLAYABLE_HEIGHT/2.0), "red_warrior", true);
    enemy.tag([LEADER_TAG, ENEMY_TAG]);

    // group
    const group: GameObj<LancerComp | FormationComp | StateComp>[] = [];

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
    add([k.pos(k.width() - SIDE_PANEL_WIDTH + 6, 30), k.sprite("big_ribbon_red_start", {width: 62, height: 60, tiled: false}), area()]);
    add([k.pos(k.width() - SIDE_PANEL_WIDTH + 5 + 62, 30), k.sprite("big_ribbon_red", {width: 124, height: 60, tiled: true}), area()]);
    add([k.pos(k.width() - SIDE_PANEL_WIDTH + 5 + 62 + 124, 30), k.sprite("big_ribbon_red_end", {width: 62, height: 60, tiled: false}), area()]);
    const cacncelFormationBtn = add([k.pos(k.width() - SIDE_PANEL_WIDTH + 55, 50), area({shape: new Rect(vec2(0,0), 248, 62), offset: vec2(-30, -25)}), text("Cancel formation", {size: 16}), "cancelFormationButton"]); 
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
    onClick(LEADER_TAG, (unit: GameObj) => {
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
            selectedUnit = new SelectedUnit(unit, outlineObj);
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