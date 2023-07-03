
//=========================================================================================================================
// The attributes of the player_______________________________________________________
//=========================================================================================================================

var player = {
  last_x:200,
  last_y: 200,
  x: 200,
  y: 200,
  x_v: 0,
  y_v: 0,
  on_wall: false,
  wall_to_left: false,
  jump: true,
  jump_count: 1,
  height: 50,
  width: 20,
  facing_left: false,
  sprint: false,
  last_directional_press: 0
  };


//=========================================================================================================================
// Game variables______________________________________________________________________
//=========================================================================================================================

// The friction and gravity to show realistic movements
var gravity = 0.6;
var friction = 0.7;
// The number of platforms
const num_walls = 3;
const num_platforms = 3; 
// The platforms
var platforms = [];
var walls = [];
const maxjumps = 2;
const clock = new Date();


//=========================================================================================================================
//Render________________________________________________________________________________
//=========================================================================================================================

// Function to render the canvas
function renderCanvas(){
  var background = new Image();
  background.src = "/assets/images/background.jpg";
  ctx.drawImage(background,0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
  //ctx.fillStyle = "#F0F8FF";
  //ctx.fillRect(0, 0, 600, 600);
}

// Function to render the player
function renderPlayer(){
  /**   debug option 
  ctx.fillStyle = "#F08080";
  ctx.fillRect((player.x)-20, (player.y)-20, player.width, player.height);
  */

  
  if(player.facing_left){    //facing left
    if(keys.down){
      crouch_left(player.x - 40,player.y - 50);
    }else if(player.jump_count>0){
      jump_left(player.x - 40, player.y - 50);
    }else if(keys.left && !player.jump){
      if(player.sprint){
        sprint_left(player.x - 40, player.y - 50);
      }else{
        walk_left(player.x - 40, player.y - 50);
      }
    }else{
      stand_left(player.x - 40,player.y -50);
    }
  }else{                     //facing right
    if(keys.down){
      crouch_right(player.x - 40,player.y - 50);
    }else if(player.jump_count>0){
    jump_right(player.x - 40,player.y - 50);
    }else if(keys.right && !player.jump){
      if(player.sprint){
        sprint_right(player.x - 40,player.y - 50);
      }else{
        walk_right(player.x - 40,player.y - 50);
      }
    }else{
      stand_right(player.x-40,player.y -50);
    }
  }
  
}

// Function to create platforms
function createPlat(){
  platforms.push({x: (CANVAS_WIDTH/2) * -1, y: CANVAS_HEIGHT - 30, width: CANVAS_WIDTH * 2, height: 30});
  for(i = 1; i < num_platforms; i++) {
      x_offset = Math.random() * (500 - 100) + 100;
      y_offset = Math.random() * (560 - 400) + 400;
      platforms.push({x: x_offset, y: y_offset,width: 110, height: 15});
  }
}

function createWall(){
  walls.push({x: -10, y: -30, width: 30, height: CANVAS_HEIGHT}); // left wall
  walls.push({x: CANVAS_WIDTH - 20, y: -30, width: 30, height: CANVAS_HEIGHT}); // right wall
  for(i = 2; i < num_platforms; i++) {
      x_offset = Math.random() * (500 - 100) + 100;
      heigh_offset = Math.random() * (500 - 100) + 100;
      walls.push({x: x_offset, y: CANVAS_HEIGHT - heigh_offset - 65, width: 75, height: heigh_offset});
  }
}

// Function to render platforms
function renderPlat(){
  ctx.fillStyle = "#45597E";
  for(i = 0; i < num_platforms; i++) {
    ctx.fillRect(platforms[i].x, platforms[i].y, platforms[i].width, platforms[i].height);
  }
}

// Function to render platforms
function renderWall(){
  ctx.fillStyle = "#4E3000";
  for(i = 0; i < num_walls; i++) {
    ctx.fillRect(walls[i].x, walls[i].y, walls[i].width, walls[i].height);
  }
}


//=========================================================================================================================
// The status of the arrow keys_____________________________________________________________________
//=========================================================================================================================
var keys = {
  right: false,
  left: false,
  up: false,
  down: false
  };

// This function will be called when a key on the keyboard is pressed
function keydown(e) {
  // 37 is the code for the left arrow key
  if(e.keyCode == 37) {
      if(player.facing_left && (player.last_directional_press - clock.getTime()) < 10){
        player.sprint = true;
        player.height = 36
      } 
      keys.left = true;
      player.facing_left = true;
  }
  // 38 is the code for the up arrow key
  if(e.keyCode == 38) {
      if(keys.up == false && player.jump_count < maxjumps) { // only jump on repress
        PLAYER_ANIMATION_PHASE = 0; 
        playerJump();
        }
      keys.up = true;
      }
  // 39 is the code for the right arrow key
  if(e.keyCode == 39) {
      if(!player.facing_left && (player.last_directional_press - clock.getTime()) < 10){
        player.sprint = true;
        player.height = 36
      }  
      keys.right = true;
      player.facing_left = false;
  }
  // 40 is the code for the down arrow key
  if(e.keyCode == 40) {
    player.sprint = false;
    keys.down = true;
    player.height = 33
  }
}
// This function is called when the pressed key is released
function keyup(e) {
  player.height = 50;
  if(e.keyCode == 37) {
      last_directional_press = clock.getTime();
      keys.left = false;
      player.sprint = false;
  }
  if(e.keyCode == 38) {
    keys.up = false;
      if(player.y_v < -4) {
      player.y_v = -5;
      }
  }
  if(e.keyCode == 39) {
      last_directional_press = clock.getTime();
      keys.right = false;
      player.sprint = false;
  }
  if(e.keyCode == 40) {
    keys.down = false;
  }
} 



//=========================================================================================================================
//Collison________________________________________________________________________________________________________________________
//=========================================================================================================================

function platformCollision(){
  let platform_id = -1;
  
  for(idx = 1; idx < num_platforms; idx++) {
    if(platforms[idx].x < player.x && player.x - player.width < platforms[idx].x + platforms[idx].width){ // if within platform
      if(platforms[idx].y < player.y && player.last_y < platforms[idx].y + platforms[idx].height){ // check if passes in y axis
        if(keys.down){// pass through platforms on down key press
          return
        }
        platform_id = idx;
      }
    }
    if (platform_id > -1){
        player.jump = false; // landed
        player.jump_count = 0;
        player.y = platforms[platform_id].y;
        player.last_y = platforms[platform_id].y;   
    }
    if (player.y > platforms[0].y){ //prevent fall off world worse case
      player.jump = false; 
      player.jump_count = 0;
      player.y = platforms[0].y; 
      player.last_y = platforms[0].y; 
    }
  }
}

function wallCollision(){
  let touching_wall = -1; //no wall
  let on_left = false;
  var playerSides = { 
    bottom: player.y,
    top: (player.y - player.height),
    left: player.x - player.width,
    right: (player.x),
    last_left: player.last_x - player.width,
    last_right: (player.last_x)
  };// get sides
  for(idx = 0; idx < num_walls; idx++){ // for each wall
    let wallSides = {
      top: walls[idx].y,
      bottom: (walls[idx].y + walls[idx].height),
      left: walls[idx].x,
      right: (walls[idx].x + walls[idx].width)
    };
    if(playerSides.top < wallSides.bottom && playerSides.bottom > wallSides.top){ // in y axis of wall
      if(playerSides.right >= wallSides.left && playerSides.last_right <= wallSides.left){ //hit left side of wall
        on_left = true;
        touching_wall = idx;
      }
      if(playerSides.left <= wallSides.right && playerSides.last_left >= wallSides.right){ //hit right side of wall
        touching_wall = idx;
      }
    }

    if(playerSides.right > wallSides.left + 5 && playerSides.left < wallSides.right - 5 && playerSides.bottom >= wallSides.top && playerSides.bottom <= wallSides.top + 25){
      if( playerSides.top < wallSides.bottom ){
        player.y = wallSides.bottom + player.height + 1 ;
        player.y_v = 0;
        if( playerSides.bottom < wallSides.bottom){
          player.jump_count = 0;
          player.jump = false;
          player.y = wallSides.top;
      }
    }
  }
}
  //wall logic
    if(touching_wall > -1){
      if(player.on_wall == false){
        player.jump_count = 0;
        player.on_wall = true;
      }
      if((keys.left || keys.right) && !keys.up ){
        player.jump = false;
        player.y_v = .25;
      }
      if(on_left){ //player left of wall   * ||
        player.x = (walls[touching_wall].x);
        player.last_x = (walls[touching_wall].x);
        wall_to_left = false;
      }else{ //player right of wall        || *
        player.x = (walls[touching_wall].x + walls[touching_wall].width) + player.width;
        player.last_x = (walls[touching_wall].x + walls[touching_wall].width) + player.width;
        player.wall_to_left = true;
      }
    }else{
      player.on_wall = false;
    }
  }

// Function to check collision with platforms
function checkCollision(){
  platformCollision();
  wallCollision()
}



//=========================================================================================================================
//GameLoop Functions_______________________________________________________________________________________________________
//=========================================================================================================================

function applyFriction(){
  // If the player is not jumping apply the effect of frictiom
  if(player.jump == false) {
      player.x_v *= friction;
  }else {
      // If the player is in the air then apply the effect of gravity
      player.y_v += gravity;
  }
  player.jump = true;
}


function render(){
  // Rendering the canvas, the player and the platforms
  renderCanvas();
  renderPlat();
  renderWall();
  renderPlayer();
}

// change here


//=========================================================================================================================
//Player Animation and Motion______________________________________________________________________________________________
//=========================================================================================================================

function updatePlayer(){
// If the left key is pressed increase the relevant horizontal velocity
  if(keys.left) {
    if(keys.down){
      if(player.x_v < -3){
        player.x_v *= .8;
      }else{
        player.x_v = -.5;
      }
    }else if(player.sprint){
      player.x_v = -7;
    }else{player.x_v = -2;}
  }
  if(keys.right) {
    if(keys.down){
      if(player.x_v > 3){
        player.x_v *= .8;
      }else{
        player.x_v = .5;
      }
    }else if(player.sprint){
      player.x_v = 7;
    } else{
      player.x_v = 2;
    }
  }
  
  // Updating the y and x coordinates of the player
  player.last_x = player.x;
  player.last_y = player.y;
  if(player.jump == false){
    player.y += 1.5
  }else{
    player.y += player.y_v;
  }
  player.x += player.x_v;
}

function playerJump(){
  player.jump = true;
  player.jump_count++;
  player.y_v = -10;
}

function loop() {
  applyFriction();
  updatePlayer();
  checkCollision();
  render();
}

createPlat();
createWall();

// Adding the event listeners
document.addEventListener("keydown",keydown);
document.addEventListener("keyup",keyup);
setInterval(loop,22);
