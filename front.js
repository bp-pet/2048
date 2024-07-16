// TODO deployment
// TODO undo button
// TODO score change animation
// TODO fix gameplay with 1 or 2 tiles

// constants
const cellSize = 100;
const gapSize = 10;
const fourSpawnRate = 0.1;

// colors and font sizes for tiles
const fontMap = [80, 60, 40, 30, 25, 20, 15]
const colorMap = {2: ["#ffdd99", "white"],
                  4: ["#ffc34d", "white"],
                  8: ["#e69900", "white"],
                  16: ["#ff9933", "white"],
                  32: ["#cc6600", "white"],
                  64: ["#ff704d", "white"],
                  128: ["#ff99cc", "white"],
                  256: ["#dd99ff", "white"],
                  512: ["#80d4ff", "white"],
                  1024: ["#b3ffff", "black"],
                  2048: ["#99ff99", "black"]}

// variables
let boardX;
let boardY;
let mergeTime;
let appearTime;
let movementSpeed;
let processing = true;
let fastMode = false;
let score = 0;
let highScores = {};

// elements
const gameContainer = document.getElementById("game-container");
const landingScreen = document.getElementById("landing-screen");
const startButton = document.getElementById('start-button');
const backToMenuButtons = [document.getElementById('back-to-menu-button1'),
                           document.getElementById('back-to-menu-button2')];
const gameOverScreen = document.getElementById('game-over-screen');
const gameOverScore = document.getElementById("game-over-score");
const victoryScreen = document.getElementById('victory-screen');


document.addEventListener('DOMContentLoaded', function() {
    // wait for user to start game
    startButton.addEventListener('click', function() {
        setSizes();
        startGame();
    });
});

for (let i = 0; i < backToMenuButtons.length; i++) {
    let backToMenuButton = backToMenuButtons[i];
    backToMenuButton.addEventListener('click', function() {
        // for restarting game
        gameContainer.style.setProperty("display", "none");
        landingScreen.style.setProperty("display", "block");
        gameOverScreen.style.setProperty("display", "none");
    });
}

function setSizes() {
    // set the board sizes from the input
    const boardXSelect = document.getElementById('board-x');
    const boardYSelect = document.getElementById('board-y');
    boardX = boardXSelect.value;
    boardY = boardYSelect.value;
    document.documentElement.style.setProperty("--board-x", boardX);
    document.documentElement.style.setProperty("--board-y", boardY);
}


function startGame() {
    // load board and spawn start cells, turn on keyboard input
    score = 0;
    addScore(0);
    gameContainer.style.setProperty("display", "flex");
    landingScreen.style.setProperty("display", "none");
    const board = document.getElementById("game-board");
    let cells = document.querySelectorAll(".cell");
    for (let i = 0; i < cells.length; i++) {
        let cell = cells[i];
        cell.remove();
    }
    for (let row = 0; row < boardX; row++) {
        for (let col = 0; col < boardY; col++) {
            const cell = document.createElement("div");
            cell.setAttribute("class", "cell");
            cell.setAttribute("id", `cell-${row}-${col}`);
            cell.setAttribute("row", row);
            cell.setAttribute("col", col);
            board.appendChild(cell);
        }
    }
    
    Promise.all([spawnRandomTile(), spawnRandomTile()]).then(() => {
        processing = false;
    });
}

// switch definitions
toggleFastMode(fastMode);
const switchElement = document.getElementById("fastModeSwitch");
switchElement.checked = fastMode;
const switchContainer = document.getElementById("switch-container");
const popup = document.getElementById("switch-container").querySelector('.popup');
switchContainer.addEventListener('mouseover', () => {
    // show popup
    popup.style.display = 'block';
});
switchContainer.addEventListener('mouseout', () => {
    // hide popup
    popup.style.display = 'none';
});
function toggleFastMode(state) {
    // change variables based on state of fast mode
    if (state) {
        mergeTime = 0;
        appearTime = 0;
        movementSpeed = 3000;
    } else {
        appearTime = 50;
        mergeTime = 150;
        movementSpeed = 3000;
    }
}
switchElement.addEventListener("click", function() {
    toggleFastMode(this.checked);
});

