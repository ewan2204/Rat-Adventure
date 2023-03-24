import * as THREE from "../Libaries/three.module.js";

import Stats from "../Libaries/stats.module.js";

import { GLTFLoader } from "../Libaries/GLTFLoader.js";

import { Octree } from "../Libaries/Octree.js";

import { setupModel } from "./setupModel.js";
import { loadLevelOne, loadLevelTwo, loadTutorial } from "./levels.js";
import { Player } from "./player.js";
import { Projectiles } from "./projectiles.js";
import { Collectibles, Collectible } from "./collectibles.js";
import { TileManager } from "./tile.js";
import { processVictory, initMenu, processLoss } from "./menu.js";


// Two important variables which define when we should grab the user's inputs and what we should do with them

// Is the user top down view or first person defines when we should lock pointer
let first_person = true;

// Is the menu open? 
// needs to be globally definded so accessed from menu.js
let global = {
    menu_active: true,
};

// Clock used for working out time since last frame draw as well as power to throw the projectile (rat) with
const clock = new THREE.Clock();

// Create the octree to store relationship to the world
let worldOctree = new Octree();

// Scene which contains all our objects
let scene = new THREE.Scene();

// Define two cameras one persepective which offers FPV (First Person View)
const first_person_camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	500
);
first_person_camera.rotation.order = "YXZ";



// Another Orthographic and positoined far above the map offering Birds eye view
const top_down_camera = new THREE.OrthographicCamera(
	-window.innerWidth, 
	window.innerWidth, 
	window.innerHeight, 
	-window.innerHeight, 
	1, 
	1000 );
top_down_camera.rotation.order = "YXZ";
top_down_camera.position.y = 10;
top_down_camera.zoom = 50;
top_down_camera.updateProjectionMatrix();

// We want to enable layer two for the camera in case there exists something we wish to only render onto the orthographic camera
// For example icons on the map.
top_down_camera.layers.enable(2);


// Enable layer 3 to render the mirrored env map materails
first_person_camera.layers.enable(3);
top_down_camera.layers.enable(3);

top_down_camera.lookAt(0,-2,0);

// Create the renderer, enable shadows 
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
//renderer.physicallyCorrectLights = true;
//renderer.setFaceCulling(THREE.CullFaceFrontBack);

// Create a stats module which allows us to see fps and memory usage
const stats = new Stats();
stats.domElement.style.position = "absolute";
stats.domElement.style.top = "0px";


// Grab the container definded in html which we can place our renderer and stats icon in.
const container = document.getElementById("container");
container.appendChild(renderer.domElement);
container.appendChild(stats.domElement);


// Define some constants

// Gravity, acceleration down.
const GRAVITY = 30;

// If fps is low how many steps should we renderer through the object to ensure it doesn't pass entirely through another object.
const STEPS_PER_FRAME = 5;

// Projectile properties.
const projectile_count = 20;
const projectile_size = 0.4;


// Create a GLTF loader with the path set to our assets folder.
const loader = new GLTFLoader().setPath("../Assets/gltf/");


// Load the rat data which we can use as the projectile model.
const ratData = await loader.loadAsync("./Rat/Textured_Rat.gltf");
const rat = setupModel(ratData, "Rat");

// Setup rat
rat.castShadow = true;
rat.receiveShadow = true;
rat.scale.set(0.2, 0.2, 0.2);
// Iterate Through all Rat Children Mesh's and enable shadows
rat.children.forEach((ratMesh) => {
	ratMesh.castShadow = true;
	ratMesh.receiveShadow = true;
});
rat.castShadow = true;
rat.receiveShadow = true;
rat.scale.set(0.2, 0.2, 0.2);
// Move the initial rats from spawn so they don't cause from all the collisions.
rat.position.set(0, -10, 0);

// Create a low poly spherical version of the rat which can interact with the environment.
const rat_collider = new THREE.Sphere(
	new THREE.Vector3(0, 10, 0),
	projectile_size
);
// Couple the rat model and collider into a projectile and store them in our projectiles class.
const rats = new Projectiles(rat, rat_collider, projectile_count, scene);


// Load in a flag pole which is the goal for each level and attach the flag which comes with an animation created in blender.
// We will then attach a function to animate the flag and put this in our animation loop
const flag_pole_data = await loader.loadAsync("./Goal/flag_pole.glb");
const flag_goal = new Collectible(flag_pole_data.scene, new THREE.Vector3(-20, 1, -8), scene, undefined);

