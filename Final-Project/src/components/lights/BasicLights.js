import { Group, SpotLight, AmbientLight, HemisphereLight } from 'three';

class BasicLights extends Group {
    constructor(...args) {
        // Invoke parent Group() constructor with our args
        super(...args);

        const dir = new SpotLight(0xfff2e0, 1.4, 12, 0.75, 1, 1);
        dir.castShadow = true;
        dir.shadow.mapSize.set(512, 512);
        dir.shadow.camera.near = 0.5;
        dir.shadow.camera.far = 20;
        dir.shadow.bias = -0.001;

        const ambi = new AmbientLight(0x404040, 1.25);
        const hemi = new HemisphereLight(0xffffbb, 0x080820, 1.9);

        dir.position.set(5, 1, 2);
        dir.target.position.set(0, 0, 0);

        this.add(ambi, hemi, dir);
    }
}

export default BasicLights;
