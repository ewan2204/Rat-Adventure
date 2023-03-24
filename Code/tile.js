import * as THREE from "../Libaries/three.module.js";
import { GLTFLoader } from "../Libaries/GLTFLoader.js";
import { Octree } from "../Libaries/Octree.js";

const path_to_Models 	= 	"../Assets/gltf";

/**
 * Each tile is 8x8m and has a variable height and entrances.
 * This class keeps track of all tiles and allows for them to be interchanged.
 */
class TileManager {
	position = 0;
	selected;


	/**
	 * Load the textures and the raycaster needed to facilitate the tiles existance.
	 */
	constructor() { 
		this.loadTileTextures();
		this.loadTileParts();
		this.tiles = [];
		this.raycaster = new THREE.Raycaster();
		this.dynamic_Octree = new Octree();
		this.selectedMaterial = new THREE.MeshBasicMaterial(0xFFBF00);
		this.selectedMaterial.color = new THREE.Color( 0xFFBF00 );

	}

	
	getOctree(){
		return this.dynamic_Octree;
	}

	// Update octree by creating a new octree and adding all the colliders to it.
	updateOctree(){
		// Iterate through all the tiles and add them to a new octree.
		this.dynamic_Octree = new Octree();
		for (var i = 0; i < this.tiles.length; i++) {
			this.dynamic_Octree.fromGraphNode(this.tiles[i].collider);
		}

	}


	async loadTileTextures(){
		const textureLoader = new THREE.TextureLoader();
		/**
		 * Load the sand texture and normal which are applied to all the objects in the map This reduces load time as only 2 images must be loaded
		 * instead of each object containing it's own image file.
		 * 
		 * This reduces the amount that must be sent over the internet lowering load times
		 */
		this.sand_texture 		= textureLoader.load( "../Assets/Textures/Sand Texture-1024-min.jpg");
		this.sand_normal 		= textureLoader.load( "../Assets/Textures/Sand Normal-1024-min.jpg");
		this.sand_normal.flipY 	= false;
		this.sand_texture.flipY = false;

		//// Load the textures for fire.
		//this.fire_texture = textureLoader.load( "../Assets/gltf/Torch/Fire.png");
		//this.fire_texture.flipY = false;
		this.lava_texture = textureLoader.load( "../Assets/Textures/Lava+Rock Texture-min.jpg");
		this.lava_texture.flipY = false;
	}


	// Load the parts required to make each tile type.
	async loadTileParts(){
		const loader = new GLTFLoader().setPath(path_to_Models);
	
		// setup the models for usage
		this.connector_model 		= setupEgyptPart(await loader.loadAsync("/Egypt/NewEgypt/egypt_corner.glb"), this.sand_texture, this.sand_normal);
		this.wall_model 			= setupEgyptPart(await loader.loadAsync("/Egypt/NewEgypt/egypt_wall.glb"), this.sand_texture, this.sand_normal);
		this.flat_wall_model 		= setupEgyptPart(await loader.loadAsync("/Egypt/NewEgypt/egypt_wall_flat.glb"), this.sand_texture, this.sand_normal);
		this.floor_model 			= setupEgyptPart(await loader.loadAsync("/Egypt/NewEgypt/egypt_floor.glb"), this.sand_texture, this.sand_normal);
		this.flat_connector_model 	= setupEgyptPart(await loader.loadAsync("/Egypt/NewEgypt/egypt_corner_flat.glb"), this.sand_texture, this.sand_normal);

		// Setup the torch model
		this.torch_model = setupTorch(await loader.loadAsync("/Torch/Torch.glb"), this.lava_texture);

		
		const floor_size 	 = new THREE.Vector3();
		this.floor_model.geometry.boundingBox.getSize(floor_size);
		floor_size.multiplyVectors(floor_size, this.floor_model.scale);
		this.floor_size = floor_size;

	
		const wall_size  	 = new THREE.Vector3();
		this.wall_model.geometry.boundingBox.getSize(wall_size);
		wall_size.multiplyVectors(wall_size, this.wall_model.scale);
		this.wall_size = wall_size;

		const connector_size = new THREE.Vector3();
		this.connector_model.geometry.boundingBox.getSize(connector_size);
		connector_size.multiplyVectors(connector_size, this.connector_model.scale);
		this.connector_size = connector_size;

		const flat_wall_size = new THREE.Vector3();
		this.flat_wall_model.geometry.boundingBox.getSize(flat_wall_size);
		flat_wall_size.multiplyVectors(flat_wall_size, this.flat_wall_model.scale);
		this.flat_wall_size = flat_wall_size;

		const flat_connector_size = new THREE.Vector3();
		this.flat_connector_model.geometry.boundingBox.getSize(flat_connector_size);
		flat_connector_size.multiplyVectors(flat_connector_size, this.flat_connector_model.scale);
		this.flat_connector_size = flat_connector_size;
	}


