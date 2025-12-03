import { Group, Mesh, BoxGeometry, CylinderGeometry, MeshStandardMaterial } from 'three';

class TrafficCar extends Group {
    constructor(options = {}) {
        super();

        const {
            width = 1.8,
            height = 1,
            length = 3.2,
            color = 0x4477aa,
            accent = 0xf4f5f7,
            speed = 8,
            direction = 1, // +1 to the right, -1 to the left along X
        } = options;

        this.name = 'traffic-car';
        this.dimensions = { width, depth: length };
        this.speed = speed;
        this.direction = direction;
        // Orient the car to face along its travel direction (model faces +Z by default)
        this.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;

        const bodyMat = new MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1 });
        const glassMat = new MeshStandardMaterial({ color: accent, roughness: 0.2, metalness: 0.05 });
        const wheelMat = new MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0.1 });
        const rimMat = new MeshStandardMaterial({ color: 0xc0c5ce, roughness: 0.25, metalness: 0.85 });

        const chassisHeight = height * 0.42;
        const chassis = new Mesh(new BoxGeometry(width, chassisHeight, length), bodyMat);
        chassis.castShadow = true;
        chassis.receiveShadow = true;
        chassis.position.y = chassisHeight * 0.5 + 0.22;

        const cabinHeight = height * 0.4;
        const cabin = new Mesh(new BoxGeometry(width * 0.9, cabinHeight, length * 0.5), glassMat);
        cabin.castShadow = true;
        cabin.receiveShadow = true;
        cabin.position.set(0, chassisHeight + cabinHeight * 0.5 + 0.05, -length * 0.05);

        const wheelGeo = new CylinderGeometry(0.34, 0.34, 0.25, 20);
        wheelGeo.rotateZ(Math.PI / 2);
        const rimGeo = new CylinderGeometry(0.24, 0.24, 0.12, 16);
        rimGeo.rotateZ(Math.PI / 2);
        const wheelPositions = [
            [-(width / 2 + 0.02), 0.36, length / 2 - 0.52],
            [width / 2 + 0.02, 0.36, length / 2 - 0.52],
            [-(width / 2 + 0.02), 0.36, -length / 2 + 0.52],
            [width / 2 + 0.02, 0.36, -length / 2 + 0.52],
        ];
        this.wheelGroups = wheelPositions.map(([x, y, z]) => {
            const group = new Group();
            group.position.set(x, y, z);
            const tire = new Mesh(wheelGeo, wheelMat);
            const rim = new Mesh(rimGeo, rimMat);
            tire.castShadow = true;
            tire.receiveShadow = true;
            rim.castShadow = true;
            rim.receiveShadow = true;
            group.add(tire, rim);
            return group;
        });

        const lightGeo = new BoxGeometry(0.2, 0.12, 0.08);
        const headMat = new MeshStandardMaterial({ color: 0xfff3d0, emissive: 0xfff3d0, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.05 });
        const tailMat = new MeshStandardMaterial({ color: 0xff3b2e, emissive: 0xff3b2e, emissiveIntensity: 1.0, roughness: 0.5, metalness: 0.05 });
        const headlights = [-0.4, 0.4].map((x) => {
            const l = new Mesh(lightGeo, headMat);
            l.position.set(x, height * 0.55, length / 2 - 0.15);
            return l;
        });
        const taillights = [-0.38, 0.38].map((x) => {
            const l = new Mesh(lightGeo, tailMat);
            l.position.set(x, height * 0.5, -length / 2 + 0.12);
            return l;
        });

        this.add(chassis, cabin, ...this.wheelGroups, ...headlights, ...taillights);
        this.wheelRadius = 0.34;
        this.wheelSpin = 0;
    }

    update(delta) {
        this.position.x += this.direction * this.speed * delta;
        const travel = Math.abs(this.speed * delta);
        this.wheelSpin += travel / this.wheelRadius;
        this.wheelGroups.forEach((wg) => {
            wg.rotation.x = this.wheelSpin * (this.direction > 0 ? 1 : -1);
        });
    }
}

export default TrafficCar;
