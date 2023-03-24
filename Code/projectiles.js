import * as THREE from "../Libaries/three.module.js";

import { Player } from "./player.js";
import { Octree } from "../Libaries/Octree.js";

class Projectile {
	model;
	collider;
	velocity;
	/**
	 * Create a projectile which can be fired.
	 * @param { Group(meshes) } model 	- Model to represent the projectile
	 * @param { Sphere } input_collider - Simple sphere to calculate collisions for projectile
	 * @param { scene } scene 			- Scene to render the projectile into.
	 */
	constructor(model, input_collider, scene){
		scene.add(model);

		this.model = model;

		this.collider = input_collider;

		this.velocity = new THREE.Vector3();

	}



	/**
	 * Give velocity equal to the impulse in the direction wanted as well as shifting self to the projectile origin.
	 * @param { Vector3 } 	direction 	- Direction to launch
	 * @param { Vector3 } 	origin 		- Where to launch from
	 * @param { Float } 	impulse 	- Force to launch with.
	 * @param { Vector3 } 	velocity 	- Velocity of the launcher.
	 */
	fireProjectile(direction, origin, impulse, velocity){
		this.collider.center.copy(origin);
		this.collider.center.addScaledVector(direction, this.collider.radius);
		this.velocity.copy(direction).multiplyScalar(impulse);
		this.velocity.addScaledVector(velocity, 2);
	}

	/**
	 * Calculate the movement of the projectile accross a time span.
	 * @param { Float } delta_time 		- Change in time.
	 * @param { Octree } world_octree 	- World collision
	 * @param { Octree } dynamic_Octree 	- Dynamic collision
	 * @param { Float } gravity 		- Gravity. Acceleration down.
	 * @param { Player } player 		- Player Object
	 */
	update(delta_time, gravity, player, world_octree, dynamic_Octree){
		this.collider.center.addScaledVector(this.velocity, delta_time);
		
		// Interact with the world
		this.worldProjectileCollision(delta_time, world_octree, dynamic_Octree, gravity);

		// Interact with the player.
		this.playerProjectileCollision(player);
	}

	/**
	 * collider the project with the world including the dynamic tile section 	
	 * @param { number } delta_time 		- Change in time.
	 * @param { Octree } world_octree 		- Octree containing static elements
	 * @param { Octree } dynamic_Octree 	- OCtree containg tiles
	 * @param { Number } gravity 			- What acceleration down if not on ground
	 */
	worldProjectileCollision(delta_time, world_octree, dynamic_Octree, gravity){
		const world_projectile_intersection 	= world_octree.sphereIntersect(this.collider);
		const dynamic_projectile_intersection 	= dynamic_Octree.sphereIntersect(this.collider);

		if (world_projectile_intersection) {
			// Lose some energy when bouncing.
			this.velocity.addScaledVector(
				world_projectile_intersection.normal,
				-world_projectile_intersection.normal.dot(this.velocity) * 1.5
			);
			// Move out from the wall.
			this.collider.center.add(
				world_projectile_intersection.normal.multiplyScalar(world_projectile_intersection.depth)
			);

		} else if (dynamic_projectile_intersection){
			// Lose some energy when bouncing.
			this.velocity.addScaledVector(
				dynamic_projectile_intersection.normal,
				-dynamic_projectile_intersection.normal.dot(this.velocity) * 1.5
			);
			// Move out from the wall.
			this.collider.center.add(
				dynamic_projectile_intersection.normal.multiplyScalar(dynamic_projectile_intersection.depth)
			);
		} else {
			// Apply gravity if not interacting with the world..
			this.velocity.y -= gravity * delta_time;
		}

		// Resistance
		const damping = Math.exp(-0.5 * delta_time) - 1;
		this.velocity.addScaledVector(this.velocity, damping);
	}



	/**
	 * Given a player calculate if the projectile intersects and if so adjust their velocities so they bounce
	 * @param { Player } player 
	 */
	playerProjectileCollision(player){
		const player_centre = new THREE.Vector3();
		// Find the centre of the player.
		player_centre.addVectors(player.collider.start, player.collider.end).multiplyScalar(0.5);

		// Get centre of projectile
		const centre = this.collider.center;

		// Calculate the minimum distance between the two centres.
		// Square it as we have distance squared.
		const player_distance = player.collider.radius + this.collider.radius;
		const player_distance_squared = player_distance * player_distance;

		// approximation: player = 3 spheres

		// Iterate through the middle of the player, top middle and bottom and check if intersect projectile.
		for (const point of [player.collider.start, player.collider.end, centre]) {
			const player_point_distance_squared = point.distanceToSquared(centre);

			// If squared distance smaller than radius squared they have collided.
			if (player_point_distance_squared < player_distance_squared) {
				const normal = player_centre.subVectors(point, centre).normalize();

				const player_momentum = new THREE.Vector3();
				player_momentum.copy(normal).multiplyScalar(normal.dot(player.velocity));

				const projectile_momentum = new THREE.Vector3();
				projectile_momentum.copy(normal).multiplyScalar(normal.dot(this.velocity));

				player.velocity.add(projectile_momentum).sub(player_momentum);
				this.velocity.add(player_momentum).sub(projectile_momentum);

				const amount_inside_player = (player_distance - Math.sqrt(player_point_distance_squared)) / 2;
				centre.addScaledVector(normal, -amount_inside_player);
			}
		}
	}

