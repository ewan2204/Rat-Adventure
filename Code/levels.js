import * as THREE from "../Libaries/three.module.js";
import { GLTFLoader } from "../Libaries/GLTFLoader.js";
import { FontLoader } from "../Libaries/FontLoader.js";
import { TextGeometry } from "../Libaries/TextGeometry.js";
import { Octree } from "../Libaries/Octree.js";
import { TileManager } from "./tile.js";
import { Collectible, Collectibles } from "./collectibles.js";
import { Player } from "./player.js";
import { shader_uniform }  from "./ratArchaeologist.js";

// Setup Where file are stored for loading later.
const path_to_Models 	= 	"../Assets/gltf";
const path_to_environment1 =  	"/Levels/Level1/Level 1.glb";
const path_to_level2 = "/Levels/Level2/Level 2.glb";
const path_to_tutorial = "/Levels/Tutorial/Tutorial.glb";
//const path_to_environment2 =  	"/Fix.glb";


// Sky Colour
const cubeLoader = new THREE.CubeTextureLoader();
cubeLoader.setPath( '../Assets/Skybox/Wasteland/wasteland_' );

const mars_texture_cube = cubeLoader.load( [
	'ft.jpg', 'bk.jpg',
	'up.jpg', 'dn.jpg',
	'rt.jpg', 'lf.jpg'
] );

/**
 * Load the first level into the scene adding lights
 * 
 * @param {	Scene } scene 						- The scene to add the level to
 * @param {	Octree } worldOctree 					- The Octree to add the level to.
 * @param { TileManager } tile_manager 			- Allows us to create and modify tiles
 * @param { Collectibles } collectible_manager 	- Allows us to interface and createe new collectibles around the map.
 * @param { Collectible } goal					- ALlows us to move around the end goal.
 */
async function loadLevelOne(scene, worldOctree, tile_manager, collectible_manager, goal) {
	unloadLevel(scene);

	
	
	scene.background = mars_texture_cube;

	// Add Lighting
	const ambientlight = new THREE.AmbientLight(0x6688cc);
	ambientlight.name = "300_ambient_light";
	scene.add(ambientlight);



	addDirectionalLight(scene, 0xffffaa, 1.2, new THREE.Vector3(-27.65, 59.03, 96.1));


	const tile_with_light 	= await tile_manager.createTileTwo(new THREE.Vector3(0, 0, -8), new THREE.Vector3(0, Math.PI/2, 0));
	const rotated_tile 		= await tile_manager.createTileTwo(new THREE.Vector3(0, 0, -16), new THREE.Vector3(0, Math.PI, 0));

	scene.add(await tile_manager.createTileOne(new THREE.Vector3(8, 0, -16)));
	scene.add(rotated_tile);

	scene.add(tile_with_light);
	tile_manager.addTorch(scene, tile_with_light, new THREE.Vector3(2.8, 2, 0), new THREE.Vector3(0, 0, Math.PI/8 + Math.PI));



	await loadLevel(scene, worldOctree, path_to_environment1);
	goal.moveCollectibleWithBoundingBox(new THREE.Vector3(0, 2, 5));

	const collectible_locations = [new THREE.Vector3(-7, 2, -16), new THREE.Vector3(8, 2, -8), new THREE.Vector3(15.5, 2, -15.5)];
	await collectible_manager.createCollectibles(scene, collectible_locations);
	
	addGLSLFeatures(scene);
	return;
	
}

/**
 * Load the first level into the scene adding lights
 * 
 * @param {Scene} scene The scene to add the level to
 * @param {Octree} worldOctree The Octree to add the level to.
 * @param { TileManager } tile_manager - Controller for adding and adjusting tiles
 * @param { Collectibles } collectible_manager - Allows for us to add new collectibles to the scene.
 * @param { Collectible } goal					- Allows us to move the goal to where we want in the level
 * @param { Player } 	player 					- Allows us to move the player to the start position.
 */
