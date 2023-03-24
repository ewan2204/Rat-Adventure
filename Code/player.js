import * as THREE from "../Libaries/three.module.js";
import { Capsule } from "../Libaries/Capsule.js";
import { Octree } from "../Libaries/Octree.js";


const weapon_wobble_rate = 15;
const weapon_wobble_amount = 0.05;

// Create some variables which will be used as defining new vectors are slow.
let horizontal_velocity = new THREE.Vector3;


/**
 * Class for a player
 * 
 * Contains Features of a player.
 */
class Player {
	/**
	 * Create a player object creating basic features, velocity and size.
	 */
	constructor() { 
		this.velocity = new THREE.Vector3();
		this.on_floor = false;
		this.collider = new Capsule(
			new THREE.Vector3(0, 0.32, 0),
			new THREE.Vector3(0, 1, 0),
			0.32
		);
		this.weapon_bob = 0;
	}

	/**
	 * Calculate whether the player is on the floor and if not try and make it so.
	 * @param { Octree } world_octree - Collision model of the world/Environment
	 */
	playerCollisions(world_octree, dynamic_Octree) {
		const world_player_intersection 	= world_octree.capsuleIntersect(this.collider);
		const dynamic_player_intersection 	= dynamic_Octree.capsuleIntersect(this.collider);

		this.on_floor = false;

		if(world_player_intersection){
			this.on_floor = world_player_intersection.normal.y > 0.1

			if (!this.on_floor) {
				this.velocity.addScaledVector(
					world_player_intersection.normal,
					-world_player_intersection.normal.dot(this.velocity)
				);
			}
			// If player intersecting the terrain shift playerr out of the terrain 
			this.collider.translate(world_player_intersection.normal.multiplyScalar(world_player_intersection.depth));
		}

		if(dynamic_player_intersection){
			this.on_floor = this.on_floor || dynamic_player_intersection.normal.y > 0.1;

			if (!this.on_floor) {
				this.velocity.addScaledVector(
					dynamic_player_intersection.normal,
					-dynamic_player_intersection.normal.dot(this.velocity)
				);
			}
			// If player intersecting the terrain shift playerr out of the terrain 
			this.collider.translate(dynamic_player_intersection.normal.multiplyScalar(dynamic_player_intersection.depth));
		}

	}

	/**
	 * Update the player coordinates at a given time.
	 * @param { Float } delta_time 		- Change in time
	 * @param { Float } gravity 		- Gravity of world acceleration down.
	 * @param { Octree } world_octree 	- Environment collision box.
	 * @param { Octree } dynamic_Octree 	- Collision Octree storing moving level parts
	 */
	updatePlayer(delta_time, gravity, world_octree, dynamic_Octree) {
	
		const damping = (Math.exp(-7 * delta_time) - 1);

		this.velocity.addScaledVector(this.velocity, damping);
			


		if (!this.on_floor) {
			this.velocity.y -= gravity * delta_time;
	
			this.velocity.addScaledVector(this.velocity, (damping * -0.80));
		}else{
			horizontal_velocity.set(this.velocity.x,0,this.velocity.z)
			//let horizontal_velocity = new THREE.Vector3(this.velocity.x,0,this.velocity.z);
	
			const scale = (horizontal_velocity.length() > 10 ? 10 : horizontal_velocity.length());
			horizontal_velocity.normalize();
			horizontal_velocity.multiplyScalar(scale);
			this.velocity.set(horizontal_velocity.x, this.velocity.y, horizontal_velocity.z);
		}

		// Calculate weapon bob.
		this.updateWeaponBob(delta_time);


		
		
	
		//const delta_position = this.velocity.clone().multiplyScalar(delta_time);
		this.collider.translate(this.velocity.clone().multiplyScalar(delta_time));

		// Compute bounding box for collection of collectibles
		this.collider.computeBoundingBox();


		this.playerCollisions(world_octree, dynamic_Octree);
	}

	
	updateWeaponBob(delta_time){
		if (typeof this.held_object !== "undefined"){

			// If moving at speed simply contiue the bop by adding to it a time amount.
			if(Math.abs(this.velocity.x) + Math.abs(this.velocity.z) > 1){
				this.weapon_bob += weapon_wobble_rate * delta_time;
			}else{
				// Check which 0 the current weapon bob is cloest to using PI.
				if(this.weapon_bob <= Math.PI / 2 ||
				(this.weapon_bob >= Math.PI && this.weapon_bob <= Math.PI * 3/2)){

					// The cloest 0 is down so subtract and check if 0 is contained between the points.
					let nextBob = this.weapon_bob - weapon_wobble_rate * delta_time;
					// If the bob crossess a zero at pi or 2 pi set it to the cross to maintain 0.
					if( (Math.PI >= nextBob && Math.PI <= this.weapon_bob) ||
					(2 * Math.PI >= nextBob && 2 * Math.PI <= this.weapon_bob) ){
						this.weapon_bob = Math.PI;
					}else{
						this.weapon_bob = nextBob;
					}
					
				}else{
					// Cloest 0 is up so add
					let nextBob = this.weapon_bob + weapon_wobble_rate * delta_time;
					// If the bob crossess a zero at pi or 2 pi set it to the cross to maintain 0.
					if( (Math.PI >= this.weapon_bob && Math.PI <= nextBob) ||
					(2 * Math.PI >= this.weapon_bob && 2 * Math.PI <= nextBob) ){
						this.weapon_bob = Math.PI;
					}else{
						this.weapon_bob = nextBob;
					}
				}
			}

			// Wrap the bob amount so that it repeats 0 -> 2 pi.
			if(this.weapon_bob > 2 * Math.PI){
				this.weapon_bob -= 2 * Math.PI;
			}

			// Check for potential to go sub zero.
			if(this.weapon_bob < 0){
				this.weapon_bob = Math.PI;
			}

			// Update the held object position based on the current bob amount.
			this.held_object.position.y = -0.2 + weapon_wobble_amount * Math.sin(this.weapon_bob);
			
		}else{
			console.log(typeof this.held_object)
		}
	}


