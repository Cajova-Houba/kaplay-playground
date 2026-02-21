import kaplay from "kaplay";
import { selectable } from "./selectable.ts"
// import "kaplay/global"; // uncomment if you want to use without the k. prefix

const UNIT_DEBUG_POINT = false;

const UNIT_TAG = "unit";
const LEADER_TAG = "leader";
const ENEMY_TAG = "enemy";

// units in the group, not counting the leader
const GROUP_SIZE = 9;

const SPRITE_SCALE = 0.75;
const LEADER_SPRITE_WIDTH = 12*16;
const LANCER_SPRITE_WIDTH = 320;

const UNIT_SPEED = 100;

const PLAYABLE_WIDTH = 640;
const SIDE_PANEL_WIDTH = 200;
const PLAYABLE_HEIGHT = 640;

const k = kaplay(
    {
        background: "#4488AA",
        width: PLAYABLE_WIDTH + SIDE_PANEL_WIDTH,
        height: PLAYABLE_HEIGHT,
    }
);

let selectedUnit = null;

k.loadRoot("./"); // A good idea for Itch.io publishing later

// load terrain sprites
k.loadSpriteAtlas("sprites/terrain/Tilemap_color2.png", {
    "grass": {
        x: 32,
        y: 16,
        width: 8*16,
        height: 9*16
    }
});

// formation configuration
const CIRCLE_FORMATION = {
    radius: 100,
    calculatePosition: (leaderPosition, myId) => {
        const angleRad = (myId * 360 / GROUP_SIZE) * Math.PI / 180;
        const deltaFromLeader = new Vec2(CIRCLE_FORMATION.radius * Math.cos(angleRad), CIRCLE_FORMATION.radius * Math.sin(angleRad));
        return leaderPosition.add(deltaFromLeader);
    }
};

function moveUnitTo(unit, position) {
    if (unit.state == "idle") {
        unit.enterState("move");
    }

    unit.moveTo(position, UNIT_SPEED);

    const currentPos = unit.c("pos").pos;

    if (position.x > currentPos.x) {
        unit.c("sprite").flipX = false;
    } else {
        unit.c("sprite").flipX = true;
    }

    // check if the target was reached
    return position.dist(currentPos) < 1;
}


// load unit sprites
k.loadSpriteAtlas("sprites/blue/Warrior/Warrior_Spriteset.png", {
    "blue_warrior": {
        x: 0,
        y: 0,
        width: 1536,
        height: 384,
        sliceX: 8,
        sliceY: 2,
        anims: {
            idle: {from: 0, to: 7, loop: true},
            move: {from: 8, to: 13, loop: true}
        }
   } 
});
k.loadSpriteAtlas("sprites/red/Warrior/Warrior_Spriteset.png", {
    "red_warrior": {
        x: 0,
        y: 0,
        width: 1536,
        height: 384,
        sliceX: 8,
        sliceY: 2,
        anims: {
            idle: {from: 0, to: 7, loop: true},
            move: {from: 8, to: 13, loop: true}
        }
   } 
});
k.loadSprite("blue_lancer","sprites/blue/Lancer/Lancer_Spriteset.png", {
        x: 0,
        y: 0,
        width: 3840,
        height: 640,
        sliceX: 12,
        sliceY: 2,
        anims: {
            idle: {from: 0, to: 11, loop: true},
            move: {from: 12, to: 17, loop: true}
        }
   } 
);