	// load the colliders asscoiated with each tile type.
	async loadLowPolyParts(){
		const loader = new GLTFLoader().setPath(path_to_Models);
		// Bring in the low poly versions of the models which can be used to model collisions of the tiles.
		this.tile_one_collider 		= (await loader.loadAsync("/Egypt/NewEgypt/low_poly_tile_one.glb")).scene;
		this.tile_two_collider 		= (await loader.loadAsync("/Egypt/NewEgypt/low_poly_tile_two.glb")).scene;
	}


	// Create the first tile type which is a straight line tile.
	async createTileOne(tile_position = new THREE.Vector3(0,0,0), tile_rotation = new THREE.Vector3(0,0,0)){
		const tile = new THREE.Group();


		tile.collider = this.tile_one_collider.clone();

		tile.name = "200_tile";

		// Add floor
		for(let i = 0; i < 16; i++){
			let floor_clone = this.floor_model.clone();
			floor_clone.position.x = -3 + (i % 4) * this.floor_size.x;
			floor_clone.position.z = -3 + Math.floor(i / 4) * this.floor_size.z;
			tile.add(floor_clone);
		}

		// Add walls.
		for(let i = 0; i < 8; i++){
			let wall_clone = this.wall_model.clone();
			wall_clone.position.y = 3.5;
			// Move wall horizontally to place to side by side
			wall_clone.position.x = 3.5 - Math.floor(i / 4) * 7;
			wall_clone.position.z = 3 - (i % 4) * 2;

			if(i > 2){
				wall_clone.rotation.y = Math.PI;
			}			
			tile.add(wall_clone);
		}

		// Add Support walls.
		for(let i = 0; i < 8; i++){
			let flat_wall_clone = this.flat_wall_model.clone();
			flat_wall_clone.position.y = 1.5;
			// Move wall horizontally to place to side by side
			flat_wall_clone.position.x = 3.5 - Math.floor(i / 4) * 7;
			flat_wall_clone.position.z = 3 - (i % 4) * 2;

			if(i > 3){
				flat_wall_clone.rotation.y = Math.PI;
			}			
			tile.add(flat_wall_clone);
		}


		this.tiles.push(tile);

		// move the tile to the desired location in world after loading it together.
		tile.position.copy(tile_position);
		tile.collider.position.copy(tile.position);
		tile.collider.rotation.x = tile.rotation.x = tile_rotation.x;
		tile.collider.rotation.y = tile.rotation.y = tile_rotation.y;
		tile.collider.rotation.z = tile.rotation.z = tile_rotation.z;

		
		this.dynamic_Octree.fromGraphNode(tile.collider);
		return tile;
	}


