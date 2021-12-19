// Using the p5.js library
// REFERENCE: https://p5js.org/reference/

var sim;
var simDisplay;
var app;
var server;

const WIDTH = 600;
const HEIGHT = 530;

// Simulation parameters
const N = 6;
const SPEED = 2;
const MAX_SPEED =  3;
const PERSON_SIZE = 20;
const PROB_TRANSITION_TO_BUSY = 0.005;
const BUSY_DURATION = 300;
const PROB_FOR_INITIATING_TEST = 0.0005;
const TEST_DURATION = 500;
const PROB_PATH_DERIVATION = 0.05

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

//==================================//
// Code for creating the simulation
//==================================//

class Simulation {
  constructor(n, size, width, height) {
    this.n = n;
    this.size = size;
    this.width = width;
    this.height = height;
    
    this.persons = [];
    
    // Add some people
    for (let i=0; i<n; i++) {
      this.persons.push(new Person(random() * (this.width-2*sim_offset_x) + sim_offset_x,
                                   random() * (this.height-2*sim_offset_y) + sim_offset_y,
                                   20,
                                   "grey",
                                   i,
                                   this.width,
                                   this.height));
    }
    
    this.persons[0].color = "lime";
    this.persons[1].color = "red";
  }
  
  update() {
    this.persons.forEach(person => person.update());
    
    // TODO: Check if people are close to each other; if yes:
    // - Set both to busy (talking to each other)
    // - Create popup, indicating that IDs got exchanged
    // - Maybe also change color (pulsating brightness?)
    // - If "our" light green dot is involved:
    //   display new ID under "Collected IDs"
  }
}


class Person {
  constructor(posx, posy, size, color, id, simWidth, simHeight) {
    this.posx = posx;
    this.posy = posy;
    this.speedx = (2*random()-1) * SPEED;
    this.speedy = (2*random()-1) * SPEED;
    this.size = size;
    this.color = color;
    this.id = id;
    this.width = simWidth;
    this.height = simHeight;
    this.state = "walking";
    this.busyCounter = 0;
  }
  
  update() {
    if (this.state == "busy") {
      this.busyCounter -= 1;
      
      if (this.busyCounter <= 0) {
        this.state = "walking";
      }
      
    } else if (this.state == "walking") {
      //changes the speed by the same random value for x and y with a given chance, limits the absolute of the maximum speed to a global variable
      this.variation=2*sin(2*PI*random());

      if (random()<PROB_PATH_DERIVATION){
        this.speedx +=this.variation;
        if (this.speedx>MAX_SPEED){
          this.speedx=MAX_SPEED
        } else if (this.speedx<-MAX_SPEED){
          this.speedx=-MAX_SPEED
        }

        this.speedy +=this.variation;
        if (this.speedy>MAX_SPEED){
          this.speedy=MAX_SPEED
        } else if (this.speedy<-MAX_SPEED){
          this.speedy=-MAX_SPEED
        }
      }

      this.posx += this.speedx;
      this.posy += this.speedy;
      this.checkWallCollision();
      
      if (random() < PROB_FOR_INITIATING_TEST) {
        //Test this person for corona
        this.state="busy"

        // TODO: Test this person for Corona
        // - Set to busy for TEST_DURATION
        // - Indicate test process with a popup
        // - Indicate test result
        // - If result is positive:
        //   * Send ID to RKI-Server
        //   * Set color of dot to red
        //   * Send dot to quarantine, 
        //     e.g. let it walk out of the boundaries
      
      } else if (random() < PROB_TRANSITION_TO_BUSY) {
        this.state = "busy";
        this.busyCounter = BUSY_DURATION + random() * BUSY_DURATION;
      }
    }
  }
  
  checkWallCollision() {
    if (this.posx < this.size/2 | 
        this.posx > this.width - this.size/2) {
      this.speedx *= -1;
      }
    if (this.posy < this.size/2 | 
        this.posy > this.height - this.size/2) {
      this.speedy *= -1;
    }
  }
}


//=================================//
// Code for drawing the simulation
//=================================//

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
    
    // Draw circles for people
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
                                       "lightgrey")
    
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