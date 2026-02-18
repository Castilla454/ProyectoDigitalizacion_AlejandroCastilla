let board;

let playerO = "O";
let playerX = "X";

let currPlayer = playerO;
let gameOver = false;

window.onload = function () {
    setGame();
}

function resetGame() {
    gameOver = false;
    currPlayer = playerO;
    document.getElementById("board").innerHTML = '';
    document.getElementById("status").innerText = 'Turno de O';
    setGame();
}

function setGame() {


    board = [

        [' ', ' ', ' '],
        [' ', ' ', ' '],
        [' ', ' ', ' ']
    ];

    for (let r = 0; r < 3; r++) {


        for (let c = 0; c < 3; c++) {

            let tile = document.createElement("div");
            tile.id = r.toString() + "-" + c.toString();
            tile.classList.add("tile");
            if (r == 0 || r == 1) {

                tile.classList.add("horizontal-line");
            }
            if (c == 0 || c == 1) {


                tile.classList.add("vertical-line");
            }

            tile.addEventListener("click", setTile);
            document.getElementById("board").append(tile);
        }
    }

}

function setTile() {

    if (gameOver) {
        return;
    }

    let coords = this.id.split("-");
    let r = parseInt(coords[0]);
    let c = parseInt(coords[1]);


    if (board[r][c] != ' ') {

        return;
    }



    board[r][c] = currPlayer;
    this.innerText = currPlayer;

    if (currPlayer == playerO) {
        currPlayer = playerX;
        document.getElementById("status").innerText = "Turno de X";
    } else {
        currPlayer = playerO;
        document.getElementById("status").innerText = "Turno de O";
    }


    checkWinner();

}

function checkWinner() {

    //horizontally


    for (let r = 0; r < 3; r++) {

        if (board[r][0] == board[r][1] && board[r][1] == board[r][2] && board[r][0] != ' ') {

            for (let i = 0; i < 3; i++) {


                let tile = document.getElementById(r.toString() + "-" + i.toString());
                tile.classList.add("winner");

            }

            gameOver = true;
            document.getElementById("status").innerText = "🎉 ¡Gana " + board[r][0] + "!";
            return;
        }

    }

    //vertically
    for (let c = 0; c < 3; c++) {

        if (board[0][c] == board[1][c] && board[1][c] == board[2][c] && board[0][c] != ' ') {

            for (let i = 0; i < 3; i++) {


                let tile = document.getElementById(i.toString() + "-" + c.toString());
                tile.classList.add("winner");

            }

            gameOver = true;
            document.getElementById("status").innerText = "🎉 ¡Gana " + board[0][c] + "!";
            return;
        }

    }


    //diagonally

    if (board[0][0] == board[1][1] && board[1][1] == board[2][2] && board[0][0] != ' ') {

        for (let i = 0; i < 3; i++) {


            let tile = document.getElementById(i.toString() + "-" + i.toString());
            tile.classList.add("winner");

        }

        gameOver = true;
        document.getElementById("status").innerText = "🎉 ¡Gana " + board[0][0] + "!";
        return;


    }


    //antidiagonally

    if (board[0][2] == board[1][1] && board[1][1] == board[2][0] && board[0][2] != ' ') {


        let tile = document.getElementById("0-2");
        tile.classList.add("winner");

        tile = document.getElementById("1-1");
        tile.classList.add("winner");

        tile = document.getElementById("2-0");
        tile.classList.add("winner");

        gameOver = true;
        document.getElementById("status").innerText = "🎉 ¡Gana " + board[0][2] + "!";
        return;

    }

    // Check draw
    let isFull = true;
    for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
            if (board[r][c] == ' ') isFull = false;
    if (isFull) {
        gameOver = true;
        document.getElementById("status").innerText = "🤝 ¡Empate!";
    }

}