	/**
	 * Each frame  update the models
	 */
	updateModelLocation(){
		this.model.position.copy(this.collider.center);
		this.model.lookAt(this.getForwardVector().add(this.collider.center));
		this.model.rotateY(-Math.PI / 2);
		
	}


	/**
	 * Given a 3D object determine which direction is forwards from the object's perspective.
	 * @param { Object3D } camera 	- Camera at the top of the player's capsule.
	 * @returns { THREE.Vector3 }	- Normalised horizontal vector of Forwards.
	 */
	getForwardVector() {
		let forward_direction_projectile = this.velocity.clone();

		forward_direction_projectile.y = 0;
		forward_direction_projectile.normalize();

		return forward_direction_projectile;
	}

	// called when scene change.
	reset(){
		this.model.position.set(0,-10,0);
		this.collider.center.set(0,-10,0);
		this.velocity = new THREE.Vector3();
	}


}


class Projectiles {
	/**
	 * Given features to make a projectile create several and store them so they can be accessed and used together.
	 * @param {*} model 				- Model of the Projectile.
	 * @param {*} projectile_collider 	- Basic Collider for the Projectile.
	 * @param {*} number_of_projectiles - Number to create.
	 * @param {*} scene 				- Scene to add them to.
	 */
	constructor(model, projectile_collider, number_of_projectiles, scene){
		this.projectiles = [];
		this.projectile_index = 0;

		for (let i = 0; i < number_of_projectiles; i++) {
			projectile_collider.center.y = -10 + (-i * 5) ;
			let projectile = new Projectile(model.clone(), projectile_collider.clone(), scene);
			this.projectiles.push(projectile);
		}
	}

	/**
	 * Fire a projectile from the store of projectiles.
	 * @param { Vector3 } direction 	- Direction to launch
	 * @param { Vector3 } origin 	- Where to launch from
	 * @param { Float } impulse 	- Force to launch with.
	 * @param { Vector3 } velocity 	- Velocity of the launcher.
	 */
	fireProjectile(direction, origin, impulse, velocity) {
		const projectile = this.projectiles[this.projectile_index];
	
		projectile.fireProjectile(direction, origin, impulse, velocity);
	
		this.projectile_index = (this.projectile_index + 1) % this.projectiles.length;
	}

	/**
	* Update all the projectiles stored within the projectiles list.
	* @param { Float } delta_time 		- Change in time.
	* @param { Octree } world_octree 		- World collider
	* @param { Octree } dynamic_Octree 		- Dynamic collider
	* @param { Float } gravity 			- Gravity. Acceleration down.
	* @param { Player } player 			- Player
	*/
	update(delta_time, gravity, player, world_octree, dynamic_Octree) {
		this.projectiles.forEach((projectile) => {
			projectile.update(delta_time, gravity, player, world_octree, dynamic_Octree);
		});
		
		this.collisions();
		for (const projectile of this.projectiles) {
			projectile.updateModelLocation();
		}
	}

	/**
	 * Check if there are any overlapping projectiles and shift them away if the are.
	 */
	collisions(){
		const normal = new THREE.Vector3();
		const project_one_change = new THREE.Vector3();
		const project_two_change = new THREE.Vector3();

		for (let i = 0, length = this.projectiles.length; i < length; i++) {
			const projectile_one = this.projectiles[i];

			for (let j = i + 1; j < length; j++) {
				const projectile_two = this.projectiles[j];

				const real_distance_squared = projectile_one.collider.center.distanceToSquared(projectile_two.collider.center);
				
				// Find the minimum distance the projectiles can be without clipping.
				const min_distance = projectile_one.collider.radius + projectile_two.collider.radius;
				const min_distance_squared = min_distance * min_distance;
				// Check if projectiles are clipping each other.
				if (real_distance_squared < min_distance_squared) {
					// Calculate the velocity from each projectile towards the other.
					normal.subVectors(projectile_one.collider.center, projectile_two.collider.center).normalize();
					project_one_change.copy(normal).multiplyScalar(normal.dot(projectile_one.velocity));
					project_two_change.copy(normal).multiplyScalar(normal.dot(projectile_two.velocity));
					
					// Repel each projectile
					projectile_one.velocity.add(project_two_change).sub(project_one_change);
					projectile_two.velocity.add(project_one_change).sub(project_two_change);

					const amount_projectile_overlap = (min_distance - Math.sqrt(real_distance_squared)) / 2;

					// move the projectile away from each other.
					projectile_one.collider.center.addScaledVector(normal, amount_projectile_overlap);
					projectile_two.collider.center.addScaledVector(normal, -amount_projectile_overlap);
				}
			}
		}
	}



	reset(){
		for (let i = 0, length = this.projectiles.length; i < length; i++) {
			this.projectiles[i].reset();
		}
	}
}

export { Projectiles };