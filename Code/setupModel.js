/**
 * Load a model given a JSON representation and the name of the model.
 * 
 * @param data - JSON representation of the Model loaded in gltf
 * @param name - String of the model's name
 * 
 * @return The model from the JSON.
 */
function setupModel(data, name) {
	for (let i = 0; i < data.scene.children.length; i++) {
		if(data.scene.children[i].name == name){
			return data.scene.children[i];
		}
	}

  
	return data.scene.children[0];
}

export { setupModel };