document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);
document.documentElement.style.setProperty("--gap-size", `${gapSize}px`);




// add custom tiles (for debugging)
let cellsToAdd = [];
// let cellsToAdd = [[0, 0, 1024], [0, 1, 1024]];
// let cellsToAdd = [[0, 0, 2], [0, 1, 4], [0, 2, 8], [0, 3, 16],
//                   [1, 0, 32], [1, 1, 64], [1, 2, 128], [1, 3, 256],
//                   [2, 0, 512], [2, 1, 1024], [2, 2, 2048]];
for (let i = 0; i < cellsToAdd.length; i++) {
    coords = cellsToAdd[i];
    let cell = document.getElementById(`cell-${coords[0]}-${coords[1]}`);
    const tile = document.createElement("div"); // create a new div element for the tile
    tile.classList.add("tile"); // add a CSS class to the tile element
    tile.setAttribute("row", coords[0])
    tile.setAttribute("col", coords[1])
    tile.textContent = coords[2]; // set the text content of the tile element
    updateTileLook(tile);
    cell.appendChild(tile); // append the tile element to the cell element
}



document.addEventListener('keydown', function(event) {
    // main part of game
    if (processing) {
        return;
    }

    processing = true;

    let direction;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        direction = "right";
    } else if (event.code == "ArrowLeft" || event.code === 'KeyA') {
        direction = "left";
    } else if (event.code =="ArrowUp" || event.code === 'KeyW') {
        direction = "up";
    } else if (event.code == "ArrowDown" || event.code === 'KeyS') {
        direction = "down";
    } else if (event.code == "KeyF") {
        switchElement.checked = 1 - switchElement.checked;
        toggleFastMode(switchElement.checked);
        processing = false;
        // mute the return for nice hacks
        return;
    } else {
        processing = false;
        return;
    }
    moveAll(direction)
        .then(changed => {
            if (changed) {
                return spawnRandomTile()
            }
        })
        .then(() => {
            return checkForMoves();
        })
        .then(moveIsPossible => {
            if (!moveIsPossible) {
                doGameOver();
            }
        })
        .finally(() => {
            processing = false
        });
});




// handle touches on mobile
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

function handleSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) {
            key = 'ArrowRight';
        } else {
            key = 'ArrowLeft';
        }
    } else {
        if (diffY > 0) {
            key = 'ArrowDown';
        } else {
            key = 'ArrowUp';
        }
    }

    const event = new KeyboardEvent('keydown', {
        key: key,
        code: key,
        bubbles: true,
        cancelable: true
    });
    document.dispatchEvent(event);

}

document.addEventListener('touchstart', function(event) {
    touchStartX = event.changedTouches[0].screenX;
    touchStartY = event.changedTouches[0].screenY;
}, false);

document.addEventListener('touchend', function(event) {
    touchEndX = event.changedTouches[0].screenX;
    touchEndY = event.changedTouches[0].screenY;
    handleSwipe();
}, false);




function spawnRandomTile() {
    // spawn a tile at a random location
    return new Promise((resolve) => {
        let cells = document.querySelectorAll(".cell");
        if (cells.length === 0) {
            // if nothing to spawn
            resolve();
        }
        let emptyCells = [];
        for (let i = 0; i < cells.length; i++) {
            if (cells[i].childElementCount === 0) {
            emptyCells.push(cells[i]);
            }
        }
        let spawnCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    
        let spawnNumber = 2;
        if (Math.random() < fourSpawnRate) {
            spawnNumber = 4;
        }
    
        let tile = document.createElement("div");
        tile.classList.add("tile");
        tile.classList.add('tile-appear');
        let tilePromise = new Promise((resolveTile) => {
            setTimeout(() => {
            tile.classList.remove('tile-appear');
            resolveTile();
            }, appearTime);
        });
    
        let updatePromise = new Promise((resolveUpdate) => {
            tile.setAttribute("row", spawnCell.getAttribute("row"));
            tile.setAttribute("col", spawnCell.getAttribute("col"));
            tile.textContent = spawnNumber;
            updateTileLook(tile);
            spawnCell.appendChild(tile);
            resolveUpdate();
        });
  
        Promise.all([tilePromise, updatePromise]).then(() => {
            resolve();
        });
    });
}
  

