// Using the p5.js library
// REFERENCE: https://p5js.org/reference/

var sim;
var simDisplay;
var app;
var server;

const WIDTH = 600;
const HEIGHT = 530;

// Simulation parameters
const N = 10;
const SPEED = 3;
const PERSON_SIZE = 20;

// Global vars for boundaries of simulation
var sim_offset_x = 10;
var sim_offset_y = 20;
var sim_size_x = 3/5 * WIDTH - 20;
var sim_size_y = HEIGHT - 2*20;

// Global vars for app/server size
var app_height = 280;
var server_height = 200;

// Global vars for textblock size
const ownIDHeight = 65;
const collectedIDsHeight = 130;
const serverIDsHeight = 130;
const CORNER_RADIUS = 8;

function setup() {
  var canvas = createCanvas(WIDTH, HEIGHT);
  // Move the canvas so it’s inside our <div id="sketch-holder">.
  canvas.parent('sketch-holder');
  
  sim = new Simulation(N, PERSON_SIZE, sim_size_x, sim_size_y);
  
  simDisplay = new SimulationDisplay(sim_offset_x, 3/5 * width - 20, sim_offset_y);
  
  app = new WarnAppDisplay(3/5 * width,
                           sim_offset_y,
                           2/5 * width - 10,
                           app_height,
                           20,
                           20);
  
  server = new ServerDisplay(3/5 * width,
                             sim_offset_y + app_height + 10,
                             2/5 * width - 10,
                             server_height,
                             20,
                             20);
  
  // Dynamically update HTML elements with JS variables
  document.getElementById("heading").innerHTML = "Subtitle changed...";
  document.getElementById("name").innerHTML = "Jane Doe";

}

function draw() {
  background(220);
  
  sim.update();
  
  simDisplay.draw();
  app.draw();
  server.draw();
}

class Simulation {
  constructor(n, speed, size, width, height) {
    this.n = n;
    this.speed = speed;
    this.size = size;
    this.width = width;
    this.height = height;
    
    this.persons = [];
    for (let i=0; i<n; i++) {
      this.persons.push(new Person(random() * this.width * 0.8 + sim_offset_x,
                                   random() * this.height * 0.8 + sim_offset_y,
                                   random()*this.speed,
                                   random()*this.speed,
                                   20,
                                   "green",
                                   i,
                                   this.width,
                                   this.height));
    }
    this.persons[0].color = "lime";
    this.persons[1].color = "red";
  }
  
  update() {
    this.persons.forEach(person => person.update());
    
    // TODO: Collide and store IDs of collision
  }
}

class Person {
  constructor(posx, posy, speedx, speedy, size, color, id, simWidth, simHeight) {
    this.posx = posx;
    this.posy = posy;
    this.speedx = speedx;
    this.speedy = speedy;
    this.size = size;
    this.color = color;
    this.id = id;
    this.width = simWidth;
    this.height = simHeight;
  }
  
  update() {
    this.posx += this.speedx;
    this.posy += this.speedy;
    
    if (this.posx < this.size/2 | this.posx > this.width - this.size/2) {
      this.speedx *= -1;
    }
    if (this.posy < this.size/2 | this.posy > this.height - this.size/2) {
      this.speedy *= -1;
    }
  }
}

class Element {
  constructor(offset_x, offset_y, size_x, size_y) {
    this.offset_x = offset_x;
    this.offset_y = offset_y;
    this.size_x = size_x;
    this.size_y = size_y;
    this.corner_radius = CORNER_RADIUS;
  }
  
  draw() {
    push();
    translate(this.offset_x, this.offset_y);
    
    // For shaddows
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = color(0);
    
    noStroke();
    rect(0, 0, this.size_x, this.size_y, this.corner_radius);
    pop();
  }
}

class TextElement extends Element {
  constructor(offset_x, offset_y, size_x, size_y, title, subtitle, color) {
    super(offset_x, offset_y, size_x, size_y, title, subtitle, color);
    this.title = title;
    this.subtitle = subtitle;
    this.color = color;
  }
  
  draw() {
    push();
    fill(this.color);
    super.draw();
    
    translate(this.offset_x, this.offset_y);
    fill(0);
    
    // Render title
    textSize(20);
    textStyle(BOLD);
    text(this.title, 15, 25);
    
    // Render subtitle
    textSize(15);
    textStyle(NORMAL);
    text(this.subtitle, 15, 50);
    pop();
  }
}

class SimulationDisplay extends TextElement {
  constructor(offset_x, size_x, margin) {
    super(offset_x, margin, size_x, height - 2*margin, "Simulation", "", "white");
  }
  
  draw() {
    super.draw();
    
    push();
    translate(sim_offset_x, sim_offset_y);
    
    // For shaddows
    drawingContext.shadowBlur = 5;
    drawingContext.shadowColor = color(0);
    drawingContext.shadowOffsetY = 5;
    drawingContext.shadowOffsetX = -5;
    
    stroke("black");
    
    sim.persons.forEach(person => {
      fill(person.color);
      circle(person.posx, person.posy, person.size);
    });
    pop();
  }
}

class TextBlockList extends TextElement {
  constructor(offset_x, offset_y, size_x, size_y, elementMarginX, elementMarginY, title, subtitle, color) {
    super(offset_x, offset_y, size_x, size_y, title, subtitle, color);
    this.elementMarginX = elementMarginX;
    this.elementMarginY = elementMarginY;
  }
  
  draw() {
    super.draw();
    push();
    translate(this.offset_x, this.offset_y);
    
    translate(this.elementMarginX, 30);
    for (let element of this.elements) {
      translate(0, this.elementMarginY);
      element.draw();
      translate(0, element.size_y);
    }
    pop();
  }
}

class WarnAppDisplay extends TextBlockList {
  constructor(offset_x, offset_y, size_x, size_y, elementMarginX, elementMarginY) {
    super(offset_x, offset_y, size_x, size_y, elementMarginX, elementMarginY, "Corona-Warn-App", "", "white");
    
    let ownID = new TextElement(0,
                                0,
                                this.size_x-2*elementMarginX,
                                ownIDHeight,
                                "My own ID",
                                "hello-world",
                                "lime");
    
    let collectedIDs = new TextElement(0,
                                       0,
                                       this.size_x - 2*elementMarginX,
                                       collectedIDsHeight, 
                                       "Collected IDs", 
                                       "aaaa-aaaaa\nbbbb-bbbb\ncccc-cccc",
                                       "orange")
    
    this.elements = [ownID, collectedIDs];
  }
}

class ServerDisplay extends TextBlockList {
  constructor(offset_x, offset_y, size_x, size_y, elementMarginX, elementMarginY) {
    super(offset_x, offset_y, size_x, size_y, elementMarginX, elementMarginY, "RKI-Server", "", "white");
    
    let serverIDs = new TextElement(0,
                                    0,
                                    this.size_x - 2*elementMarginX,
                                    serverIDsHeight,
                                    "Infected IDs",
                                    "bbbb-bbbb",
                                    "red")
    
    this.elements = [serverIDs];
  }
}