	// Create the first tile type which is a L shaped Tile
	async createTileTwo(tile_position = new THREE.Vector3(0,0,0), tile_rotation = new THREE.Vector3(0,0,0)){
		const tile = new THREE.Group();
		tile.name = "200_tile";
	
		tile.collider = this.tile_two_collider.clone();


		// Add floor
		for(let i = 0; i < 16; i++){
			let floor_clone = this.floor_model.clone();
			floor_clone.position.x = -3 + (i % 4) * this.floor_size.x;
			floor_clone.position.z = -3 + Math.floor(i / 4) * this.floor_size.z;
			tile.add(floor_clone);
		}

		// Add Top wall pieces.
		const wall_locations = [[3.5, 3.5, 3], [3.5, 3.5, 1], [3.5, 3.5, -1], [3.5, 3.5, -3], [3, 3.5, 3.5], [1, 3.5, 3.5], [-1, 3.5, 3.5], [-3, 3.5, 3.5]];
		const wall_rotations = [0, 0, 0,0, -Math.PI / 2, -Math.PI / 2, -Math.PI / 2, -Math.PI / 2];
		for(let i = 0; i < 8; i++){
			let wall_clone = this.wall_model.clone();
			wall_clone.position.x = wall_locations[i][0];
			wall_clone.position.y = wall_locations[i][1];
			wall_clone.position.z = wall_locations[i][2];
			wall_clone.rotation.y = wall_rotations[i];		
			tile.add(wall_clone);
		}

		// Add Support walls.
			const flat_wall_locations = [[3.5, 1.5, 3], [3.5, 1.5, 1], [3.5, 1.5, -1], [3.5, 1.5, -3], [3, 1.5, 3.5], [1, 1.5, 3.5], [-1, 1.5, 3.5], [-3, 1.5, 3.5]];
			const flat_wall_rotations = [0, 0, 0, 0, -Math.PI / 2, -Math.PI / 2, -Math.PI / 2, -Math.PI / 2];
		for(let i = 0; i < 8; i++){
			let flat_wall_clone = this.flat_wall_model.clone();
			// Set the desired position.
			flat_wall_clone.position.x = flat_wall_locations[i][0];
			flat_wall_clone.position.y = flat_wall_locations[i][1];
			flat_wall_clone.position.z = flat_wall_locations[i][2];


			if(i > 3){
				flat_wall_clone.rotation.y = -Math.PI / 2;
			}			
			tile.add(flat_wall_clone);
		}



		// Add Corners.
		const corner_locations = [[-3.5, -3.5]];
		const corner_rotations = [ Math.PI / 2];
		for(let i = 0; i < corner_locations.length; i++){
			let corner_clone = this.connector_model.clone();
			corner_clone.position.y = 3.5
			corner_clone.position.x = corner_locations[i][0];
			corner_clone.position.z = corner_locations[i][1];

			corner_clone.rotation.y = corner_rotations[i];

			tile.add(corner_clone);
		}


		// Add Flat Corner Piece
		const flat_corner_locations = [[-3.5, 1.5, -3.5]];
		for(let i = 0; i < flat_corner_locations.length; i++){
			let flat_connector_clone = this.flat_connector_model.clone();
			flat_connector_clone.position.x = flat_corner_locations[i][0];
			flat_connector_clone.position.y = flat_corner_locations[i][1];
			flat_connector_clone.position.z = flat_corner_locations[i][2];
			
			tile.add(flat_connector_clone);
		}

		this.tiles.push(tile);

		// move the tile to the desired location in world after loading it together.
		//tile.position.set(tile_position.x, tile_position.y, tile_position.z);
		tile.position.copy(tile_position);
		tile.collider.position.copy(tile.position);
		tile.collider.rotation.x = tile.rotation.x = tile_rotation.x;
		tile.collider.rotation.y = tile.rotation.y = tile_rotation.y;
		tile.collider.rotation.z = tile.rotation.z = tile_rotation.z;
		
		this.dynamic_Octree.fromGraphNode(tile.collider);
		return tile;
	}

	/**
	 * 
	 * @param { THREE.Group } tile -- The tile of whose collider to copy the rotation and positooon to. 
	 * @returns 
	 */
	tile_collider_update(tile){
		tile.collider.position.copy(tile.position);
		tile.collider.rotation.copy(tile.rotation);
		return;
	}


	/**
	 * Given two tiles in group format swap their positions and then recalculte the dynamic octree for all tiles and return it.
	 * @param { THREE.Group } tile_one - A tile to swap 
	 * @param { THREE.Group } tile_two - A second tile.
	 * @returns 
	 */
	async swapTile(tile_one, tile_two){
		const tile_one_position = tile_one.position.clone();

		tile_one.position.copy(tile_two.position);
		tile_two.position.copy(tile_one_position);


		this.tile_collider_update(tile_one);
		this.tile_collider_update(tile_two);


		this.updateOctree();
	}

	/**
	 * Given a camera and mouse position calculate what tiles the raycast intersects.
	 * When two tiles are selected swap their positions.
	 * @param { THREE.Camera } camera - The camera from which to raycast from 
	 * @param {  THREE.Vector3 } mouse_position - mouse posiition to calculate from where to cast the ray.
	 * @returns 
	 */
	processRaycast(camera, mouse_position){
		this.raycaster.setFromCamera(mouse_position, camera);


		// Process the raycast to select out the tile group asscoiated with the ray.
		const tile_selected = this.extractTileFrromRaycast(this.raycaster.intersectObjects(this.tiles, true));

		// If there is no tile associated just return.
		if(!tile_selected){
			return;
		}

		// If there is check if there is another tile already selected
		if(!this.selected){
			// If this is the first tile selected set selected equal to this and return.
			this.selected = tile_selected;
			this.retextureTile(this.selected, "select");
		}else{
			// If there is another tile selected swap them then unselect the tiles.
			this.retextureTile(this.selected, "deselect");
			this.swapTile(this.selected, tile_selected);

			this.selected = false;
			
		}

	}

	// Given a set of objects return the first one which is a tile.
	extractTileFrromRaycast(array_of_tile_objects){
		if(array_of_tile_objects.length === 0){
			return false;
		}

		if(array_of_tile_objects[0].object.parent.name === "200_tile"){
			return array_of_tile_objects[0].object.parent;
		}
	}