async function checkForMoves() {
    // check if move is possible
    let promises = [];
    let moveExists = false;
    for (let i = 0; i < boardX; i++) {
        for (let j = 0; j < boardY; j++) {
            let promise = new Promise(resolve => {
                if (document.getElementById(`cell-${i}-${j}`).childNodes.length === 0) {
                    moveExists = true;
                    resolve();
                }
                if (i !== boardX - 1) {
                    if (document.getElementById(`cell-${i + 1}-${j}`).childNodes.length === 0) {
                        moveExists = true;
                    } else if (document.getElementById(`cell-${i}-${j}`).childNodes[0].textContent === document.getElementById(`cell-${i + 1}-${j}`).childNodes[0].textContent) {
                        moveExists = true;
                    }
                }
                if (j !== boardY - 1) {
                    if (document.getElementById(`cell-${i}-${j + 1}`).childNodes.length === 0) {
                        moveExists = true;
                    } else if (document.getElementById(`cell-${i}-${j}`).childNodes[0].textContent === document.getElementById(`cell-${i}-${j + 1}`).childNodes[0].textContent) {
                        moveExists = true;
                    }
                }
                resolve();
            });
            promises.push(promise);
        }
    }
    return Promise.all(promises).then(() => moveExists);
}

function findTiles(direction, x, tiles) {
    // find all tiles in column from top to bottom
    return new Promise((resolve) => {
        let axis;
        if (direction === "up" || direction === "down") {
            axis = boardX;
        } else {
            axis = boardY;
        }
        for (let y = 0; y < axis; y++) {
            switch(direction) {
                case 'up':
                    row = y;
                    col = x;
                    break;
                case 'down':
                    row = boardX - 1 - y;
                    col = x;
                    break;
                case 'left':
                    row = x;
                    col = y;
                    break;
                case 'right':
                    row = x;
                    col = boardY - 1 - y;
                    break;
                default:
            }
            let cell = document.getElementById(`cell-${row}-${col}`);
            let tile = cell.querySelector('.tile');
            if (tile !== null) {
                tiles.push(tile);
            }
        }
        return resolve();
    })
}

function mergeTiles(direction, x, tiles, idxToRemove) {
    // find out which to merge, set ones that are merged up for deleting
    return new Promise((resolve) => {
        for (let i = 0; i < tiles.length; i++) {
            // if current one already merged with previous, it cannot be merged with next
            if (idxToRemove.includes(i)) {
                continue;
            }
            switch(direction) {
                case 'up':
                    targetRow = i - idxToRemove.length;
                    targetCol = x;
                    break;
                case 'down':
                    targetRow = boardX - 1 - i + idxToRemove.length;
                    targetCol = x;
                    break;
                case 'left':
                    targetRow = x;
                    targetCol = i - idxToRemove.length;
                    break;
                case 'right':
                    targetRow = x;
                    targetCol = boardY - 1 - i + idxToRemove.length;
                    break;
                default:
            }
            // target location of current one is independent of merges
            tiles[i].setAttribute("targetRow", targetRow);
            tiles[i].setAttribute("targetCol", targetCol);

            // for last one do not check for merges
            if (i === tiles.length - 1) {
                break;
            }

            // check for merges
            if (tiles[i].textContent === tiles[i + 1].textContent) {
                tiles[i + 1].setAttribute("targetRow", targetRow);
                tiles[i + 1].setAttribute("targetCol", targetCol);
                idxToRemove.push(i + 1);
            }
        }
        return resolve()
    })
}

