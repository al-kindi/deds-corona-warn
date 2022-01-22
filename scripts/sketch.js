// Using the p5.js library
// REFERENCE: https://p5js.org/reference/



//=================================//
//   Initialize global variables
//=================================//
var sim;
var simDisplay;
var app;
var server;
var serverDisplay;

// Sliders for constants
var slider_max_n;
var slider_speed;
var slider_critical_distance;
var button_use_app; //TODO

const WIDTH = 800;
const HEIGHT = 600;

// Simulation parameters
var MAX_N = 10;
var MIN_N = 0.6 * MAX_N;
var SPEED = 1;
const PERSON_SIZE = 5;
const PROB_PATH_DERIVATION = 0.05
var CRITICAL_DISTANCE = 20
const POPUP_DISPLAY_DURATION = 200;
const USE_APP = true;
var SELECTED_PERSON = null;
var PROB_INFECTION = 0.1;

// Global vars for app/display size
var app_height = 280;
var setting_height = 30;

// Global vars for boundaries of simulation
var sim_offset_x = 10;
var sim_offset_y = 20;
var sim_size_x = 3/5 * WIDTH - 20;
var sim_size_y = HEIGHT - 2*20 - setting_height;

// Global vars for position of slide description
var y_location = sim_offset_y+sim_size_y+15+setting_height/2;

//global vars for server height
var server_height = sim_size_y-app_height-sim_offset_y+10;

// Global vars for textblock size
const ownIDHeight = 65;
const collectedIDsHeight = 130;
const serverIDsHeight = server_height-20-45;
const CORNER_RADIUS = 8;

// RKI Server Constants
var rki_infected_ids = []

// Enum for the states of a person
class State {
  static HEALTHY = new State('HEALTHY');
  static INFECTED = new State('INFECTED');
  static QUARANTINING = new State('QUARANTINING');
  constructor(name) { this.name = name }
}


//=================================//
//      Runs once at startup
//=================================//
function setup() {
  var canvas = createCanvas(WIDTH, HEIGHT);
  // Move the canvas so it’s inside our <div id="sketch-holder">.
  canvas.parent('sketch-holder');
  
  sim = new Simulation(PERSON_SIZE, sim_size_x, sim_size_y);
  
  simDisplay = new SimulationDisplay(sim_offset_x, 3/5 * width - 20, sim_offset_y);
  
  app = new WarnAppDisplay(3/5 * width,
                           sim_offset_y,
                           2/5 * width - 10,
                           app_height,
                           20,
                           20);

  server = new RKIServer();
  
  serverDisplay = new ServerDisplay(3/5 * width,
                             sim_offset_y + app_height + 10,
                             2/5 * width - 10,
                             server_height,
                             20,
                             20);

  settingDisplay = new SettingDisplay(sim_offset_x,
      sim_offset_y + sim_size_y +10,
      width-sim_offset_y,
      setting_height);


  createSliders();
  
  // Dynamically update HTML elements with JS variables
  // document.getElementById("heading").innerHTML = "Subtitle changed...";
  // document.getElementById("name").innerHTML = "John Doe";
}


//=================================//
//        Runs every frame
//=================================//

function draw() {
  background(220);

  updateConstantsFromSliders();
      
  sim.update();
  serverDisplay.update();
  app.update();

  simDisplay.draw();
  app.draw();
  serverDisplay.draw();
  settingDisplay.draw();
  drawSliderLabels();
}

//=================================//
// Runs every time the mouse is pressed
//=================================//

function mousePressed() {
  // When a person is clicked on, their app content is displayed on the right
  let personSize = sim.persons[0].size;
  for (let i=0; i<sim.persons.length; i++) {
    if ((Math.abs(mouseX - sim_offset_x - sim.persons[i].posx) < personSize) &&
        (Math.abs(mouseY - sim_offset_y - sim.persons[i].posy) < personSize)) {
      SELECTED_PERSON = sim.persons[i];
      break;
    }
  }
}


//==================================//
// Code for creating the simulation
//==================================//
class Simulation {
  constructor(size, width, height) {
    this.actual_n = 0;
    this.size = size;
    this.width = width;
    this.height = height;
    this.frameCount = 0;
    this.idCount = 0;
    
    this.persons = [];
    this.popups = [];

    // Add some people
    for (let i=0; i<MAX_N; i++) {
      this.idCount += 1;
      this.persons.push(new Person(random() * (this.width-2*sim_offset_x) + sim_offset_x,
                                   random() * (this.height-2*sim_offset_y) + sim_offset_y,
                                   20,
                                   "grey",
                                   this.idCount,
                                   this.width,
                                   this.height));
    }
    this.actual_n = MAX_N;

    // Highlight special people
    //this.persons[0].color = "lime";
    //this.persons[1].color = "red";
  }
  
