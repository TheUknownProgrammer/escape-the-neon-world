 // idea. when the player get's on the top. he will stand on the previous platform. but all other one's will again generate randomly.
const game = document.getElementById("game");
const platformsContainer = document.getElementById("platforms");
const stageCount = document.getElementById("stageCount");
const keys = new Set();

const playerDom = document.getElementById("player");
const playerRect = playerDom.getBoundingClientRect();

var gameWidth = game.clientWidth;
var gameHeight = game.clientHeight;

const gravity = 1 / 3; // a third of one.

const ground = { x: 0, y: gameHeight, width: gameWidth, height: parseFloat(window.getComputedStyle(game).borderBottom) };
var platforms = [];
var animationPlayer;
const jumpSound = new Audio("resources/SFXS/jump.mp3");

const spriteSheet = {
  rows: 2,
  cols: 4,
  animationMaxCol: 3,
  sprite: "resources/player-sprite.png",
  cellHeight: 60,
  cellWidth: 60,
  idleRow: 0,
  walkRow: 1,
  jumpRow: 0
};

const randomNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomColor = opacity => `rgba(${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)},${opacity})`;

function generatePlatforms() {
  platforms = [];
  platformsContainer.innerHTML = "";
  for (let i = 0; i < 20; i++) {
    var plat = createPlatform();

    if (Math.random() >= 0.5) {
      plat.leftMax = plat.x - 50;
      plat.rightMax = plat.x + plat.width + 50;
      plat.dx = -(Math.random() * 4 + 2);
      plat.move = function () {
        this.x -= this.dx;
        if (this.x <= this.leftMax || this.x >= this.rightMax) this.dx = -this.dx;
        this.dom.style.left = this.x + "px";
      };
    }

    platforms.push(plat);
    platformsContainer.append(plat.dom);
  }
}

function createPlatform() {
  const plat = document.createElement("div");
  plat.classList.add("platform");

  var width = randomNum(100, 120);
  var height = width / 4;
  var x = randomNum(0, gameWidth - width);
  var y = randomNum(0, gameHeight - height);

  plat.style.width = width + "px";
  plat.style.height = height + "px";
  plat.style.inset = `${y}px 0 0 ${x}px`;

  return { x, y, width, height, dom: plat };
}

const player = {
  x: window.innerWidth / 2 - playerDom.offsetWidth / 2,
  y: gameHeight - playerDom.offsetHeight,
  width: playerRect.width,
  height: playerRect.height,
  dom: playerDom,
  isAllowJump: false,
  dx: 0,
  maxSpeedX: 8,
  dy: 0,
  ground: null,
  falledFromGround: true,
  indexSpriteSheetCol: 0,
  indexSpriteSheetRow: spriteSheet.idleRow,
  animationTimer: 0,
  animationSpeed: 100,
  lastFrameTime: performance.now(),
  update: function () {
    if (this.dx > 0.1) this.dom.style.transform = `scaleX(1)`;
    else if (this.dx < -0.1) this.dom.style.transform = `scaleX(-1)`;

    [this.dx, this.dy, this.x, this.y] = [this.dx, this.dy, this.x, this.y].map(n => parseFloat(n.toFixed(1)));
    this.x += this.dx;
    this.y += this.dy;

    if ((keys.has("ArrowUp") || keys.has("KeyW")) && this.isAllowJump) {
      this.dy = -16;
      this.isAllowJump = false;
      jumpSound.currentTime = 0;
      jumpSound.play();
    }

    if (keys.has("ArrowRight") || keys.has("KeyD")) {
      if (this.dx < this.maxSpeedX) this.dx += 0.1;
      else this.dx = this.maxSpeedX;
    } else if (Math.sign(this.dx) == 1) {
      this.dx -= 0.1;
    }

    if (keys.has("ArrowLeft") || keys.has("KeyA")) {
      if (this.dx > -this.maxSpeedX) this.dx -= 0.1;
      else this.dx = -this.maxSpeedX;
      this.dom.style.transform = "scaleX(-1)";
    } else if (Math.sign(this.dx) == -1) {
      this.dx += 0.1;
    }

    this.bounds();

    const now = performance.now();
    const isMoving = Math.abs(this.dx) > 0.1;
    const isOnGround = this.ground != null && this.y < this.ground.y && (Math.sign(this.dy) == 1 || Math.sign(this.dy) == 0);

    if (isMoving && isOnGround) {
      if (now - this.lastFrameTime > this.animationSpeed) {
        this.indexSpriteSheetCol = (this.indexSpriteSheetCol + 1) % spriteSheet.animationMaxCol;
        this.indexSpriteSheetRow = spriteSheet.walkRow;
        this.lastFrameTime = now;
      }
    } else if (!isOnGround) {
      this.indexSpriteSheetCol = 3;
      this.indexSpriteSheetRow = spriteSheet.jumpRow;
    } else {
      this.indexSpriteSheetCol = 0;
      this.indexSpriteSheetRow = spriteSheet.idleRow;
      this.lastFrameTime = now;
    }

    this.dom.style.inset = `${this.y}px 0 0 ${this.x}px`;
    this.dom.style.backgroundPosition = `-${spriteSheet.cellWidth * this.indexSpriteSheetCol}px -${spriteSheet.cellHeight * this.indexSpriteSheetRow}px`;
  },
  bounds: function () {
    if (this.x + this.width + this.dx >= gameWidth) {
      this.x = gameWidth - this.width;
      this.dx = 0;
    }
    if (this.x + this.dx <= 0) {
      this.x = 0;
      this.dx = 0;
    }
    this.ground = this.getSurface();

    if (this.ground != null && this.y < this.ground.y && (Math.sign(this.dy) == 1 || Math.sign(this.dy) == 0) && collisionSide(this, this.ground) == "bottom") {
      this.dy = 0;
      this.y = this.ground.y - this.height;
      this.isAllowJump = true;

      var isMove = keys.has("ArrowLeft") || keys.has("KeyA") || keys.has("ArrowRight") || keys.has("KeyD");
      if (this.ground.hasOwnProperty("dx") && !isMove) this.dx = -this.ground.dx;
    } else {
      this.dy += gravity;
      this.isAllowJump = false;
    }
  },
  getSurface() {
    return this.playerOnFloor();
  },
  playerOnFloor() {
    var floors = [ground, ...platforms];
    for (let i = 0; i < floors.length; i++) {
      if (collisionDetection(this, floors[i])) return floors[i];
    }
    return null;
  },
};

