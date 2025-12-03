import { Group, Mesh, CylinderGeometry, ConeGeometry, MeshStandardMaterial, Color } from 'three';

class Tree extends Group {
    constructor(options = {}) {
        super();

        const {
            trunkHeight = 1.6,
            trunkRadius = 0.18,
            foliageHeight = 2.2,
            foliageRadius = 0.95,
        } = options;

        this.name = 'tree';

        const trunkMaterial = new MeshStandardMaterial({ color: new Color(0x5b3b1f), roughness: 0.9 });
        const foliageMaterial = new MeshStandardMaterial({ color: new Color(0x3a8f5a), roughness: 0.6 });

        const trunkGeometry = new CylinderGeometry(trunkRadius, trunkRadius * 1.1, trunkHeight, 8);
        const foliageGeometry = new ConeGeometry(foliageRadius, foliageHeight, 8, 1);

        const trunk = new Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        trunk.position.y = trunkHeight / 2;

        const foliage = new Mesh(foliageGeometry, foliageMaterial);
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        foliage.position.y = trunkHeight + foliageHeight / 2 - 0.1;

        this.add(trunk, foliage);
    }
}

export default Tree;