  update() {

    // Check which people are still alive, keep only these
    let stillAlive=[];
    for (let j=0;j<this.persons.length;j++){
      this.persons[j].update();
      if (!this.persons[j].hasLeftField){
        stillAlive.push(this.persons[j]);
        }
    }

    // Replenish pool of people if too many have dropped out
    if (stillAlive.length < MIN_N) {
      for (let k=stillAlive.length; k<MIN_N; k++) {
        this.idCount += 1;
        stillAlive.push(new Person(random() * (this.width-2*sim_offset_x) + sim_offset_x,
                               random() * (this.height-2*sim_offset_y) + sim_offset_y,
                               20,
                               "grey",
                               this.idCount,
                               this.width,
                               this.height));
      }
    }
    this.persons=stillAlive;
    this.actual_n = this.persons.length;

    // Update popups
    this.popups.forEach(popup=>popup.update());

    // Infect people
    if(this.frameCount%10 == 0){
        this.exchangeIDsAndInfectNearbyPeople();
    }
    this.frameCount += 1;
    //console.log(this.frameCount);
  }

  // Danger zone: quadratic runtime!
  exchangeIDsAndInfectNearbyPeople() {
    for (let i=0; i<this.persons.length; i++) {

      // For all people, check:
        for (let j=0; j<this.persons.length; j++) {

        // Only for people that are still healthy, check:
        if (i != j && this.persons[j].healthState == State.HEALTHY) {
          let proximity = this.persons[i].check_distance(this.persons[j])
          if (proximity) {
            // Send ID of person i to person j
            this.persons[j].registerID(this.persons[i].id)

            // If person i is infected, also infect person j wit probability PROP_INFECTION:
            if (this.persons[i].healthState != State.HEALTHY) {
              if(random()< PROB_INFECTION ){
                this.persons[j].getInfected();
              }

            }
          }
        }
      }
    }
  }
}


class RKIServer {
  constructor() {
  }

  checkIDs(ids) {
    let foundInfected = false;
    for (let i=0; i<ids.length; i++) {
      foundInfected = foundInfected || rki_infected_ids.includes(ids[i]);
    }
    return foundInfected;
  }

  registerInfected(id) {
    rki_infected_ids.push(id);
  }
}


class Person {
  constructor(posx, posy, size, color, id, simWidth, simHeight) {
    this.posx = posx;
    this.posy = posy;
    let movementDirection = p5.Vector.random2D();
    this.speedx = movementDirection.x;
    this.speedy = movementDirection.y;
    this.size = size;
    this.color = color;
    this.id = id;
    this.width = simWidth;
    this.height = simHeight;

    this.collectedIDs = [];

    this.healthState = State.HEALTHY;
    this.timer = 100 + 1000 * random();
    this.hasLeftField=false;
  }

  getInfected() {
    this.healthState = State.INFECTED;
    this.timer = 50 + 500 * random();
    this.color = "red";

    let textbox = new Popup(this.posx,this.posy,100,30,"Infected!","black", POPUP_DISPLAY_DURATION);
    sim.popups.push(textbox); 
  }

  getSymptoms() {
    this.healthState = State.QUARANTINING;
    this.color = "purple";

    // Notify RKI of your infection and go to quarantine
    server.registerInfected(this.id);
    let textbox = new Popup(this.posx,this.posy,100,30,"Quarantining","black", POPUP_DISPLAY_DURATION);
    sim.popups.push(textbox); 
  }

  registerID(id) {
    this.collectedIDs.push(id);

    let textbox = new Popup(this.posx,this.posy,100,30,"Exchanged ID","black", POPUP_DISPLAY_DURATION);
    sim.popups.push(textbox); 
  }

  move() {
    //changes the speed by the same random value for x and y with a given chance, limits the absolute of the maximum speed to a global variable
    this.variation=2*sin(2*PI*random());

    if (random()<PROB_PATH_DERIVATION){
      let newDirection = p5.Vector.random2D();
      this.speedx = newDirection.x;
      this.speedy = newDirection.y;
    }
    this.posx += this.speedx * SPEED;
    this.posy += this.speedy * SPEED;
  }

  moveLeft() {
    //moves to quarantine
    this.posx -= 5;
    if (this.posx < -2*this.size){
      this.hasLeftField = true;
    }
  }
  