	/**
	 * Update the camera's position to be at the top of the player's collision capsule.
	 * @param {*} camera - The camera.
	 */
	moveCamera(camera) {
		camera.position.copy(this.collider.end);
	}

	/**
	 * Update the player's speed based on current inputs/control
	 * @param { Float } delta_time 		- Change in time.
	 * @param { [boolean] } key_states 	- Current input state.
	 * @param { Camera } Camera 		- Camera at top of the player capsule.
	 */
	controls(delta_time, key_states, camera) {
		// gives a bit of air control
		const speedDelta = delta_time * (this.on_floor ? 50 :  10);



	
		if (key_states["KeyW"]) {
			this.velocity.add(this.getForwardVector(camera).multiplyScalar(speedDelta));
		}
	
		if (key_states["KeyS"]) {
			this.velocity.add(this.getForwardVector(camera).multiplyScalar(-speedDelta));
		}
	
		if (key_states["KeyA"]) {
			this.velocity.add(this.getSideVector(camera).multiplyScalar(-speedDelta));
		}
	
		if (key_states["KeyD"]) {
			this.velocity.add(this.getSideVector(camera).multiplyScalar(speedDelta));
		}
	
		if(key_states["Space"]) {
			if (this.on_floor) {
				this.velocity.y = 12;
			}
		}
	}

	/**
	 * Given the camera of the player determine which direction is forward from the player's perspective.
	 * @param { Object3D } camera 	- Camera at the top of the player's capsule.
	 * @returns { THREE.Vector3 }	- Normalised horizontal vector of forward.
	 */
	getForwardVector(camera) {
		let direction = new THREE.Vector3();

		camera.getWorldDirection(direction);
		direction.y = 0;
		direction.normalize();

		return direction;
	}
	
	/**
	 * Given the camera of the player determine which direction is perpendicual to forwards from the player's perspective.
	 * @param { Object3D } camera 	- Camera at the top of the player's capsule.
	 * @returns { THREE.Vector3 }	- Normalised horizontal vector of sideways.
	 */
	getSideVector(camera) {
		let direction = new THREE.Vector3();

		camera.getWorldDirection(direction);
		direction.y = 0;
		direction.normalize();
		direction.cross(camera.up);

		return direction;
	}


	throwBall() {
		const sphere = spheres[sphereIdx];
	
		camera.getWorldDirection(playerDirection);
	
		sphere.collider.center
			.copy(playerCollider.end)
			.addScaledVector(playerDirection, playerCollider.radius * 1.5);
	
		// throw the ball with more force if we hold the button longer, and if we move forward
	
		const impulse =
			15 + 30 * (1 - Math.exp((mouseTime - performance.now()) * 0.001));
	
		sphere.velocity.copy(playerDirection).multiplyScalar(impulse);
		sphere.velocity.addScaledVector(playerVelocity, 2);
	
		sphereIdx = (sphereIdx + 1) % spheres.length;
	}



	/**
	 * Given the camera and an object append the object to the camera and cause it to render attop everything else.
	 * @param {*} camera 
	 * @param {*} held_object 
	 */
	setupHeldObject(camera, held_object){
		// Attach the held object to the camera
		camera.add(held_object);

		const degree = Math.PI / 180;

		// Position the held_object to look well compared to the camera
		held_object.rotation.set(15 * degree, 110 * degree, 0);
		held_object.position.set(0.7, -0.2, -1);

		// Cause the held object to be rendered at a different time to the rest of the objects in the scene.
		held_object.renderOrder = 2;


		// Iterate Through all Rat Children Mesh's and disable depth test so that it always renders ontop.
		held_object.children.forEach((child) => {
			child.material = child.material.clone();
			// Ensure all the materials associated with the held object also rendered at different time.
			child.renderOrder = 2;
		});

		// When the first of the materials is rendered clear the depth buffer so that only the held_object is rendered agaginst itself.
		held_object.children[0].onBeforeRender = function( renderer ) { renderer.clearDepth(); };

		this.held_object = held_object;
	}

	getPosition(){
		return this.collider.start;
	}


	moveToPosition(new_position){
		new_position.sub(this.collider.end);
		this.collider.translate(new_position);
	}


	reset(){
		this.collider = new Capsule(
			new THREE.Vector3(0, 0.35, 0),
			new THREE.Vector3(0, 1, 0),
			0.35
		);
		this.velocity = new THREE.Vector3();
	}
}

export { Player };