async function loadTutorial(scene, worldOctree, tile_manager, collectible_manager, goal, player) {
	unloadLevel(scene);

	// Sky Colour
	const cubeLoader = new THREE.CubeTextureLoader();
	cubeLoader.setPath( '../Assets/Skybox/Zeus/zeus_' );

	const textureCube = cubeLoader.load( [
		'ft.jpg', 'bk.jpg',
		'up.jpg', 'dn.jpg',
		'rt.jpg', 'lf.jpg'
	] );

	scene.background = textureCube;

	// Add Lighting
	const ambientlight = new THREE.AmbientLight(0x6688cc);
	ambientlight.name = "300_ambient_light";
	scene.add(ambientlight);

	
	await loadLevel(scene, worldOctree, path_to_tutorial);
	addDirectionalLight(scene, 0xffffaa, 1.2, new THREE.Vector3(-5.519, 19.754, 8.34));


	const tile_with_light 	= await tile_manager.createTileTwo(new THREE.Vector3(4, .5, -15), new THREE.Vector3(0, Math.PI, 0));
	const rotated_tile 		= await tile_manager.createTileTwo(new THREE.Vector3(-4, .5, -15), new THREE.Vector3(0, 0, 0));

	scene.add(rotated_tile);

	scene.add(tile_with_light);
	tile_manager.addTorch(scene, tile_with_light, new THREE.Vector3(2.8, 2, 0), new THREE.Vector3(0, 0, Math.PI/8 + Math.PI));





	const font_loader = new FontLoader();
	const font = await font_loader.loadAsync( '../Assets/fonts/optimer_bold.typeface.json');


	const collect_cheese_geo = new TextGeometry( 'Collect all the Cheese', {font: font});
	const collect_cheese_mesh = new THREE.Mesh( collect_cheese_geo, new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } ) );
	collect_cheese_mesh.position.set(-5 ,3,25);
	collect_cheese_mesh.scale.set(0.01,0.01,0.01);

	const fall_geo = new TextGeometry( "Don't fall off", {font: font});
	const fall_mesh = new THREE.Mesh( fall_geo, new THREE.MeshPhongMaterial( { color: 0xFFC300, flatShading: true } ) );
	fall_mesh.position.set(2 ,3,15);
	fall_mesh.scale.set(0.01,0.01,0.01);

	const rat_geo = new TextGeometry( "Rats that you throw \ncollect too!", {font: font});
	const rat_mesh = new THREE.Mesh( rat_geo, new THREE.MeshPhongMaterial( { color: 0xFFC300, flatShading: true } ) );
	rat_mesh.position.set(4 ,3,-4);
	rat_mesh.rotation.y = -Math.PI/2;
	rat_mesh.scale.set(0.007,0.01,0.007);
	
	const m_geo = new TextGeometry( "Press M to \nchange map view", {font: font});
	const m_mesh = new THREE.Mesh( m_geo, new THREE.MeshPhongMaterial( { color: 0xFFC300, flatShading: true } ) );
	m_mesh.position.set(-10 ,4,-10);
	m_mesh.scale.set(0.01,0.01,0.01);

	const swap_geo = new TextGeometry( "Click sand tiles\nto swap them", {font: font});
	const swap_mesh = new THREE.Mesh( swap_geo, new THREE.MeshPhongMaterial( { color: 0xC70039, flatShading: true } ) );
	swap_mesh.position.set(-18 ,4,-14);
	swap_mesh.rotation.x = -Math.PI/2;
	swap_mesh.scale.set(0.01,0.01,0.01);
	swap_mesh.layers.set(2);

	const finish_geo = new TextGeometry( "Once collected all cheese\nGo to the cheese flag!", {font: font});
	const finish_mesh = new THREE.Mesh( finish_geo, new THREE.MeshPhongMaterial( { color: 0xC70039, flatShading: true } ) );
	finish_mesh.position.set(-14 ,8,-28);
	finish_mesh.rotation.y = Math.PI/4;
	finish_mesh.scale.set(0.01,0.01,0.01);

	collect_cheese_mesh.name = "300_text";
	fall_mesh.name = "300_text";
	rat_mesh.name = "300_text";
	m_mesh.name = "300_text";
	swap_mesh.name = "300_text";
	finish_mesh.name = "300_text";

	
	scene.add(collect_cheese_mesh);
	scene.add(fall_mesh);
	scene.add(rat_mesh);
	scene.add(m_mesh);
	scene.add(swap_mesh);
	scene.add(finish_mesh);





	player.moveToPosition(new THREE.Vector3(0,2.5,30));
	goal.moveCollectibleWithBoundingBox(new THREE.Vector3(0,2.5,-32));

	const collectible_locations = [new THREE.Vector3(8, 2, 1), new THREE.Vector3(0, 2, 15), new THREE.Vector3(8, 2, -9), new THREE.Vector3(7.5, 2, 30)];
	await collectible_manager.createCollectibles(scene, collectible_locations);

	await loadElement(scene, worldOctree, "/Clutter/Tent.glb", new THREE.Vector3(-5,2,-32), new THREE.Vector3(0, Math.PI, 0));
	await loadElement(scene, worldOctree, "/Clutter/Tent.glb", new THREE.Vector3(4,2,-28), new THREE.Vector3(0, 3*Math.PI/4, 0));
}