function updateColumn(direction, x, tiles, idxToRemove) {
    // based on merging of tiles, update a column
    return new Promise((resolve) => {

        // clear column
        let axis;
        if (direction === "up" || direction === "down") {
            axis = boardX;
        } else {
            axis = boardY;
        }
        for (let i = 0; i < axis; i++) {
            switch(direction) {
                case 'up':
                    row = i;
                    col = x;
                    break;
                case 'down':
                    row = boardX - 1 - i;
                    col = x;
                    break;
                case 'left':
                    row = x;
                    col = i;
                    break;
                case 'right':
                    row = x;
                    col = boardY- 1 - i;
                    break;
                default:
            }
            let cell = document.getElementById(`cell-${row}-${col}`);
            while (cell.firstChild) {
                cell.removeChild(cell.firstChild);
            }
        }

        // remove merged tiles
        let mergePromises = [];
        for (let i = tiles.length - 1; i > 0; i--) {
            if (idxToRemove.includes(i)) {
                let thisTile = tiles[i];
                let prevTile = tiles[i - 1];
                prevTile.textContent = thisTile.textContent * 2;
                addScore(thisTile.textContent * 2);
                updateTileLook(prevTile);
                tiles.splice(i, 1);

                // play merge animation
                prevTile.classList.add("tile-merge");
                let mergePromise = new Promise((resolveMerge) => {
                    setTimeout(() => {
                        prevTile.classList.remove('tile-merge');
                        resolveMerge();
                    }, mergeTime);
                });
                mergePromises.push(mergePromise);
            }
        }

        let columnsPromise = new Promise((columnsResolve) => {
            // add remaining tiles to column
            for (let i = 0; i < tiles.length; i++) {
                switch(direction) {
                    case 'up':
                        row = i;
                        col = x;
                        break;
                    case 'down':
                        row = boardX - 1 - i;
                        col = x;
                        break;
                    case 'left':
                        row = x;
                        col = i;
                        break;
                    case 'right':
                        row = x;
                        col = boardY - 1 - i;
                        break;
                    default:
                }
                document.getElementById(`cell-${row}-${col}`).appendChild(tiles[i]);
            }
            columnsResolve();
        })
        mergePromises.push(columnsPromise);

        Promise.all(mergePromises).then(() => resolve());
    });
}

function playAnimations(tiles) {
    // return promise which is resolved when all animations are complete
    return new Promise((resolve) => {

        if (tiles.length === 0) {
            resolve(false);
        }

        let animationsCounter = 0;
        let movedCounter = 0;

        function onAnimationComplete(moveOccured) {
            // when an animation is complete, increase the counter
            // if the animation did not move a tile, count it separately
            // if not tiles were actually moved, return false, otherwise true
            if (moveOccured) {
                movedCounter++;
            }
            animationsCounter++;
            if (animationsCounter === tiles.length) {
                for (let i = 0; i < tiles.length; i++) {
                    tile = tiles[i];
                    tile.style.transform = "";
                    tile.style.transitionDuration = '0ms';
                }
                resolve(movedCounter > 0);
            }
        }

        // play animation for each tile
        tiles.forEach(tile => {
            playAnimation(tile, onAnimationComplete);
        });
    });
}