k.scene("main", () => {
    // init yard background
    // yard = that's where the formations happen
    add([k.pos(0,0), k.sprite("grass", {width: PLAYABLE_WIDTH, height: PLAYABLE_HEIGHT, tiled: true})]);

    // unit spawning functions
    const spawnUnit = (pos, spriteName, flipX = false, unitScale = SPRITE_SCALE, states = ["idle", "move"], spriteWidth = LEADER_SPRITE_WIDTH, spriteHeight = LEADER_SPRITE_WIDTH) => {

        // we expect the pos to be the center point 
        // but we need to adjust it to the top left corner
        // in order for it to be compatible with the 
        // Kaplay API
        const adjustVector = new Vec2(spriteWidth/2.0, spriteHeight/2.0);
        const adjustedPos = pos.pos.sub(adjustVector);

        const unit = add([k.pos(adjustedPos), 
            k.sprite(spriteName, 
                {anim: "idle", speed: UNIT_SPEED, flipX: flipX},
            ),
            scale(unitScale), 
            k.area(),
            state("idle", states),
            UNIT_TAG
        ]);
        unit.adjustVector = adjustVector;
        unit.scaledAdjustVector = adjustVector.scale(unitScale);
        unit.getCenter = () => {
            return unit.pos.add(unit.adjustVector.scale(unitScale));
        }

        // add center point to each unit
        // for debug purposes
        if (UNIT_DEBUG_POINT) {
            unit.center = k.pos(0,0).pos.add(adjustVector);
            unit.add([k.pos(unit.center), circle(10), color(Color.RED)]);
        }

        unit.onStateEnter("idle", () => {
            unit.play("idle")
        })
        unit.onStateEnter("move", () => {
            unit.play("move");
        });
        return unit;
    }

    const spawnLeader = (pos, spriteName, flipX = false) => {
        const l = spawnUnit(pos, spriteName, flipX, SPRITE_SCALE);

        l.onUpdate(() => {
            if (l.targetPos) {
                const targetPos = l.targetPos;
                const targetReached = moveUnitTo(l, targetPos);
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
        const lancer = spawnUnit(pos, "blue_lancer", false, SPRITE_SCALE, ["idle", "move", "randomMove"], LANCER_SPRITE_WIDTH, LANCER_SPRITE_WIDTH);
        lancer.unitId = unitId;
        lancer.leader = leader;
        
        lancer.onUpdate(() => {
            if (lancer.formation) {
                const targetPos = lancer.formation.calculatePosition(leader.getCenter(), unitId).sub(lancer.scaledAdjustVector);

                const targetReached = moveUnitTo(lancer, targetPos);
                if (targetReached) {
                    lancer.enterState("idle");
                    lancer.formation = null;
                }
            }
        });

        return lancer;
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
    const circleFormationBtn = add([k.pos(k.width() - SIDE_PANEL_WIDTH + 10, 50), area(), text("Circle formation", {size: 16}), "circleFormationButton"]);
    circleFormationBtn.onClick(() => {
        group.forEach(unit => {
            unit.formation = CIRCLE_FORMATION;
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

    const lineFormationBtn = add([k.pos(k.width() - SIDE_PANEL_WIDTH + 10, 100), area(), text("Line formation", {size: 16}), "speedUpgradeButton"]);
    lineFormationBtn.onClick(() => {

    });


    // handle events
    onClick(LEADER_TAG, (unit) => {
        if (selectedUnit != null) {
            k.destroy(selectedUnit.outline);
        }

        const p = unit.c("pos").pos;

        debug.log("Selecting unit "+unit);

        const outlineObj = k.add([
            k.pos(p.x + LEADER_SPRITE_WIDTH/2.8, p.y + LEADER_SPRITE_WIDTH/2.8),
            circle(LEADER_SPRITE_WIDTH/3.0, {fill: false}), 
            outline(3, Color.YELLOW)
        ]);
        const currDt = dt();
        selectedUnit = {
            unit: unit,
            outline: outlineObj,
            dt: currDt
        }
    });

    // Run when user clicks
    onMousePress(() => {
        const pos = k.mousePos()

        debug.log(pos);
        
        // if the delta time is not there
        // the movement would be executed in the same frame as the selection
        // meaning 1) the player would not see the selection outline
        // and 2) the mous position indicating the movement target
        // would be on the selected unit
        if (selectedUnit != null && dt() != selectedUnit.dt) {
            debug.log(selectedUnit.unit.scaledAdjustVector);
            selectedUnit.unit.targetPos = pos.sub(selectedUnit.unit.scaledAdjustVector);
            k.destroy(selectedUnit.outline);
            selectedUnit = null;
        }
    });
})

k.go("main");