async function loadLevelTwo(scene, worldOctree, tile_manager, collectible_manager, goal, player){
	unloadLevel(scene);

	// Sky Colour
	const cubeLoader = new THREE.CubeTextureLoader();
	cubeLoader.setPath( '../Assets/Skybox/Night/' );

	const textureCube = cubeLoader.load( [
		'right.jpg', 'left.jpg',
		'up.jpg', 'Bot.jpg',
		'front.jpg', 'Back.jpg'
	] );

	scene.background = textureCube;

	// Add Lighting
	const ambientlight = new THREE.AmbientLight(0xffffff);
	ambientlight.name = "300_ambient_light";
	scene.add(ambientlight);

	// Add a light facing up within the lava tunnel
	const intensity = 1;
	const lava_light = new THREE.PointLight( 0xeb7135, intensity);
	lava_light.position.set( 10, -20, 0 );
	scene.add( lava_light );


	
	await loadLevel(scene, worldOctree, path_to_level2);
	addDirectionalLight(scene, 0xc2c5cc, .8, new THREE.Vector3(-15.6236, 14, 15));


	const tile_with_light 	= await tile_manager.createTileTwo(new THREE.Vector3(14, 6.5, -34), new THREE.Vector3(0, Math.PI, 0));
	const rotated_tile 		= await tile_manager.createTileTwo(new THREE.Vector3(14, 6.5, -42), new THREE.Vector3(0, 0, 0));
	scene.add(await tile_manager.createTileOne(new THREE.Vector3(22, 6.5, -42), new THREE.Vector3(0, 0, 0)));
	scene.add(await tile_manager.createTileOne(new THREE.Vector3(22, 6.5, -50), new THREE.Vector3(0, 0, 0)));
	scene.add(await tile_manager.createTileOne(new THREE.Vector3(22, 6.5, -50), new THREE.Vector3(0, 0, 0)));
	scene.add(await tile_manager.createTileTwo(new THREE.Vector3(22, 6.5, -58), new THREE.Vector3(0, Math.PI / 2, 0)));
	scene.add(await tile_manager.createTileOne(new THREE.Vector3(14, 6.5, -58), new THREE.Vector3(0, Math.PI / 2, 0)));




	scene.add(rotated_tile);

	scene.add(tile_with_light);
	tile_manager.addTorch(scene, tile_with_light, new THREE.Vector3(2.8, 2, 0), new THREE.Vector3(0, 0, Math.PI/8 + Math.PI));





	const font_loader = new FontLoader();
	const font = await font_loader.loadAsync( '../Assets/fonts/optimer_bold.typeface.json');


	const collect_cheese_geo = new TextGeometry( 'Their is Cheese\nbehind this store!', {font: font});
	const collect_cheese_mesh = new THREE.Mesh( collect_cheese_geo, new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } ) );
	collect_cheese_mesh.position.set(-13 ,4,+4);
	collect_cheese_mesh.rotation.y = Math.PI/2;
	collect_cheese_mesh.scale.set(0.007,0.01,0.007);

	const rat_geo = new TextGeometry( "Rats are expendable\n You are not", {font: font});
	const rat_mesh = new THREE.Mesh( rat_geo, new THREE.MeshPhongMaterial( { color: 0xFFC300, flatShading: true } ) );
	rat_mesh.position.set(12 ,3,-4);
	rat_mesh.rotation.y = -Math.PI/2;
	rat_mesh.scale.set(0.007,0.01,0.007);

	collect_cheese_mesh.name = "300_text";
	rat_mesh.name = "300_text";


	
	scene.add(collect_cheese_mesh);
	scene.add(rat_mesh);





	player.moveToPosition(new THREE.Vector3(0,2.5,0));
	goal.moveCollectibleWithBoundingBox(new THREE.Vector3(-9,8.5,-60));

	const collectible_locations = [new THREE.Vector3(0, 8.5, -32), new THREE.Vector3(10, -3, 0), new THREE.Vector3(-16, 2 , -3), new THREE.Vector3(0, 2, 12)];
	await collectible_manager.createCollectibles(scene, collectible_locations);

	await loadElement(scene, worldOctree, "/Clutter/room.glb", new THREE.Vector3(0,2,8), new THREE.Vector3(0, Math.PI, 0));
}


