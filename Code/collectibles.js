import * as THREE from "../Libaries/three.module.js";

import { Octree } from "../Libaries/Octree.js";
import { AnimationObjectGroup, Group, Scene, Vector3 } from "../Libaries/three.module.js";
import { Player } from "./player.js";
import { Projectiles } from "./projectiles.js";

class Collectible {
	model;
	bounding_box;
	/**
	 * Create a collectible with the model at a given point and add it to the scene.
	 * @param { Group } 	model 			- Model of the Collectible.
	 * @param { Vector3 } 	location		- Where to create to.
	 * @param { Scene } 	scene 			- Scene to add them to.
	 * @param { THREE.Audio } audio 			- Audio to play when collected.
	 */
	constructor(model, location, scene, audio){
		scene.add(model);

		model.position.copy(location);
		
		this.model = model;
		this.pole = model;
		if(audio){
			this.audio = audio;
			this.model.add(this.audio);
		}


		this.bounding_box = new THREE.Box3().setFromObject(this.model);
		//this.model.add(this.bounding_box);
	}

	///**
	// * Create a collectible with the model at a given point and add it to the scene.
	// * @param { Group } 	model 			- Model of the Collectible.
	// * @param { Vector3 } 	location		- Where to create to.
	// * @param { Scene } 	scene 			- Scene to add them to.
	// */
	//constructor(model, location, scene){
	//	scene.add(model);
//
	//	model.position.copy(location);
	//	
	//	this.model = model;
	//	this.bounding_box = new THREE.Box3().setFromObject(model);
	//	this.model.add(this.bounding_box);
	//}

	/**
	 * Used to realign the bounding box with the current world state useful if the model moves.
	 */
	updateBoundingBox(){
		this.bounding_box = new THREE.Box3().setFromObject(this.pole);
	}

	/**
	* Updates the positon of the model and then adjusts the bounding box accorddingly removes the need to recalcualte the bounding box
	* @param { Vector3 } position - new position to place the model in. 
	*/
	moveCollectibleWithBoundingBox(position){
		let difference = new Vector3(this.model.position.x - position.x, this.model.position.y - position.y, this.model.position.z - position.z)  ;

		this.bounding_box.min.sub(difference);
		this.bounding_box.max.sub(difference); 
		this.model.position.copy(position);

	}


	/**
	 * Perform checks for collection
	 * @param { Player } player 		- Player Object
	 */
	update(player){


		// Check player collisions if true collect this item.
		if(this.playerCollectibleIntersection(player)){
			this.collect();
			return true;
		}
		return false;
	}

	/**
	 * Given a player calculate if the projectile intersects return the answer.
	 * @param { Player } player - Player
	 * @returns { Boolean } - True if colliding with the player.
	 */
	playerCollectibleIntersection(player){
		if(this.bounding_box){
			const player_bounding_box = player.collider.boundingBox;
			return(this.bounding_box.intersectsBox(player_bounding_box));
		}
		return false;
	}


	/**
	 * Check if a given projectile should collect the collectible. 
	 * @param { projectile } projectile - The projectible which might collect the collectible
	 */
	collideProjectile(projectile){
		if(this.projectileCollectibleIntersection(projectile)){
			this.collect();
			return true;
		}
		return false;
	}
	

	/**
	 * Given a projectile calculate if it intersects the bounding box return the answer.
	 * @param { projectile } projectile - The projectible which might collide with the collectible
	 * @returns { Boolean } - True if colliding with the projectile.
	 */
	projectileCollectibleIntersection(projectile){
		if(this.bounding_box){
			const distance_to_projectile_center = this.bounding_box.distanceToPoint(projectile.collider.center);
			return distance_to_projectile_center <= projectile.collider.radius;
		}
		return false;
	}



	/**
	 * Teleport the collectible under the map hiding it from the player.
	 */
	collect(){
		if(this.audio){
			this.model.visible  =false;
			this.bounding_box = null;
			this.audio.play();
		}else{
			return true;
		}
		
	}
}



class Collectibles {
	/**
	 * Given features to make a collectible create several at the locations requested and store them for future access.
	 * @param { Group } 	model 			- Model of the Collectible.
	 * @param { [Vector3] } locations 		- Where to create to.
	 * @param { Scene } 	scene 			- Scene to add them to.
	 * @param { THREE.PositionalAudio } audio 		- audio to play when collected.
	 */
	constructor(model, audio, listener){
		this.collected = 0;
		this.collectibles = [];
		this.model = model;
		this.audio_location = audio;
		this.listener = listener;

		this.HTML_collectibles_max = document.getElementById( 'cheese_remaining' );
		this.HTML_collectibles_count = document.getElementById( 'cheese_collected' );
		this.HTML_collectibles_max.innerHTML = "/" + this.collectibles.length.toString();
		this.HTML_collectibles_count.innerHTML = "0"
	}


	async createCollectibles(scene, locations){
		// Create an audio loader and load in some audio for us to play.
		const audio_loader = new THREE.AudioLoader;
		const audio_played_when_collected = await audio_loader.loadAsync(this.audio_location);
		let audio = new THREE.PositionalAudio( this.listener );
		this.model.name = "300_collectible";

		for (let i = 0; i < locations.length; i++) {
			// Create some new audio and attach our loaded audio file to it
			audio = new THREE.PositionalAudio( this.listener );
			audio.setBuffer(audio_played_when_collected)
			let collectible = new Collectible(this.model.clone(), locations[i], scene, audio);
			this.collectibles.push(collectible);
		}

		this.HTML_collectibles_max.innerHTML = "/" + this.collectibles.length.toString();
		this.HTML_collectibles_count.innerHTML = this.collected;

	}

	/**
	* Update all the collectibles to check if collided with the player.
	* @param { Player } player 			- Player
	*/
	update(player) {
		this.collectibles.forEach((collectible) => {
			if(collectible.update(player)){
				this.collected++;
				this.HTML_collectibles_count.innerHTML = this.collected.toString();
			};
		});
	}

	/**
	* Update all the collectibles to check if collided with the player.
	* @param { Projectiles } projectiles 	- projectiles which can also harvest/collect the collectibles.
	*/
	collideProjectiles(projectiles) {
		projectiles.projectiles.forEach((projectile) => {
			this.collectibles.forEach((collectible) => {
				if(collectible.collideProjectile(projectile)){
					this.collected++;
					this.HTML_collectibles_count.innerHTML = this.collected.toString();
				};
			});
		});

	}

	/**
	 * Returns the amount of collectibles still yet to be collected.
	 * @returns Integer
	 */
	amountLeft(){
		return this.collectibles.length - this.collected;
	}

	/**
	 * Reset function called when loading a new level resets the counter
	 */
	reset(){
		this.collected = 0;
		this.collectibles = [];
		this.HTML_collectibles_max.innerHTML = "/" + this.collectibles.length.toString();
		this.HTML_collectibles_count.innerHTML = this.collected;
	}

}


export { Collectibles, Collectible };