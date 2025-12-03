import { Group, CylinderGeometry, MeshStandardMaterial, Mesh, Color } from 'three';

class Cone extends Group {
    constructor(options = {}) {
        super();

        const {
            radius = 0.35,
            height = 0.8,
            stripeHeight = 0.12,
        } = options;

        this.name = 'cone';
        this.dimensions = { width: radius * 2, depth: radius * 2 };

        const bodyGeometry = new CylinderGeometry(0.08, radius, height, 14);
        const bodyMaterial = new MeshStandardMaterial({ color: new Color(0xff6a1a), roughness: 0.45, metalness: 0.05 });
        const body = new Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        body.position.y = height / 2;

        const stripeGeometry = new CylinderGeometry(radius * 0.95, radius * 0.95, stripeHeight, 14);
        const stripeMaterial = new MeshStandardMaterial({ color: new Color(0xf4f5f7), roughness: 0.28, metalness: 0.08 });
        const stripe = new Mesh(stripeGeometry, stripeMaterial);
        stripe.castShadow = true;
        stripe.receiveShadow = true;
        stripe.position.y = stripeHeight / 2 + height * 0.35;

        const baseGeometry = new CylinderGeometry(radius * 1.05, radius * 1.05, 0.1, 14);
        const baseMaterial = new MeshStandardMaterial({ color: new Color(0x333333), roughness: 0.8, metalness: 0.1 });
        const base = new Mesh(baseGeometry, baseMaterial);
        base.castShadow = true;
        base.receiveShadow = true;
        base.position.y = 0.05;

        this.add(base, body, stripe);
    }
}

export default Cone;