	/**
	 * Rotate a tile and then update their collider.
	 * @param { Group } tile  					- tile of which to rotate
	 * @param { THREE.Vector3 } tile_rotation - XYZ rotation in euler coords 
	 * @returns 
	 */
	rotateTile(tile, tile_rotation){
		tile.rotation.x = tile_rotation.x;
		tile.rotation.y = tile_rotation.y;
		tile.rotation.z = tile_rotation.z;
		this.tile_collider_update(tile);
		return tile;
	}


	/**
	 * Given a tile swap its texture with, it's old texture or a new plain texture
	 * @param { Group } tile 		- Tile which texture to swap.
	 * @param { String } tile_texture - Whether or not to swap to new or old
	 */
	retextureTile(tile, tile_texture){

		
		tile.traverse((child) => {
			if (child.isMesh) {
				if(tile_texture === "select"){
					child.realMaterial = child.material.clone();
					child.material = this.selectedMaterial;
				}else{
					child.material = child.realMaterial;
				}

			}
		});
	}

	/**
	 * Add a torch to a given tile and also to the scene.
	 * @param {THREE.Scene } scene 		- Scene to add torch to 
	 * @param {THREE.Group } tile 		- Tile to parent the torch to
	 * @param {THREE.Vector3} torch_position 	- Position rleative to tile to attach torch
	 * @param {Vector3} torch_rotation - Rotation rleative to tile to attach torch
	 */
	addTorch(scene, tile, torch_position = THREE.Vector3(), torch_rotation = THREE.Vector3()){
		// Clone the torch
		const torch = this.torch_model.clone();

		// Create a light which can be associated with the torch.
		const torch_light = new THREE.PointLight(0xF73718, 2, 30, 2);
		torch_light.position.set(0, -1, 0);
		torch_light.castShadow = true;
		
		// Setup the Torch shadows
		torch_light.shadow.camera.far = 30;
		torch_light.shadow.bias = -0.05;
		torch_light.shadow.normalbias = -7;

		// Attach the torch and light to the scene
		scene.add(torch);
		scene.add(torch_light);

		// Attach the light to the torch
		torch.add(torch_light);

		// Attach the torch and light to the tile
		tile.add(torch);

		// Rotate the torch and move to the desired space.
		torch.position.copy(torch_position);
		torch.rotation.x = torch_rotation.x;
		torch.rotation.y = torch_rotation.y;
		torch.rotation.z = torch_rotation.z;
	}

	/**
	 * Clear the raycast selected feature and decolour any tile if it is selected.
	 */
	clearRaycast(){
		if(this.selected){
			this.retextureTile(this.selected, "deselect");
		}
		this.selected = false;
	}


	/**
	 * Called when loading a new level clear the scene of tiles Which is done in levels and remove all existing tile refrences
	 */
	reset(){
		// Empty the data stuctures so js's garbage collection will remove them.
		this.dynamic_Octree = new Octree();
		this.tiles = [];
	}

}

/**
 * Given torch data ensure the part is flame is using the fire texture and resize to the correct scale.
 * @param { Group } torch_data 	- Torch data
 * @param { THREE.Texture } fire_texture 	- The texture to make the flame/fire
 * @returns 
 */
function setupTorch(torch_data, fire_texture){
	const mesh = torch_data.scene.children[0];

	// Scale the torch
	mesh.scale.set(0.4, 0.4, 0.4);

	// Iterate Through all Rat Children Mesh's and enable shadows
	mesh.children.forEach((child) => {
		if(child.material.name === "Fire"){
			child.material.map = fire_texture;
		}
	});

	return mesh;

}


/**
 * Given a part ensure it is using the material texture and normal texture given. Rename so that it is easy to remove from scnee.
 * @param { Group } mesh_data 		- DATA containing the mesh
 * @param { THREE.Texture} material_texture 	- Material to give to the mesh	
 * @param { THREE.Texture} normal_texture 	- Normal map to give to the mesh.
 * @returns 
 */
function setupEgyptPart(mesh_data, material_texture, normal_texture){
	/**
	 * Given the mesh data from a gltf loader load the first scene, apply the given texture and normal map and then allow shading.
	 */



	const mesh = mesh_data.scene.children[0];


	//mesh.material = new THREE.MeshPhongMaterial(); 

	mesh.material.map = material_texture;
	mesh.material.normalMap = normal_texture;

	mesh.material.side = THREE.DoubleSide;

	mesh.flatShading = false;
	mesh.castShadow = true;
	mesh.receiveShadow = true;

	mesh.name = "100_egypt";

	return mesh;

}

export{ TileManager };