function init() {
  playerDom.style.left = player.x;
  window.addEventListener("keydown", (e) => keys.add(e.code));
  window.addEventListener("keyup", (e) => keys.delete(e.code));

  // Touch controls for mobile
  document.getElementById("leftBtn").addEventListener("touchstart", () => keys.add("ArrowLeft"));
  document.getElementById("leftBtn").addEventListener("touchend", () => keys.delete("ArrowLeft"));
    
  document.getElementById("rightBtn").addEventListener("touchstart", () => keys.add("ArrowRight"));
  document.getElementById("rightBtn").addEventListener("touchend", () => keys.delete("ArrowRight"));

  document.getElementById("jumpBtn").addEventListener("touchstart", () => keys.add("ArrowUp"));
  document.getElementById("jumpBtn").addEventListener("touchend", () => keys.delete("ArrowUp"));

  ["leftBtn", "rightBtn", "jumpBtn"].forEach(id => {
    document.getElementById(id).addEventListener("touchend", () => {
      keys.delete("ArrowLeft");
      keys.delete("ArrowRight");
      keys.delete("ArrowUp");
    });
  });

  game.style.width = window.innerWidth + "px";
  game.style.height = window.innerHeight + "px";
  gameWidth = game.clientWidth;
  gameHeight = game.clientHeight;
  generatePlatforms();
  requestAnimationFrame(render);
}

function render() {
  player.update();
  renderPlatforms();
  if (player.y < 0) nextStage();
  requestAnimationFrame(render);
}

function nextStage() {
  generatePlatforms();
  document.getElementById("stageContainer").style.backgroundColor = randomColor(0.4);
  document.getElementById("stageContainer").style.color = "white";
  player.y = gameHeight - playerDom.offsetHeight;
  stageCount.textContent = parseInt(stageCount.textContent) + 1;
}

function collisionDetection(rect1, rect2) {
  return (
    rect1.x + rect1.width >= rect2.x &&
    rect1.x <= rect2.x + rect2.width &&
    rect1.y + rect1.height >= rect2.y &&
    rect1.y <= rect2.y + rect2.height
  );
}

function collisionSide(rect1, rect2) {
  var rect1HalfW = rect1.width / 2;
  var rect1HalfH = rect1.height / 2;
  var rect2HalfW = rect2.width / 2;
  var rect2HalfH = rect2.height / 2;
  var rect1CenterX = rect1.x + rect1.width / 2;
  var rect1CenterY = rect1.y + rect1.height / 2;
  var rect2CenterX = rect2.x + rect2.width / 2;
  var rect2CenterY = rect2.y + rect2.height / 2;

  var diffX = rect1CenterX - rect2CenterX;
  var diffY = rect1CenterY - rect2CenterY;

  var minXDist = rect1HalfW + rect2HalfW;
  var minYDist = rect1HalfH + rect2HalfH;

  var depthX = diffX > 0 ? minXDist - diffX : -minXDist - diffX;
  var depthY = diffY > 0 ? minYDist - diffY : -minYDist - diffY;

  if (depthX != 0 && depthY != 0) {
    if (Math.abs(depthX) < Math.abs(depthY)) {
      return depthX > 0 ? "left" : "right";
    } else {
      return depthY > 0 ? "top" : "bottom";
    }
  }
}

function renderPlatforms() {
  platforms.forEach(function (plat) {
    if (plat.hasOwnProperty("move")) plat.move();
  });
}

window.addEventListener("load", init);