const flag_data = await loader.loadAsync("./Goal/flag_animation.glb");
const animation_Flag = flag_data.animations[0];
const mixer = new THREE.AnimationMixer(flag_data.scene);
const action = mixer.clipAction(animation_Flag);
action._clip.duration = 6.83333333333;
action.setLoop(THREE.LoopPingPong, Infinity);
action.play();
flag_data.tick = (delta) => {mixer.update(delta);}
scene.add(flag_data.scene);
flag_goal.model.add(flag_data.scene);


// Create a listener which will allow us to play audio
// Attach this to our first person camera so we hear from the perspective of the camera.
const listener = new THREE.AudioListener();
first_person_camera.add( listener );


// Load in the collectible model, cheese and set it up similar to the rat model.
const collectible_data = await loader.loadAsync("./Collectibles/cheese.glb");
const collectible_model = setupModel(collectible_data, "Cheese_Block");
collectible_model.material.side = THREE.DoubleSide;
collectible_model.flatShading = false;
collectible_model.castShadow = true;
collectible_model.receiveShadow = true;
const location_of_audio = "../Assets/Audio/james-may-says-cheese.mp3";
const collectible_manager = new Collectibles(collectible_model, location_of_audio, listener)








// Create a player which will attach to our camera.
const player = new Player();


/**
 * Setup the projectile to also be rendered ontop the screen to give the perspective that is thrown from player.
 */
// Create a clone of the rat to act as the held Object
const held_object = rat.clone();

// Add the camera to the scene so we can attach the held object as a child
scene.add(first_person_camera);
// Attach a rat to the camera so it gives the illusion that the player is holding it.
player.setupHeldObject(first_person_camera, held_object);

// Create a tile manager which will allow us to control all the tiles.
const tile_manager = new TileManager();
await tile_manager.loadTileTextures();
await tile_manager.loadTileParts();
await tile_manager.loadLowPolyParts();


// Load an initial level to have in the background before player selects a level.
//await loadLevelOne(scene, worldOctree, tile_manager);
await loadLevelTwo(scene, worldOctree, tile_manager, collectible_manager, flag_goal, player);



// Get the blocker element which contains the menu system.
// It being shown removes focus from the game.
const blocker = document.getElementById( 'blocker' );

// Define a function which tells us when the player began holding down mouse click
let mouseTime = 0;

// Define a map which allows us to tell what keys the player is pressing on each frame.
const keyStates = {};


// Add a listener so that each key press is recorded and acted upon
document.addEventListener("keydown", (event) => {
	if (event.repeat) return;
	keyStates[event.code] = true;
	
	if(event.code === "Escape"){
		blocker.style.display = '';
		document.exitPointerLock();
		global.menu_active = true;
	}

	// We wish to switch camera view if player pressess m and hasn't the menu open
	if (keyStates["KeyM"] && !global.menu_active){
		top_down_camera.position.set(first_person_camera.position.x,top_down_camera.position.y,first_person_camera.position.z);
		first_person = !first_person;
		keyStates["KeyM"] = false;
		if(first_person){
			document.body.requestPointerLock();
			tile_manager.clearRaycast();
		}else{
			document.exitPointerLock();
		}
	}

});


// When player stops pressess a key record this in key states.
document.addEventListener("keyup", (event) => {
	keyStates[event.code] = false;
});

