import kaplay from "kaplay";

import { createMainScene } from "./scenes/Main.ts";

export const UNIT_DEBUG_POINT = true;
export const PLAYABLE_WIDTH = 640;
export const SIDE_PANEL_WIDTH = 260;
export const PLAYABLE_HEIGHT = 640;

export const k = kaplay(
    {
        background: "#4488AA",
        width: PLAYABLE_WIDTH + SIDE_PANEL_WIDTH,
        height: PLAYABLE_HEIGHT,
    }
);

k.loadRoot("./"); // A good idea for Itch.io publishing later

// UI sprites
k.loadSpriteAtlas( "sprites/ui/ribbons/SmallRibbons.png", {
    "big_ribbon_red_start": {
        x: 2,
        y: 132,
        width: 62,
        height: 60
    },
    "big_ribbon_red": {
        x: 130,
        y: 132,
        width: 62,
        height: 60
    },
    "big_ribbon_red_end": {
        x: 256,
        y: 132,
        width: 62,
        height: 60
    }
});
// k.loadSprite("big_ribbon_red", "sprites/ui/ribbons/SmallRibbons.png", {
//     x: 162,
//     y: 0,
//     width: 63,
//     height: 103
// });
// k.loadSprite("big_ribbon_red_end", "sprites/ui/ribbons/SmallRibbons.png", {
//     x: 290,
//     y: 0,
//     width: 98,
//     height: 103
// });

// load terrain sprites
k.loadSpriteAtlas("sprites/terrain/Tilemap_color2.png", {
    "grass": {
        x: 32,
        y: 16,
        width: 8*16,
        height: 9*16
    }
});


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

// init scenes
createMainScene();

// start
k.go("main");

