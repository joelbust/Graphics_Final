import { Group, BoxGeometry, MeshStandardMaterial, Mesh, Color } from 'three';

class Obstacle extends Group {
    constructor(options = {}) {
        super();

        const {
            width = 1.6,
            height = 1.2,
            depth = 1.6,
            color = 0x7c6a55,
        } = options;

        this.name = 'obstacle';

        const baseGeometry = new BoxGeometry(width, height * 0.7, depth);
        const topGeometry = new BoxGeometry(width * 0.9, height * 0.35, depth * 0.9);
        const baseMaterial = new MeshStandardMaterial({
            color: new Color(color),
            roughness: 0.85,
            metalness: 0.08,
        });
        const topMaterial = new MeshStandardMaterial({
            color: new Color(0x69625b),
            roughness: 0.7,
            metalness: 0.12,
        });

        const base = new Mesh(baseGeometry, baseMaterial);
        base.castShadow = true;
        base.receiveShadow = true;
        base.position.y = height * 0.35;

        const top = new Mesh(topGeometry, topMaterial);
        top.castShadow = true;
        top.receiveShadow = true;
        top.position.y = height * 0.85;

        this.dimensions = { width, depth };

        this.add(base, top);
    }
}

export default Obstacle;