async function loadLevel(scene, worldOctree, path_to_environment){

	const loader = new GLTFLoader().setPath(path_to_Models);

	const gltf = await loader.loadAsync(path_to_environment);


	scene.add(gltf.scene);
	
	worldOctree.fromGraphNode(gltf.scene);

	gltf.scene.traverse((child) => {
		if (child.isMesh) {
			child.castShadow = true;
			child.receiveShadow = true;

			if (child.material.map) {
				child.material.map.anisotropy = 8;
			}
			child.name = "300_" + child.name;
		}
	});
	gltf.scene.name = "300_" + gltf.scene.name;

	return;
}

async function loadElement(scene, worldOctree, path_to_environment, position, rotation){
	const loader = new GLTFLoader().setPath(path_to_Models);

	const gltf = await loader.loadAsync(path_to_environment);


	scene.add(gltf.scene);
	gltf.scene.position.copy(position);
	gltf.scene.rotation.x = rotation.x;
	gltf.scene.rotation.y = rotation.y;
	gltf.scene.rotation.z = rotation.z;
	
	worldOctree.fromGraphNode(gltf.scene);
	gltf.scene.traverse((child) => {
		if (child.isMesh) {
			child.castShadow = true;
			child.receiveShadow = true;

			if (child.material.map) {
				child.material.map.anisotropy = 8;
			}
			child.name = "300_" + child.name;
		}
	});
	gltf.scene.name = "300_" + gltf.scene.name;
	return;
}


function unloadLevel(scene){
	// Iterate through the scene and remove occurances that we have added
	// Directional lights, Fill lights and the scene itself.
	for (var i = scene.children.length - 1; i >= 0; i--) {
		if (isOurs(scene.children[i])) { 
			scene.children.splice(i, 1);
		}
	}
}

/**
 * Check if an object was loaded with the loadLevel function.
 * @param { Object3D } object 	- An Object which we may or may not have added to the scene in our level loading process.
 * @returns { boolean } 		- True if we added this object else false 
 */
function isOurs(object){
	return object.name.startsWith("300_") || object.name.startsWith("200_");
}

/**
 * Add a light into a scene and enable the casting of shadows from this point.
 * @param { Scene } scene 		Scene to load it into
 * @param { Integer } colour 	Hexadecimal color of the light - Default is white.
 * @param { Float } intensity 	Numeric value of the light's strength/intensity - Default is 1.
 * @param { Vector3 } position 	Where to position the light relative to world origin.
 */
function addDirectionalLight(scene, colour , intensity = 1, position){
	const directional_light = new THREE.DirectionalLight(colour, intensity);
	directional_light.position.copy(position);
	directional_light.castShadow = true;
	directional_light.shadow.camera.near = 0.01;
	directional_light.shadow.camera.far = 500;
	directional_light.shadow.camera.right = 50;
	directional_light.shadow.camera.left = -50;
	directional_light.shadow.camera.top = 50;
	directional_light.shadow.camera.bottom = -50;
	directional_light.shadow.mapSize.width = 512;
	directional_light.shadow.mapSize.height = 512;
	directional_light.shadow.radius = 2;
	directional_light.shadow.bias = 0;
	directional_light.shadow.normalBias = 0;
	directional_light.name = "300_directional_light";
	scene.add(directional_light);
}




