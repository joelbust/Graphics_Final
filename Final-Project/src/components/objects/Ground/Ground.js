import { Group, Mesh, PlaneGeometry, MeshStandardMaterial, Color } from 'three';

class Ground extends Group {
    constructor() {
        super();

        this.name = 'ground';

        // Base plane
        const planeGeometry = new PlaneGeometry(1000, 1000);
        const planeMaterial = new MeshStandardMaterial({ color: new Color(0x3d6e3d), roughness: 0.95, metalness: 0.02 });
        const plane = new Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        plane.position.y = -0.05;

        this.add(plane);
    }
}

export default Ground;
