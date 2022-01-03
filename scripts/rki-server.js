// Simulation of RKI-Server

var infectedIDs = ["bbbb-bbbb"];

function checkIDs(ids) {
	var foundInfected = [];
	
	for (const id of ids) {
		if (infectedIDs.includes(id)) {
			foundInfected.push(id);
		}
	}

	return foundInfected;
}