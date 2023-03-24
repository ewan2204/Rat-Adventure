import { loadLevel, global, reloadSettings } from "./ratArchaeologist.js";

let level_load = false;

const container = document.getElementById("container");

const blocker = document.getElementById( 'blocker' );

// Get all the menu elements.
const main_menu = document.getElementById( 'main_menu' );
const pause_menu = document.getElementById( 'pause_menu' );
const change_map_menu = document.getElementById( 'change_map_menu' );
const options_menu = document.getElementById( 'options_menu' );
const controls_menu = document.getElementById( 'controls_menu' );


// slider controls for volume
var slider = document.getElementById("volume");
var volume = document.getElementById("demo");

// Get the end screen which can be shown if a player win or lose.
const end_screen = document.getElementById('end_screen');
// Also get the victrory or loss text so we can alter based on outcome
let str_victory_or_loss = document.getElementById( 'victory/loss' );


const resume_button = document.getElementById( "resume_button" );
resume_button.style.display = "none";



/**
 * Function called to allow for menu navigation once the game is finished loading ensures user doens't access menu before game completed loading.
 */
function initMenu(){
	setupButton("back_button", navigateBack);
	setupButton("controls_button", displayControls);
	setupButton("options_button", displayOptions);
	setupButton("change_map_button", changeMapButton);
	setupButton("play_button", play_button_function);
	setupButton("save_settings", save_settings_function);

	/**
	 * Setup the level selecter so that a short discription is placed underneath it
	 */
	document.getElementById("level").onchange = function() {
		switch (document.getElementById('level').value) {
			case 'level_one':
				level_one_description.style.display = '';
				level_two_description.style.display = 'none';
				Tutorial.style.display = 'none';
				break;
			case 'level_two':
				level_one_description.style.display = 'none';
				level_two_description.style.display = '';
				Tutorial.style.display = 'none';
				break;
			case 'Tutorial':
				level_one_description.style.display = 'none';
				level_two_description.style.display = 'none';
				Tutorial.style.display = '';
				break;

			default:
				level_one_description.style.display = "none";
				level_two_description.style.display = "none";
				Tutorial.style.display = 'none';
				break;
		}
	};

	// setup the volume setting so that is allways equals the slide value.
	volume.innerHTML = slider.value;

	slider.oninput = function() {
		volume.innerHTML = this.value;
	}
}



/**
 * Given the name of a set of buttons on the menu link them to a given function.
 * @param { String } name_of_buttons - name of the buttons div name
 * @param { Function } function_to_call_when_pressed - Function to call one of these buttons is pressed.
 */
function setupButton(name_of_buttons, function_to_call_when_pressed){
	const button_elements = document.getElementsByName(name_of_buttons);
	for (var i = 0, len = button_elements.length; i < len; i++) {
	    button_elements[i].onclick = function (){function_to_call_when_pressed(this);}
	}
}


/**
 * Function which hides the main and/or pause menu and then unhide the change map menu
 */
function changeMapButton() {
	main_menu.style.display = 'none';
	pause_menu.style.display = 'none';
	change_map_menu.style.display = '';
};


/**
 * Given a button find it's parent and navigate back to that by showing correct main menu
 * @param {*} button - Button asking to go back.
 */
function navigateBack(button){
	// Hide the element that called the back button
	button.parentElement.style.display = 'none';

	// Check if a level has been loaded if so go to the pause menu instead of main menu 
	if(level_load){
		pause_menu.style.display = '';
	}else{
		main_menu.style.display = '';
	}
}

/**
 * Hide the button's menu page and show the controls page.
 * @param {*} button - Button which menu should be hidden
 */
function displayControls(button){
	// Hide the element that called the Controls
	button.parentElement.style.display = 'none';
	// Display the controls.
	controls_menu.style.display = '';
}

/**
 * Hide the button's menu page and show the options page.
 * @param {*} button  - Button which menu should be hidden
 */
function displayOptions(button){
	// Hide the element that called the Controls
	button.parentElement.style.display = 'none';
	// Display the controls.
	options_menu.style.display = '';
}


/**
 * Since there is only one play button we can assing it as so.
 * This loads a level which has been selected as well as hidding the blocker.
 */
function play_button_function(button) {
	// Set it so that the level has been loaded.
	level_load = true;
	blocker.style.display = 'none';
	resume_button.style.display = "";

	// Load the level.
	global.menu_active = false;
	loadLevel();
	navigateBack(button);
};

/**
 * When a player saves their settings call the game program and tell it to update the parameters.
 */
function save_settings_function(){
	reloadSettings();
}


const 	level_one_description = document.getElementById("level_one_description"),
		level_two_description = document.getElementById("level_two_description"),
		Tutorial = document.getElementById("Tutorial_description");


/**
 * hide all menus and display the end screen with a given message and then exit pointer lock control.
 * @param { String } displayText - Text to display typically victory or loss. 
 */
function playerEndGame(displayText){
	global.menu_active = true;

	str_victory_or_loss.innerHTML = displayText;
	hideMenus();
	end_screen.style.display = '';
	blocker.style.display = '';

	level_load = false;
	document.exitPointerLock();
}

// Ran when player wins
function processVictory(){
	playerEndGame("🤠 🐀 Victory!! 🐀 🤠");
}

// Ran when player loses
function processLoss(){
	playerEndGame("🐀 You lost - Try again! 🐀");
}




/**
 * Hide all menus.
 */
function hideMenus(){
	main_menu.style.display = 'none';
	pause_menu.style.display = 'none';
	change_map_menu.style.display = 'none';
	options_menu .style.display = 'none';
	controls_menu.style.display = 'none';
	resume_button.style.display = 'none';
}













export { processVictory, initMenu, processLoss };