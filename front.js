// 2048 game implementation
// Author: bp-pet
// A note on nomenclature: the game is played on a board with cells, each cell can contain a tile or not

// Possible features to add:
// undo button
// score change animation


// backend
const server_url = 'https://bp1402.pythonanywhere.com';

// constants
numberOfScoresShown = 5;
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
let nameInput = '';

// elements
const gameContainer = document.getElementById("game-container");
const landingScreen = document.getElementById("landing-screen");
const startButton = document.getElementById('start-button');
const backToMenuButtons = [document.getElementById('back-to-menu-button-in-game'), document.getElementById('back-to-menu-button-game-over')];
const gameOverScreen = document.getElementById('game-over-screen');
const gameOverScore = document.getElementById("game-over-score");
const victoryScreen = document.getElementById('victory-screen');

// set cell sizes
document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);
document.documentElement.style.setProperty("--gap-size", `${gapSize}px`);

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
        if (i == 1) {
            // only record score on game over
            sendHighScore();
        }
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

    // load board and score
    score = 0;
    addScore(0);
    gameContainer.style.setProperty("display", "flex");
    landingScreen.style.setProperty("display", "none");
    const board = document.getElementById("game-board");
    getHighScores();

    // remove existing cells
    let cells = document.querySelectorAll(".cell");
    for (let i = 0; i < cells.length; i++) {
        let cell = cells[i];
        cell.remove();
    }

    // spawn new cells
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
    
    // spawn two random tiles to start off
    Promise.all([spawnRandomTile(), spawnRandomTile()]).then(() => {
        processing = false;
    });
}

// fast mode switch definitions
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

// optional: add custom tiles for debugging or leave empty for random tiles
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
    
    if (event.code === 'KeyP') {
        // for debugging
        doGameOver();
        return;
    }

    if (processing) {
        // if a move is being processed, ignore the keypress
        return;
    }

    // indicates move is being processed
    processing = true;

    // determine direction or other action from key
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
        // if you mute the return you can spawn new tiles without moving the board
        return;
    } else {
        processing = false;
        return;
    }

    // move all tiles in the given direction
    moveAll(direction)
        .then(changed => {
            if (changed) {
                // if keypress resulted in a move, spawn a new tile
                return spawnRandomTile()
            }
        })
        .then(() => {
            // check if there are any moves left to end the game or not
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

    // simulate keypress based on swipe
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

        // find all empty cells
        let emptyCells = [];
        for (let i = 0; i < cells.length; i++) {
            if (cells[i].childElementCount === 0) {
            emptyCells.push(cells[i]);
            }
        }

        // determine at random where to spawn
        let spawnCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    
        // determine if 2 or 4 should spawn with a set rate
        let spawnNumber = 2;
        if (Math.random() < fourSpawnRate) {
            spawnNumber = 4;
        }
    
        // create tile
        let tile = document.createElement("div");
        tile.classList.add("tile");
        tile.classList.add('tile-appear');

        // play appear animation
        let tilePromise = new Promise((resolveTile) => {
            setTimeout(() => {
            tile.classList.remove('tile-appear');
            resolveTile();
            }, appearTime);
        });
    
        // actually spawn tile
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
    let moveExists = false;
    
    // make a promise for each cell
    let promises = [];
    for (let i = 0; i < boardX; i++) {
        for (let j = 0; j < boardY; j++) {
            let promise = new Promise(resolve => {
                if (document.getElementById(`cell-${i}-${j}`).childNodes.length === 0) {
                    // if board is not full then move definitely exists
                    moveExists = true;
                    resolve();
                }

                // check if there is a tile with the same value in the adjacent cell
                if (i !== boardX - 1) {
                    if (document.getElementById(`cell-${i + 1}-${j}`).childNodes.length === 0) {
                        // this statement is here so that the next one does not throw an error in case the adjacent cell is empty
                        moveExists = true;
                    } else if (document.getElementById(`cell-${i}-${j}`).childNodes[0].textContent === document.getElementById(`cell-${i + 1}-${j}`).childNodes[0].textContent) {
                        moveExists = true;
                    }
                }

                // do the same check on the other axis
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
    // find all tiles in row or column
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
    // find out which to merge in a given row or column as result of a move in a given direction
    // also set ones that are merged up for deleting
    return new Promise((resolve) => {
        for (let i = 0; i < tiles.length; i++) {
            // if current one already merged with previous (i.e. it is set up for removing), it cannot be merged with next
            if (idxToRemove.includes(i)) {
                continue;
            }
            
            // determine the location to move to
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
            // target location of current tile is the same regardless of merging or not
            tiles[i].setAttribute("targetRow", targetRow);
            tiles[i].setAttribute("targetCol", targetCol);

            // for last one do not check for merges (since there is no next tile)
            if (i === tiles.length - 1) {
                break;
            }

            // check if current should be merged with next based on number
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
    // based on merging of tiles, update a row/column
    return new Promise((resolve) => {

        // clear row/column
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
            // add remaining tiles to row/column
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
    // returns false if nothing happened, true otherwise
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

    // calculate speed
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
    document.getElementById("score").textContent = score;
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



function sendHighScore() {
    nameInput = document.getElementById('name-input').value;
    fetch(server_url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: nameInput, points: score, board_x: boardX, board_y: boardY })
    })
        .then(() => {
        })
        .catch(error => {
            console.error('Error posting score:', error);
        });
}

function getHighScores() {
    target_url = server_url + '/' + boardX + '/' + boardY;
    fetch(target_url, {method: 'GET'})
        .then(response => {
            return response.json();
        })
        .then(data => {
            let scores = data.scores;

            // get high scores table element
            const highScoresTable = document.getElementById("high-scores-table");

            // clear existing rows
            while (highScoresTable.rows.length > 0) {
                highScoresTable.deleteRow(0);
            }

            // if no scores just show placeholder
            if (scores.length === 0) {
                const row = highScoresTable.insertRow(0);
                const cell = row.insertCell(0);
                cell.textContent = "-";
                return;
            }

            // add new rows
            for (let i = 0; i < scores.length; i++) {
                if (i === numberOfScoresShown) {
                    // only show top few
                    break;
                }
                const row = highScoresTable.insertRow(i);
                const rankCell = row.insertCell(0);
                const nameCell = row.insertCell(1);
                const scoreCell = row.insertCell(2);

                rankCell.textContent = (i + 1) + ".";
                nameCell.textContent = scores[i].name;
                scoreCell.textContent = scores[i].points;
            }
        })
        .catch(error => {
            console.log('Error getting scores:', error);
        });
}