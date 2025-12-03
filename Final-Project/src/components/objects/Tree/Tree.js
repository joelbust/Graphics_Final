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

        const trunkMaterial = new MeshStandardMaterial({ color: new Color(0x5a412b), roughness: 0.85, metalness: 0.05 });
        const foliageMaterials = [
            new MeshStandardMaterial({ color: new Color(0x3f8b4d), roughness: 0.65 }),
            new MeshStandardMaterial({ color: new Color(0x347a45), roughness: 0.65 }),
            new MeshStandardMaterial({ color: new Color(0x2e6b3c), roughness: 0.65 }),
        ];

        const trunkGeometry = new CylinderGeometry(trunkRadius, trunkRadius * 1.15, trunkHeight, 10);
        const trunk = new Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        trunk.position.y = trunkHeight / 2;

        const layerHeights = [foliageHeight * 0.45, foliageHeight * 0.35, foliageHeight * 0.25];
        const layerRadii = [foliageRadius, foliageRadius * 0.8, foliageRadius * 0.6];
        const foliageLayers = layerHeights.map((h, i) => {
            const cone = new Mesh(new ConeGeometry(layerRadii[i], h, 10, 1), foliageMaterials[i]);
            cone.castShadow = true;
            cone.receiveShadow = true;
            const verticalOffset = trunkHeight + h / 2 + i * (h * 0.25);
            cone.position.y = verticalOffset;
            cone.rotation.y = (Math.random() - 0.5) * 0.2;
            cone.scale.setScalar(0.96 + Math.random() * 0.08);
            return cone;
        });

        this.add(trunk, ...foliageLayers);
    }
}

export default Tree;
