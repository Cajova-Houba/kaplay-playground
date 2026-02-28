import {k} from "../App";

const RIBBON_SPRITE_WIDTH = 62;

function createButtonRibbon(x: number, y: number, color: string) {
    k.add([k.pos(x+1 , y), k.sprite("big_ribbon_" + color + "_start", {width: RIBBON_SPRITE_WIDTH, height: 60, tiled: false}), area()]);
    k.add([k.pos(x + RIBBON_SPRITE_WIDTH, y), k.sprite("big_ribbon_" + color, {width: 2 * RIBBON_SPRITE_WIDTH, height: 60, tiled: true}), area()]);
    k.add([k.pos(x + 3 * RIBBON_SPRITE_WIDTH, y), k.sprite("big_ribbon_" + color + "_end", {width: RIBBON_SPRITE_WIDTH, height: 60, tiled: false}), area()]);
}

function createButton(x: number, y: number, color: string, textOffsetX: number = 30, textOffsetY: number = 25, buttonText: string = "Button", onClick: () => void = () => {}) {
    createButtonRibbon(x, y, color);
    const cacncelFormationBtn = add([k.pos(x+textOffsetX, y+textOffsetY), area({shape: new Rect(vec2(0,0), 248, 62), offset: vec2(-30, -25)}), text(buttonText, {size: 16})]); 
    cacncelFormationBtn.onClick(onClick);
}

export function createRedButton(x: number, y: number, textOffsetX: number = 30, textOffsetY: number = 25, buttonText: string = "Button", onClick: () => void = () => {}) {
    createButton(x, y, "red", textOffsetX, textOffsetY, buttonText, onClick);
}

export function createBlueButton(x: number, y: number, textOffsetX: number = 30, textOffsetY: number = 25, buttonText: string = "Button", onClick: () => void = () => {}) {
    createButton(x, y, "blue", textOffsetX, textOffsetY, buttonText, onClick);
}