function addGLSLFeatures(scene){
	const GLSL_material 	= new THREE.ShaderMaterial({wireframe: false,
		uniforms: shader_uniform,
		vertexShader: `
		uniform float u_time;
		uniform vec4 ambient_product , diffuse_product , specular_product;
		attribute vec4 vPosition;
		attribute vec4 vNormal;
	
		varying vec4 fColour;
	
		uniform vec4 light_position;
		uniform float shininess;
	
	
		void main(){
			vec3 eye_coordinate_pos = (mat3(modelViewMatrix) * position);
			vec3 distance_light_object;
	
			distance_light_object = normalize( (light_position).xyz - eye_coordinate_pos );
	
			vec3 pos_to_camera_vector = -normalize( eye_coordinate_pos );
	
			vec3 halfway_vector = normalize( distance_light_object + pos_to_camera_vector );
	
	
			vec4 test = vec4(distance_light_object,1.0f);
			
			vec3 eye_coordinate_normals = normalize(normalMatrix * normal);;
	
			vec4 ambient = ambient_product;
			vec4  diffuse = max( dot(light_position.xyz, normal), 0.0 )* diffuse_product;
			vec4  specular = pow( max(dot(normal, pos_to_camera_vector), 0.0), shininess ) * specular_product;
	
	
			if( dot(light_position.xyz, normal) < 0.0 ) {
				specular = vec4(0.0, 0.0, 0.0, 1.0);
			}
	
			fColour = ambient + diffuse + specular;
	
			fColour.a = 1.0;
	
	
			vec4 positional = vec4(position.x, position.y, position.z, 1.0);
			gl_Position = projectionMatrix
			  * modelViewMatrix
			  * positional;
	
		}
		`,
		fragmentShader: `
		varying vec4 fColour;
		void main() {
			gl_FragColor = fColour;
		}
		`  } );
	
	const GLSL_flag_material 	= new THREE.ShaderMaterial({wireframe: false,
			uniforms: shader_uniform,
			vertexShader: `
			uniform float u_time;
			varying vec3 v_pos;
			uniform vec4 ambient_product , diffuse_product , specular_product, light_position;
			varying vec4 fColor ;
	
	
			void main(){
				v_pos = position;
	
	
				float main_wave = (sin((position.x * 4.0f)+ (u_time * 4.0f))) / 2.0f;
				float smaller_wave = (sin((position.x * 2.0f)+ (u_time * 1.0f))) / 2.0f;
				float vertical_wave = (sin((position.y * 4.0f)+ (u_time * 10.0f))) / 10.0f;
	
				float normal_main_wave = (cos((position.x * 4.0f)+ (u_time * 4.0f))) / 2.0f;
				float normal_smaller_wave = (cos((position.x * 2.0f)+ (u_time * 1.0f))) / 2.0f;
				float normal_vertical_wave = (cos((position.y * 4.0f)+ (u_time * 10.0f))) / 10.0f;
	
				vec3 normal_u = vec3(normal.x , normal.y, normal.z- (position.x + 1.5f) * ((normal_main_wave + normal_smaller_wave + normal_vertical_wave) / 4.0));
	
	
				vec3 normal_updated = vec3((normal.x) + ((position.x + 1.5f) * (normal_main_wave + normal_smaller_wave ) / 4.0), normal.y, normal.z + ((position.x + 1.5f) * (vertical_wave) / 4.0));
				vec4 positional = vec4((position.x), position.y, position.z + ((position.x + 1.5f) * (main_wave + smaller_wave + vertical_wave) / 4.0), 1.0);
				
				gl_Position = projectionMatrix
				  * modelViewMatrix
				  * positional;
				 
	
	
	 
				vec4 ambient = ambient_product;
				vec4 diffuse = max(dot(light_position.xyz, normal_u), 0.0 ) * vec4(1,1,1,1);
				fColor = vec4(ambient + diffuse);
				fColor.a = 1.0f;
	
			}
			`,
			fragmentShader: `
			varying vec3 v_pos;
			uniform vec4 ambient_product , diffuse_product , specular_product ;
			varying vec4 fColor ;
	
	
			void main() {
				if(v_pos.y >=  (1.0 - (2.0/3.0))){
					gl_FragColor = vec4(0.0, 0.44705882352, 0.80784313725, 1.0);
				}else if(v_pos.y >=  (1.0 - (4.0/3.0))){
					gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
				}else{
					gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
				}
	
				gl_FragColor *= fColor;
			}
			`  } );	
	
	// Add box
	const box		= new THREE.BoxBufferGeometry(2, 2, 2, 8, 8, 8)
	const GLSL_mesh 		= new THREE.Mesh(box, GLSL_material);
	GLSL_mesh.position.y = 2;
	GLSL_mesh.position.x = 4;
	GLSL_mesh.position.z = 6;
	
	
	const ball = new  THREE.SphereBufferGeometry(2,64,64);
	const GLSL_ball 		= new THREE.Mesh(ball, GLSL_material);
	GLSL_ball.position.y = 2;
	GLSL_ball.position.x = -4;
	GLSL_ball.position.z = 6;
	
	// Add flag
	const flag		= new THREE.BoxBufferGeometry(3, 2, 0.2, 30, 30, 1)
	const GLSL_flag_mesh 		= new THREE.Mesh(flag, GLSL_flag_material);
	
	GLSL_flag_mesh.position.set(-2,3,-2);



	GLSL_mesh.name = "300_GLSL";
	GLSL_ball.name = "300_GLSL";
	GLSL_flag_mesh.name = "300_GLSL";

	scene.add( GLSL_mesh );
	scene.add( GLSL_ball );
	scene.add( GLSL_flag_mesh );
}


export { loadLevelOne, loadLevelTwo, loadTutorial };