  update() {
    switch (this.healthState) {
      case State.HEALTHY:
        if (this.timer > 0) {
          this.timer -= 1;
          this.move();
          this.checkWallCollision();

          if (USE_APP) {
            let riskContact = server.checkIDs(this.collectedIDs);
            if (riskContact) {
              //this.healthState = State.QUARANTINING; // Unneccesary?
              // TODO: Popup saying "tested negative" or something
            }
          }

        } else {
          // In this phase, if the timer reaches 0 the person gets infected randomly
          this.getInfected();
        }
        break;

      case State.INFECTED:
        if (this.timer > 0) {
          this.timer -= 1;
          this.move();
          this.checkWallCollision();
          if (USE_APP) {
            let riskContact = server.checkIDs(this.collectedIDs);
            if (riskContact) {
              this.healthState = State.QUARANTINING;
              server.registerInfected(this.id);
              // TODO: Popup saying "tested positive" or something
            }
          }

        } else {
          // In this phase, if the timer reaches 0 the person gets symptoms and quarantines themself
          this.getSymptoms();
        }
        break;

      case State.QUARANTINING:
        this.moveLeft();
        break;
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

  // Returns true if the other person is within the critical distance
  // to get infected and exchange ids
  check_distance(person){
    if (this !== person) {        
      let distance = Infinity
      distance = sqrt((this.posx-person.posx)**2 + (this.posy-person.posy)**2)

      if (distance < CRITICAL_DISTANCE) {
        let textbox = new Popup(this.posx,this.posy,120,30,"ID exchange","black",10);
        sim.popups.push(textbox);

        return true;
      
      } else {

        return false;
      }
    }
  }
}


//=================================//
// Code for drawing the simulation
//=================================//
function createSliders() {
  // Syntax: createSlider(min, max, [initial_value], [step_size])
  slider_max_n = createSlider(5, 50, 10, 5);
  slider_speed = createSlider(0.5, 5, 1, 0.5);
  slider_critical_distance = createSlider(10, 100, 30, 10);
  
  slider_max_n.position(40, y_location);
  slider_speed.position(180, y_location);
  slider_critical_distance.position(300, y_location);

  slider_max_n.style('width', '80px');
  slider_speed.style('width', '80px');
  slider_critical_distance.style('width', '80px');
}

function drawSliderLabels() {
  fill(0);
  text("N", 30, y_location-2);
  text("Speed", 130, y_location-2);
  text("Dist", 270, y_location-2);
}

function updateConstantsFromSliders() {
  MAX_N = slider_max_n.value();
  SPEED = slider_speed.value();
  CRITICAL_DISTANCE = slider_critical_distance.value();

  MIN_N = 0.6 * MAX_N;
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
    super(offset_x, margin, size_x, sim_size_y, "Simulation", "", "white");
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
    // Draw Text boxes
    sim.popups.forEach(popup=>popup.show());
    
    // Draw circles for people
    sim.persons.forEach(person => {
      fill(person.color);
      circle(person.posx, person.posy, person.size);
      textSize(10);
      fill(255);
      textAlign(CENTER);
      text(person.id, person.posx, person.posy);
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
    
    this.ownID = null;
    this.collectedIDs = null;
    this.setDefaultValues();
    this.elements = [this.ownID, this.collectedIDs];
    
  }

  setDefaultValues() {
    this.ownID = new TextElement(0,
                            0,
                            this.size_x-2*this.elementMarginX,
                            ownIDHeight,
                            "My own ID",
                            "<no person selected>",
                            "lime");
    
    this.collectedIDs = new TextElement(0,
                                   0,
                                   this.size_x - 2*this.elementMarginX,
                                   collectedIDsHeight, 
                                   "Collected IDs", 
                                   "-",
                                   "lightgrey")
  }

  update() {
    if (!(SELECTED_PERSON === null)) {
      this.ownID = new TextElement(0,
                                  0,
                                  this.size_x-2*this.elementMarginX,
                                  ownIDHeight,
                                  "My own ID",
                                  SELECTED_PERSON.id,
                                  "lime");
      let formatedIDs = this.formatIDs(SELECTED_PERSON.collectedIDs);
      this.collectedIDs = new TextElement(0,
                                   0,
                                   this.size_x - 2*this.elementMarginX,
                                   collectedIDsHeight, 
                                   "Collected IDs", 
                                   formatedIDs,
                                   "lightgrey");
      this.elements = [this.ownID, this.collectedIDs];

    }
  }

  formatIDs(ids) {
    let s = "";
    for (let i=0; i<ids.length; i++) {
      s += ids[i] + " • ";
      if (i%8 == 7) {
        s += "\n";
      }
    }
    return s
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
                                    "<placeholder>",
                                    "red")
    
    this.elements = [serverIDs];
  }

  update() {
    let ids = "";
    for (let i=0; i<rki_infected_ids.length; i++) {
      ids += rki_infected_ids[i] + " • ";
      if (i%8 == 7) {
        ids += "\n";
      }
    }

    this.elements[0].subtitle = ids;
  }
}

class Popup {
  constructor(x,y,length, height, input_text,color,time){
    this.x=x
    this.y=y
    this.length=length
    this.height=height
    this.color=color
    this.input_text=input_text
    this.time=time
    this.opacity=127
  }

  show() {
    let hue=200
    textSize(20)
    fill(this.color);
    text(this.input_text,this.x,this.y,this.length,this.height);
    fill(hue,hue,hue,this.opacity);
    rect(this.x,this.y,this.length,this.height,5);
    //fills the back of the box with 50% opacity
  }

  update() {
    if (this.time<0) {
      sim.popups.pop(this);
    }
    else {
      this.time-=1;
    }
  }
}

class SettingDisplay extends TextElement {
  constructor(offset_x, offset_y, size_x, size_y) {
    super(offset_x, offset_y, size_x, size_y, "","","white");
  }
}
