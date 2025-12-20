import kaplay from "kaplay";
// import "kaplay/global"; // uncomment if you want to use without the k. prefix

const BEAN_SPEED = 100;
const PLAYABLE_WIDTH = 640;
const SIDE_PANEL_WIDTH = 400;
const k = kaplay(
    {
        background: "#4488AA",
        width: PLAYABLE_WIDTH + SIDE_PANEL_WIDTH,
        height: 480,
    }
);



k.loadRoot("./"); // A good idea for Itch.io publishing later
k.loadSprite("bean", "sprites/bean.png");

// load a default sprite
k.loadBean();

// load sprites from an Atlas
// docs: https://kaplayjs.com/docs/api/ctx/loadSpriteAtlas/
// https://kaplayjs.com/docs/api/SpriteAtlasData/?preview=SpriteAtlasEntry
k.loadSpriteAtlas("sprites/world_tileset.png", {
    "mushroom_red": {
        x: 112,
        y: 5*16,
        width: 16,
        height: 16,
    },
    "mushroom_yellow": {
        x: 112,
        y: 6*16,
        width: 16,
        height: 16,
    },
    "mushroom_purple": {
        x: 112,
        y: 7*16,
        width: 16,
        height: 16, 
    },
    "mushroom_green": {
        x: 112,
        y: 8*16,
        width: 16,
        height: 16,
    }
});

k.loadSprite("knight_idle", "sprites/knight_idle.png", {sliceX: 4, anims: {idle: {from: 0, to: 3, loop: true}}});


k.loadShader(
    "invert",
    null,
    `
	uniform float u_time;
	
	vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
        vec4 c = def_frag();
        float t = (sin(u_time * 4.0) + 1.0) / 3.0;
        float u = (cos(u_time * 2.0) + 1.0) / 3.0;
        return mix(c, vec4(c.r/2.0 + c.r * u, c.g/2.0 + c.g * t, c.b, c.a), t);
		
	}
`,
);

// https://kaplayjs.com/docs/api/ctx/scene/
k.scene("intro", () => {
    add([text("The Nom Nom Game"), pos(k.width()/4.5, 50)]);

    const startButton = add([text("Start", {size: 52}), pos(k.width()/2.7, k.height()/2), "startButton"]);

    startButton.onMousePress("left", () => {
        k.go("main");
    });
});