// When a player clicks start recording the time if they are in FPV or alternatively raycast
document.addEventListener("mousedown", (event) => {
	if(global.menu_active){
		return;
	}

	// Menu is closed, player is engaged with game.
	if(first_person){
		mouseTime = performance.now();
	}
	if(!first_person){
		tile_manager.processRaycast(top_down_camera, new THREE.Vector2(( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1));
	}

});

// When a player releases mouse fire rat if they are in FPV
document.addEventListener("mouseup", () => {
	if(first_person && !global.menu_active){
		throwRatFromPlayer();
	}

});

// If a we lose pointer lock control we should display the main menu
document.addEventListener("pointerlockchange", () => {
	if (document.pointerLockElement) {
		blocker.style.display = 'none';
	}else if(!first_person){
		blocker.style.display = 'none';
	}else{
		global.menu_active = true;	
		blocker.style.display = '';
		//container.style.display = 'none';
	}
});


// When a player resumes the game we must close the menu and grab the pointer if they were in FPV
document.getElementById("resume_button").onclick = function() {
	blocker.style.display = 'none';
	global.menu_active = false;
	
	if (first_person) {
		document.body.requestPointerLock();
	} 
};

// Load level function called by the menu 
async function loadLevel(){
	await reset(scene);
	// Stop the animation loop whilst we load otherwise player may see the level loading
	renderer.setAnimationLoop(null);
	switch (document.getElementById('level').value) {
		case 'Tutorial':
			await loadTutorial(scene, worldOctree, tile_manager, collectible_manager, flag_goal, player);
			break;
		case 'level_one':
			await loadLevelOne(scene, worldOctree, tile_manager, collectible_manager, flag_goal, player);
			break;
		case 'level_two':
			await loadLevelTwo(scene, worldOctree, tile_manager, collectible_manager, flag_goal, player);
			break;
		default:
			console.log("Fall back if unknown");
			await loadLevelOne(scene, worldOctree, tile_manager, collectible_manager, flag_goal, player);
			console.log("Fall back if unknown");
			break;
	}
	if(first_person){
		document.body.requestPointerLock();
	}
	// Once finished re-engage the animation loop
	renderer.setAnimationLoop(animate);
}

// Setup varilbes which function as pass throughs to our settings
let show_viewbob = true;
let render_reflections = true;
let volume = 100;

/**
 * Update the settings to reflect what is currently set.
 */
function reloadSettings(){
	show_viewbob = document.getElementById('Viewbob').checked;
	render_reflections = document.getElementById('reflections').checked;
	
	volume = document.getElementById("volume").value;
	listener.setMasterVolume(volume / 100);
}


// If unable to get the pointer lock control
// Try again to require them ( can happen if we lose it)
document.addEventListener('pointerlockerror', (event) => {
	//document.body.requestPointerLock();
});



// When a player moves their mouse in FPV we should update the camera accordingly.
let sensitivity = 0.0025;
document.body.addEventListener("mousemove", (event) => {
	if (first_person && !global.menu_active) {
		// Ensure your mouse has a lower polling rate otherwise you will make everything bad:)
		if(event.movementY > 100 || -100 > event.movementY){
			console.log("Speeding ticket required for that ...", event.movementY);
		}

		if(event.movementX < 100 && -100 < event.movementX){
			first_person_camera.rotation.x -= event.movementY * sensitivity;
		}
		first_person_camera.rotation.y -= event.movementX * sensitivity;
		
		if(first_person_camera.rotation.y > Math.PI * 2){
			first_person_camera.rotation.y -= Math.PI * 2;
		}
		else if(first_person_camera.rotation.y <0){
			first_person_camera.rotation.y += Math.PI * 2;
		}
		// Clamp the rotation so that it doesn't break the players neck
		first_person_camera.rotation.y = THREE.MathUtils.clamp(first_person_camera.rotation.y, Math.PI * -2, Math.PI * 2);
		first_person_camera.rotation.x = THREE.MathUtils.clamp(first_person_camera.rotation.x, Math.PI * -0.5, Math.PI * 0.5);
	}
});

// When resizing the window we must maintain aspect ratio
window.addEventListener("resize", onWindowResize);

function onWindowResize() {
	// Update the first person camera to maintain size.
	first_person_camera.aspect = window.innerWidth / window.innerHeight;
	first_person_camera.updateProjectionMatrix();

    // Update the top down camera to maintain aspect ratio
    top_down_camera.left = -window.innerWidth;
    top_down_camera.right = window.innerWidth;
    top_down_camera.top = window.innerHeight;
    top_down_camera.bottom = -window.innerHeight;
    top_down_camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * From the selection of rats throw one.
 */
function throwRatFromPlayer() {
	let camera_direction = new THREE.Vector3();
	const direction = first_person_camera.getWorldDirection(camera_direction);
	const player_position = player.collider.end.clone().addScaledVector(direction, player.collider.radius * 1.5);

	// throw the ball with more force if we hold the button longer, and if we move forward
	const impulse = 15 + 30 * (1 - Math.exp((mouseTime - performance.now()) * 0.001));
	const player_velocity = player.velocity.clone();

	rats.fireProjectile(direction, player_position, impulse, player_velocity);
}



// Called when loading a level resets things back to their original posiiton as well as removing old level.
function reset(){
	rats.reset();
	player.reset();
	tile_manager.reset();
	collectible_manager.reset();

	first_person_camera.rotation.y = 0;
	first_person_camera.rotation.x = 0;


	worldOctree = new Octree();
}


// Create cube camera which can be used as env map.
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget( 128, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter } );
var cubeCamera = new THREE.CubeCamera( .1, 100000, cubeRenderTarget );
scene.add( cubeCamera );
// Create car
var chromeMaterial = new THREE.MeshLambertMaterial( { color: 0xffffff, envMap: cubeCamera.renderTarget } );
var car = new THREE.Mesh( new THREE.SphereBufferGeometry(1, 16, 16), chromeMaterial );
car.layers.set(3);
scene.add( car );
car.position.set(5,1,3);
cubeCamera.position.copy( car.position );
cubeCamera.update( renderer, scene );
// Update the render target cube







// GLSL features
// Light settings.
var lightPosition = new THREE.Vector3(-27.65, 59.03, 96.1);
lightPosition.normalize();
var lightAmbient = new THREE.Vector4 (0.2 , 0.2 , 0.2 , 1.0 ) ;
var lightDiffuse = new THREE.Vector4 ( 1.0 , 1.0 , 1.0 , 1.0 ) ;
var lightSpecular = new THREE.Vector4 ( 1.0 , 1.0 , 1.0 , 1.0 ) ;


var materialDiffuse = new THREE.Vector4 ( 1.0 , 1.0 , 1.0 , 0.10 );
var materialSpecular = new THREE.Vector4 ( 1.0 , 1.0 , 1.0 , 1.0 );
var materialShininess = 20.0;
lightDiffuse.multiply(materialDiffuse);
lightSpecular.multiply(materialSpecular);
// Global features as to allow glsl to be used and access time from anywhere
const shader_uniform = {
	u_time: {
		type: 'float',
		value: performance.now(),
	},
	ambient_product: {
		type: 'vec4',
		value: lightAmbient,
	},
	diffuse_product: {
		type: 'vec4',
		value: lightDiffuse,
	},
	specular_product: {
		type: 'vec4',
		value: lightSpecular,
	},
	light_position: {
		type: 'vec4',
		value: lightPosition,
	},
	shininess: {
		type: 'float',
		value: materialShininess,
	}
}	





// Store a popup so we can inform users if they need to collect more to win.
const popup_info = document.getElementById( 'ThingsRemain' );


let deltaTime = 0.05;

// Now that we have the world set up we can setup the menu system.
initMenu();

// Set the animation loop in the renderer to play each frame.
renderer.setAnimationLoop( animate );






function animate() {
	shader_uniform.u_time.value = performance.now() / 1000;
	deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;

	// Update the cube camera to allow for reflections
	if(render_reflections){
		cubeCamera.position.copy( car.position );
		cubeCamera.update( renderer, scene );
	}

	// Render the scene
	// we look for collisions in substeps to mitigate the risk of
	// an object traversing another too quickly for detection.
	// If the main menu is closed and we are in FPV we should update the physics of the game.
	if (first_person && !global.menu_active) {

		// We should update these properties more than once a frame as it could lead to collisions being missed if ran at low FPS.
		for (let i = 0; i < STEPS_PER_FRAME; i++) {
			//const camera_direction = getForwardVector(camera);
			player.controls(deltaTime, keyStates, first_person_camera);
			player.updatePlayer(deltaTime, GRAVITY, worldOctree, tile_manager.getOctree());
			player.moveCamera(first_person_camera);

			rats.update(deltaTime, GRAVITY, player, worldOctree, tile_manager.getOctree());
			collectible_manager.update(player);
			collectible_manager.collideProjectiles(rats); 
			flag_data.tick(deltaTime);

			// If the player reaches the flag calcualte if they have won, aquired the required cheese amount.
			if(flag_goal.update(player)){
				if(0 >= collectible_manager.amountLeft()){
					processVictory();
				}else{
					// If not all cheese is collected display a pop up message
					popup_info.style.display = '';
					popup_info.innerHTML = collectible_manager.amountLeft() + " more cheese required to win!";
					setTimeout(() => {
						popup_info.style.display = 'none';
					}, 3000);
				}
			}
			// If the player has fallen under the map they have been considered to have lost the game
			if(player.getPosition().y < -10){
				console.log("Loss");
				processLoss();
			}
		}
	}

	// Render from the appripriate camera.
	if(first_person){
		renderer.render(scene, first_person_camera);
	}else{
		renderer.render(scene, top_down_camera);
	}
	



	stats.update();
}



export { loadLevel, global, reloadSettings, shader_uniform}