function playAnimation(tile, onAnimationComplete) {
    // calculate shift based on current cell and target cell
    let YshiftSizeCells = parseInt(tile.getAttribute("targetRow")) - parseInt(tile.getAttribute("row"));
    let YshiftSizePixels = cellSize * YshiftSizeCells + gapSize * YshiftSizeCells;
    let translationY = `translateY(${YshiftSizePixels}px)`;

    let XshiftSizeCells = parseInt(tile.getAttribute("targetCol")) - parseInt(tile.getAttribute("col"));
    let XshiftSizePixels = cellSize * XshiftSizeCells + gapSize * XshiftSizeCells;
    let translationX = `translateX(${XshiftSizePixels}px)`;

    // speed calculation
    const distance = Math.max(Math.abs(XshiftSizePixels), Math.abs(YshiftSizePixels));
    const duration = (distance / movementSpeed) * 1000;

    tile.setAttribute("row", tile.getAttribute("targetRow"));
    tile.setAttribute("col", tile.getAttribute("targetCol"));

    if (YshiftSizeCells === 0 && XshiftSizeCells === 0) {
        onAnimationComplete(false);
    } else {
        tile.style.transitionDuration = `${duration}ms`;
        tile.style.transform = `${translationX} ${translationY}`;

        // can be done with eventlistener instead of timeout but then it can crash if
        // multiple inputs come in at the same time; using a timeout means it may glitch
        // but it will not crash

        // tile.addEventListener("transitionend", () => {
        //     // on end of the animation, reset transition to none and send animation complete signal once
        //     tile.style.transform = "translateX 0px translateY 0px";
        //     tile.style.transitionDuration = '0ms';
        //     onAnimationComplete(true);
        // }, { once: true });
        setTimeout(() => {
            tile.style.transform = "translateX 0px translateY 0px";
            tile.style.transitionDuration = '0ms';
            onAnimationComplete(true);
        }, duration);
    }
        
}

async function moveAll(direction) {
    // perform moving of all tiles in given direction

    const promises = [];
    var boardChanged = false;

    // do moves per column
    let axis;
    if (direction === "up" || direction === "down") {
        axis = boardY;
    } else {
        axis = boardX;
    }
    for (let x = 0; x < axis; x++) {
        let tiles = [];
        let idxToRemove = [];
        const promise = new Promise((resolve) => {
            findTiles(direction, x, tiles)
                .then(() => {
                    mergeTiles(direction, x, tiles, idxToRemove);
                })
                .then(() => {
                    return playAnimations(tiles, boardChanged)
                })
                .then((columnChanged) => {
                    if (columnChanged) {
                        boardChanged = true;
                    }
                    return updateColumn(direction, x, tiles, idxToRemove)
                })
                .then(() => {
                    resolve()
                })
        });
        promises.push(promise);
    }
    return Promise.all(promises).then(() => boardChanged);
}



function updateTileLook(tile) {
    // update tile font size and color
    let number = parseInt(tile.textContent)
    let symbolCount = tile.textContent.length
    let newFontSize;
    let newColor;
    let newTextColor;
    if (symbolCount - 1 >= fontMap.length) {
        newFontSize =  fontMap[fontMap.length - 1];
    } else {
        newFontSize = fontMap[symbolCount -1];
    }
    if (number in colorMap) {
        newColor =  colorMap[number][0];
        newTextColor =  colorMap[number][1];
    } else {
        newColor = "black"
        newTextColor = "white"
    }
    tile.style.fontSize = `${newFontSize}px`;
    tile.style.backgroundColor = newColor;
    tile.style.borderColor = newColor;
    tile.style.color = newTextColor;
}


function addScore(points) {
    // add points to the score, check for victory, check for new high score
    if (points === 2048) {
        showVictoryScreen();
    }
    score += points;

    if (!([boardX, boardY] in highScores)) {
        highScores[[boardX, boardY]] = 0;
    }

    if (score > highScores[`${boardX},${boardY}`]) {
        highScores[[boardX, boardY]] = score;
    }
    document.getElementById("score").textContent = score;
    document.getElementById("high-score").textContent = highScores[`${boardX},${boardY}`];
}

function showVictoryScreen() {
    // show victory screen and fade it out
    victoryScreen.style.display = 'inline-block';
    setTimeout(() => {
        victoryScreen.classList.add("fade-out");
    }, 3000);
}

function doGameOver() {
    // show game over screen and restart game
    gameOverScore.textContent = score;
    gameOverScreen.style.display = 'block';
}