k.scene("main", () => {
    // function for spawning a one mushroom with random color at a random position
    const spawnRandomMushroom = () => {
        const mushroomTypes = ["mushroom_red", "mushroom_yellow", "mushroom_purple", "mushroom_green"];
        const type = mushroomTypes[Math.floor(Math.random() * mushroomTypes.length)];

        // do not spawn in a 16px wide stripe around the edges
        const x = 16 + Math.random() * (PLAYABLE_WIDTH - 32);
        const y = 16 + Math.random() * (k.height() - 32);

        // add a game object, takes an array of components
        // docs: https://kaplayjs.com/docs/api/ctx/add/
        add([k.pos(x, y), k.sprite(type), "mushroom", k.area(), scale(1.7), 
            // Use the shader with shader() component and pass uniforms
                shader("invert", () => ({
                    u_time: time(),
                })),
        ]);
    }

    // garden background
    add([k.pos(0,0), k.rect(PLAYABLE_WIDTH, k.height()), color(0, 155, 0)]);

    // score counters
    const scoreCounter = {
        currentFloored: 0,
        totalFloored: 0,
        current: 0.0,
        total: 0.0
    }
    const totalScore = add([
        text("Total Nom Nom: 0"),
        pos(23, 24)
    ]);
    const score = add([
        text("Nom nom: 0"),
        pos(24, 60)
    ]);
    const incrementScoreFunction = (amount) => {
        scoreCounter.current += amount;
        scoreCounter.total += amount;
        scoreCounter.currentFloored = Math.floor(scoreCounter.current);
        scoreCounter.totalFloored = Math.floor(scoreCounter.total);
    }

    const initPlayer = (incrementScoreFunction) => {
        // player controlled bean
        const playerBean = add([k.pos(120, 80), k.sprite("knight_idle", {anim: "idle", speed: BEAN_SPEED}), scale(3), k.area()]);
        playerBean.speed = BEAN_SPEED;
        playerBean.mushroomMulti = 1.0;
        
        // special movement function that keeps the bean inside the screen bounds
        playerBean.constrainedMove = (key) => {
            let vx = 0;
            let vy = 0;

            if (key === "left") {
                vx = -playerBean.speed;
                playerBean.c("sprite").flipX = true;
            }
            if (key === "right") {
                vx = playerBean.speed;
                playerBean.c("sprite").flipX = false;
            }
            if (key === "up") {
                vy = -playerBean.speed;
            }
            if (key === "down") {
                vy = playerBean.speed;
            }

            playerBean.move(vx, vy);

            if (playerBean.pos.x < 0) {
                playerBean.pos.x = 0;
            }
            if (playerBean.pos.x > PLAYABLE_WIDTH - playerBean.width) {
                playerBean.pos.x = PLAYABLE_WIDTH - playerBean.width;
            }
            if (playerBean.pos.y < 0) {
                playerBean.pos.y = 0;
            }
            if (playerBean.pos.y > k.height() - playerBean.height) {
                playerBean.pos.y = k.height() - playerBean.height;
            }
            
        }

        // https://kaplayjs.com/docs/api/AreaComp/#AreaComp-onCollide

        // eat the mushroom on collision
        playerBean.onCollide("mushroom", (m) => {
            destroy(m);
            incrementScoreFunction(1 * playerBean.mushroomMulti);
            spawnRandomMushroom();
        });

        // custom logic
        playerBean.onUpdate(() => {
            const mushrooms = get("mushroom");

            // find the nearest mushroom
            const nearest = mushrooms.reduce((nearestMushroom, currentMushroom) => {
                const distToCurrent = playerBean.pos.dist(currentMushroom.pos);
                const distToNearest = nearestMushroom ? playerBean.pos.dist(nearestMushroom.pos) : Infinity;

                return distToCurrent < distToNearest ? currentMushroom : nearestMushroom;
            }, null);

            // move towards it
            if (nearest) {
                playerBean.moveTo(nearest.pos, playerBean.speed);

                // calculate the directrion vector to the nearest mushroom
                // so that we can flip the sprite accordingly (the knight faces
                // the direction of movement)
                const v = playerBean.toOther(nearest);
                if (v.x <= 0) {
                    playerBean.c("sprite").flipX = false;
                } else {
                    playerBean.c("sprite").flipX = true;
                }
            }
        });

        return playerBean;
    }


    const myBean = initPlayer(incrementScoreFunction);

    // update score display every frame
    myBean.onUpdate(() => {
        score.text = "Nom Nom: " + scoreCounter.currentFloored;
        totalScore.text = "Total Nom Nom: " + scoreCounter.totalFloored;
    });

    // simple movement
    onKeyDown(["left", "right", "up", "down"], (key) => {
        myBean.constrainedMove(key);
    });
    
    // spawn some mushrooms to start with
    spawnRandomMushroom();
    spawnRandomMushroom();

    // available updates
    let upgradeConfig = {
        speed: {
            getMulti: () => Math.pow(1.2, upgradeConfig.speed.upgradeLevel),
            getPrice: () => Math.pow(1.8, upgradeConfig.speed.upgradeLevel),
            buyNext: () => {
                upgradeConfig.speed.upgradeLevel++;
                upgradeConfig.speed.currentPrice = upgradeConfig.speed.getPrice();
                upgradeConfig.speed.currentPriceFloored = Math.floor(upgradeConfig.speed.currentPrice);
            },
            upgradeLevel: 0,
            currentPrice: 1,
            currentPriceFloored: 1,
        },

        mushroomMulti: {
            getMulti: () => {
                if (upgradeConfig.mushroomMulti.upgradeLevel <= 20) { 
                    return Math.pow(1.105, upgradeConfig.mushroomMulti.upgradeLevel);
                } else {
                    return Math.log(1+upgradeConfig.mushroomMulti.upgradeLevel)/Math.log(1.5);
                }
            },
            getPrice: () => Math.pow(1.8, upgradeConfig.mushroomMulti.upgradeLevel),
            upgradeLevel: 0,
            buyNext: () => {
                upgradeConfig.mushroomMulti.upgradeLevel++;
                upgradeConfig.mushroomMulti.currentPrice = upgradeConfig.mushroomMulti.getPrice();
                upgradeConfig.mushroomMulti.currentPriceFloored = Math.floor(upgradeConfig.mushroomMulti.currentPrice);
            },
            currentPrice: 1,
            currentPriceFloored: 1,
        },

        forrestVault: {
            getMulti:() => upgradeConfig.forrestVault.upgradeLevel / 2.0,
            getPrice: () => Math.pow(1.9, upgradeConfig.forrestVault.upgradeLevel),
            upgradeLevel: 0,
            buyNext: () => {
                upgradeConfig.forrestVault.upgradeLevel++;
                upgradeConfig.forrestVault.currentPrice = upgradeConfig.forrestVault.getPrice();
                upgradeConfig.forrestVault.currentPriceFloored = Math.floor(upgradeConfig.forrestVault.currentPrice);
            },
            currentPrice: 10,
            currentPriceFloored: 10,
        }
    }
    add([k.pos(k.width()-SIDE_PANEL_WIDTH, 20), text("Stats and upgrades", {size: 18})]);
    const speedLabel = add([k.pos(k.width()-SIDE_PANEL_WIDTH, 50), text("Speed: " + myBean.speed, {size: 16})]);
    const speedUpgradeBtn = add([k.pos(k.width()-(SIDE_PANEL_WIDTH/2.0), 50), area(), text("UP (" + upgradeConfig.speed.currentPriceFloored + ")", {size: 16}), "speedUpgradeButton"]);
    speedUpgradeBtn.onClick(() => {
        if (scoreCounter.current >= upgradeConfig.speed.currentPrice) {
            // pay
            scoreCounter.current -= upgradeConfig.speed.currentPrice;
            scoreCounter.currentFloored = Math.floor(scoreCounter.current);

            // upgrade stats and prices
            upgradeConfig.speed.buyNext();
            myBean.speed = BEAN_SPEED * upgradeConfig.speed.getMulti();
            myBean.c("sprite").animSpeed = upgradeConfig.speed.getMulti();
            
            // update labels
            speedLabel.text = "Speed: " + Math.floor(myBean.speed);
            speedUpgradeBtn.text = "UP (" + upgradeConfig.speed.currentPriceFloored + ")";
        }
    });

    const mushroomMultiLabel = add([k.pos(k.width()-SIDE_PANEL_WIDTH, 80), text("Shroom X: " + myBean.mushroomMulti.toFixed(2), {size: 16})]);
    const mushroomMultiUpgradeBtn = add([k.pos(k.width()-(SIDE_PANEL_WIDTH/2.0), 80), area(), text("UP (" +  upgradeConfig.mushroomMulti.currentPriceFloored + ")", {size: 16}), "mushroomMultiUpgradeButton"]);
    mushroomMultiUpgradeBtn.onClick(() => {
        if (scoreCounter.current >= upgradeConfig.mushroomMulti.currentPrice) {
            // pay
            scoreCounter.current -= upgradeConfig.mushroomMulti.currentPrice;
            scoreCounter.currentFloored = Math.floor(scoreCounter.current);

            // upgrade stats and prices
            upgradeConfig.mushroomMulti.buyNext();
            myBean.mushroomMulti = upgradeConfig.mushroomMulti.getMulti();

            // update labels
            mushroomMultiLabel.text = "Shroom X: " + myBean.mushroomMulti.toFixed(2);
            mushroomMultiUpgradeBtn.text = "UP (" + upgradeConfig.mushroomMulti.currentPriceFloored + ")";
        }
    });

    const forrestVaultLabel = add([k.pos(k.width()-SIDE_PANEL_WIDTH, 110), text("Forrest Vault: " + upgradeConfig.forrestVault.getMulti().toFixed(2), {size: 16})]);
    const forrestVaultUpgradeBtn = add([k.pos(k.width()-(SIDE_PANEL_WIDTH/2.0), 110), area(), text("UP (" +  upgradeConfig.forrestVault.currentPriceFloored + ")", {size: 16}), "forrestVaultUpgradeButton"]);
    forrestVaultUpgradeBtn.onClick(() => {
        if (scoreCounter.current >= upgradeConfig.forrestVault.currentPrice) {
            // pay
            scoreCounter.current -= upgradeConfig.forrestVault.currentPrice;
            scoreCounter.currentFloored = Math.floor(scoreCounter.current);

            // upgrade stats and prices
            upgradeConfig.forrestVault.buyNext();
            myBean.forrestVault = upgradeConfig.forrestVault.getMulti();

            // update labels
            forrestVaultLabel.text = "Forrest Vault: " + upgradeConfig.forrestVault.getMulti().toFixed(2);
            forrestVaultUpgradeBtn.text = "UP (" + upgradeConfig.forrestVault.currentPriceFloored + ")";
        }
    });

    // todo: implement forrest vault logic
});

// k.go("intro");
k.go("main");