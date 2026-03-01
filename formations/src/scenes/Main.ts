import {k, PLAYABLE_WIDTH, PLAYABLE_HEIGHT, SIDE_PANEL_WIDTH} from "../App.ts";
import { CircleFormation, DirectedLineFormation, MultilineFormation, SquareFormation } from "../core/Formations.ts";
import { spawnLeader, spawnLancer, LEADER_TAG, ENEMY_TAG, LancerComp, FormationComp, UnitComp } from "../core/Units.ts";
import type { GameObj, StateComp } from "kaplay";
import { createBlueButton, createRedButton } from "../ui/Ui.ts";

// units in the group, not counting the leader
const GROUP_SIZE = 9;

const LEADER_SPRITE_WIDTH = 12*16;

class SelectedUnit {
    unit: GameObj<UnitComp>;
    outline: GameObj;
    selectedAt: number;

    constructor(unit: GameObj<UnitComp>, outline: GameObj) {
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
    leader.faceTowardsTo = enemy;
    leader.tag(LEADER_TAG);

    // make bothe leaders face each other
    enemy.faceTowardsTo = leader;

    // spawn units
    for(let i = 0; i < GROUP_SIZE; i++) {
        const p = rand(vec2(PLAYABLE_WIDTH+20, height()));
        const unit = spawnLancer(k.pos(p), i, leader);
        unit.faceTowardsTo = enemy;
        group.push(unit);
    }
    
    
    // controls
    createRedButton(k.width() - SIDE_PANEL_WIDTH + 5, 30, 50, 20, "Cancel formation", () => {
        group.forEach(unit => {
            unit.formation = null;
            unit.enterState("idle");
        });
    });

    createBlueButton(k.width() - SIDE_PANEL_WIDTH + 5, 100, 50, 20, "Circle formation", () => {
        const circleFormation = new CircleFormation(GROUP_SIZE);
        group.forEach(unit => {
            unit.formation = circleFormation;
        });
    });
    createBlueButton(k.width() - SIDE_PANEL_WIDTH + 5, 170, 50, 20, "Square formation", () => {
        const formation = new SquareFormation(GROUP_SIZE);
        group.forEach(unit => {
            unit.formation = formation;
        });
    });
    createBlueButton(k.width() - SIDE_PANEL_WIDTH + 5, 240, 60, 20, "Line formation", () => {
        const formation = new DirectedLineFormation(GROUP_SIZE, enemy);
        group.forEach(unit => {
            unit.formation = formation;
        });
    });
    createBlueButton(k.width() - SIDE_PANEL_WIDTH + 5, 310, 60, 20, "3 Line formation", () => {
        const formation = new MultilineFormation(GROUP_SIZE, enemy, 60, 3);
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