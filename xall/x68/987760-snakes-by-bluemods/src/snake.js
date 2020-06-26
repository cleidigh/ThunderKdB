
/*
    Properties
*/
const canvasSize = {
  x: 500,
  y: 500
};

const blockSize = 10;

const grid = {
  x: Math.floor(canvasSize.x / blockSize),
  y: Math.floor(canvasSize.y / blockSize)
};

const snakeVelocity = {
  x: 1,
  y: 0
};

let snakeLength = 5;
const foodPosition = { x: 20, y: 20 };
let snakePosition = [];

const canvas = document.querySelector("#snake");
const ctx = canvas.getContext("2d");

/* Prepare Canvas */
canvas.height = canvasSize.y;
canvas.width = canvasSize.x;
canvas.style.background = "#000";


/*
    Set Game
*/
const interval = setInterval(() => {
  game();
}, 1000 / 10);
/*
  Handles all gaming processes
*/

function game() {
  drawSnake();
  if(hasEatenFood()){
    newFood();
    increaseSnakeSize();
  }
  placeFood();
}

/*
  Draw Snake
*/
function drawSnake() {
  ctx.clearRect(0, 0, canvasSize.x, canvasSize.y);
  if (snakePosition.length === 0) {
    for (let i = 0; i < snakeLength; i++) {
      const x = grid.x / 2 - i;
      const y = grid.y / 2;
      snakePosition.push({ x, y });
    }
  }
 //debugger;
  const newSnakePosition = snakePosition.map(function({ x, y }, index) {
    if (x > grid.x) {
      x = 0;
    }
    if (y > grid.y) {
      y = 0;
    }
    if (x < 0) {
      x = grid.x;
    }
    if (y < 0) {
      y = grid.y;
    }

    ctx.fillStyle = "#ff0000";
    const xPos = x * blockSize;
    const yPos = y * blockSize;
    ctx.fillRect(xPos, yPos, blockSize, blockSize);

    if (index === 0) {
      x += snakeVelocity.x;
      y += snakeVelocity.y;
    } else {
      // Move position by one index
      return snakePosition[index - 1];
    }
    return { x, y };
  });
  snakePosition = newSnakePosition;
}
/* 
    Food Placer
*/
function placeFood() {
  ctx.fillStyle = "#00ff00";
  ctx.fillRect(
    foodPosition.x * blockSize,
    foodPosition.y * blockSize,
    blockSize,
    blockSize
  );
}
/*
    Increase Snake Size
*/
function increaseSnakeSize(){
    const tail  = snakePosition.slice(-1);
    snakePosition.push(tail);
}
/*
    Generates a new food item;
*/
function newFood(){
    foodPosition.x = Math.floor(Math.random() * grid.x);
    foodPosition.y = Math.floor(Math.random() * grid.y);
}
/* 
    Did snake eat food;
*/
function hasEatenFood(){
    const xEqual = snakePosition[0].x == foodPosition.x;
    const yEqual = snakePosition[0].y == foodPosition.y;
    return xEqual  && yEqual;
}
/*
  Input Handler
*/
window.addEventListener("keydown", event => {
  const keyCode = event.keyCode;
  if (keyCode === 38) {
    // Up arrow key
    snakeVelocity.y = -1;
    snakeVelocity.x = 0;
  } else if (keyCode === 39) {
    // Right Arrow Key
    snakeVelocity.y = 0;
    snakeVelocity.x = 1;
  } else if (keyCode === 40) {
    // Bottom Arrow Key
    snakeVelocity.y = 1;
    snakeVelocity.x = 0;
  } else if (keyCode === 37) {
    // Left Key
    snakeVelocity.y = 0;
    snakeVelocity.x = -1;
  }
});

function up(){
  snakeVelocity.y = -1;
  snakeVelocity.x = 0;
}
function down(){
  snakeVelocity.y = 1;
  snakeVelocity.x = 0;
}
function left(){
  snakeVelocity.y = 0;
  snakeVelocity.x = -1;
}
function right(){
  snakeVelocity.y = 0;
  snakeVelocity.x = 1;
}
