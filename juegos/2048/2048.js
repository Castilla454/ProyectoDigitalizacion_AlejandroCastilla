let board;
let score = 0;
let rows = 4;
let columns = 4;
let gameOver = false;

window.onload = function () {
    setGame();
    // Track play
    if (window.GameAPI) {
        window.GameAPI.trackPlay('2048');
    }
}

function resetGame() {
    score = 0;
    gameOver = false;
    document.getElementById("score").innerText = "0";
    document.getElementById("board").innerHTML = "";
    document.getElementById("resultModal").classList.remove("active");
    let statusEl = document.getElementById("status");
    if (statusEl) statusEl.textContent = "Usa las flechas del teclado";
    setGame();
}

function showResult(title, message) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalMessage").textContent = message;
    document.getElementById("modalScore").textContent = score;
    document.getElementById("resultModal").classList.add("active");
}

function checkGameOver() {
    if (hasEmptyTile()) return false;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            if (c < columns - 1 && board[r][c] === board[r][c + 1]) return false;
            if (r < rows - 1 && board[r][c] === board[r + 1][c]) return false;
        }
    }
    return true;
}

function checkWin() {
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < columns; c++)
            if (board[r][c] === 2048) return true;
    return false;
}
function setGame() {


    board = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];


    /*
        board = [
            [2, 2, 2, 2],
            [2, 2, 2, 2],
            [4, 4, 8, 8],
            [4, 4, 8, 8]
        ];
        */

    for (let r = 0; r < rows; r++) {

        for (let c = 0; c < columns; c++) {

            let tile = document.createElement("div");
            tile.id = r.toString() + "-" + c.toString();
            let num = board[r][c];
            updateTile(tile, num);
            document.getElementById("board").append(tile);




        }

    }
    setTwo();
    setTwo();
}


function hasEmptyTile() {


    for (let r = 0; r < rows; r++) {


        for (let c = 0; c < columns; c++) {
            if (board[r][c] == 0) {
                return true;
            }


        }
    }

    return false;
}
function setTwo() {

    if (!hasEmptyTile()) {

        return;


    }
    let found = false;

    while (!found) {

        let r = Math.floor(Math.random() * rows);
        let c = Math.floor(Math.random() * columns);

        if (board[r][c] == 0) {

            board[r][c] = 2;
            let tile = document.getElementById(r.toString() + "-" + c.toString());
            tile.innerText = "2";
            tile.classList.add("x2");
            found = true;


        }

    }


}

function updateTile(tile, num) {

    tile.innerText = "";
    tile.classList.value = "";

    tile.classList.add("tile");
    if (num > 0) {

        tile.innerText = num;
        if (num <= 4096) {

            tile.classList.add("x" + num.toString());


        } else {

            tile.classList.add("x8192");
        }

    }


}


document.addEventListener("keyup", (e => {
    if (gameOver) return;

    let moved = false;
    let prevBoard = JSON.stringify(board);

    if (e.code == "ArrowLeft") {
        slideLeft();
    } else if (e.code == "ArrowRight") {
        slideRight();
    } else if (e.code == "ArrowUp") {
        slideUp();
    } else if (e.code == "ArrowDown") {
        slideDown();
    }

    moved = JSON.stringify(board) !== prevBoard;
    if (moved) setTwo();

    document.getElementById("score").innerText = score;

    if (checkWin()) {
        gameOver = true;
        showResult("🎉 ¡Victoria!", "¡Has llegado a 2048!");
        if (window.GameAPI) window.GameAPI.submitScore('2048', score);
    } else if (checkGameOver()) {
        gameOver = true;
        showResult("Game Over", "No hay más movimientos posibles");
        if (window.GameAPI) window.GameAPI.submitScore('2048', score);
    }
}));


function filterZero(row) {

    return row.filter(num => num != 0);

}


function slide(row) {

    row = filterZero(row);



    for (let i = 0; i < row.length - 1; i++) {

        if (row[i] == row[i + 1]) {
            row[i] *= 2;
            row[i + 1] = 0;
            score += row[i];


        }

    }

    row = filterZero(row);
    while (row.length < columns) {

        row.push(0);

    }

    return row;


}

function slideLeft() {

    for (let r = 0; r < rows; r++) {

        let row = board[r];
        row = slide(row);
        board[r] = row;

        for (let c = 0; c < columns; c++) {
            let tile = document.getElementById(r.toString() + "-" + c.toString());
            let num = board[r][c];
            updateTile(tile, num);

        }

    }



}


function slideRight() {

    for (let r = 0; r < rows; r++) {

        let row = board[r];
        row.reverse();
        row = slide(row);
        row.reverse();
        board[r] = row;

        for (let c = 0; c < columns; c++) {
            let tile = document.getElementById(r.toString() + "-" + c.toString());
            let num = board[r][c];
            updateTile(tile, num);

        }

    }



}

function slideUp() {

    for (let c = 0; c < columns; c++) {

        let row = [board[0][c], board[1][c], board[2][c], board[3][c]];
        row = slide(row);
        /*
        board[0][c] = row[0];
        board[1][c] = row[1];
        board[2][c] = row[2];
        board[3][c] = row[3];
    
    */
        for (let r = 0; r < rows; r++) {
            board[r][c] = row[r];
            let tile = document.getElementById(r.toString() + "-" + c.toString());
            let num = board[r][c];
            updateTile(tile, num);

        }


    }

}

function slideDown() {

    for (let c = 0; c < columns; c++) {

        let row = [board[0][c], board[1][c], board[2][c], board[3][c]];
        row.reverse();
        row = slide(row);
        row.reverse();
        /*
        board[0][c] = row[0];
        board[1][c] = row[1];
        board[2][c] = row[2];
        board[3][c] = row[3];
    
    */
        for (let r = 0; r < rows; r++) {
            board[r][c] = row[r];
            let tile = document.getElementById(r.toString() + "-" + c.toString());
            let num = board[r][c];
            updateTile(tile, num);

        }


    }

}

