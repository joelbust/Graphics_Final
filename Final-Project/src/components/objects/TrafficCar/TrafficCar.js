import { Group, Mesh, BoxGeometry, CylinderGeometry, MeshStandardMaterial, SpotLight } from 'three';

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
        this.rotation.y = direction > 0 ? -Math.PI / 2 : Math.PI / 2;

        const palettes = [
            { body: 0xff6347, accent: 0x1a1c1f, trim: 0xd7d9de },
            { body: 0x4a8bd7, accent: 0x0f1724, trim: 0xbfc3cc },
            { body: 0x7bd38a, accent: 0x1a221b, trim: 0xd7e3d9 },
            { body: 0xf0c94b, accent: 0x2a1f14, trim: 0xf6e8b5 },
        ];
        const palette = palettes[Math.floor(Math.random() * palettes.length)];
        const bodyMat = new MeshStandardMaterial({ color: palette.body, roughness: 0.52, metalness: 0.18 });
        const accentMat = new MeshStandardMaterial({ color: palette.accent, roughness: 0.4, metalness: 0.38 });
        const trimMat = new MeshStandardMaterial({ color: palette.trim, roughness: 0.35, metalness: 0.6 });
        const glassMat = new MeshStandardMaterial({ color: accent, roughness: 0.2, metalness: 0.05 });
        const wheelMat = new MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0.1 });
        const rimMat = new MeshStandardMaterial({ color: 0xc0c5ce, roughness: 0.25, metalness: 0.85 });

        const chassisHeight = height * 0.42;
        const chassis = new Mesh(new BoxGeometry(1.9, 0.5, 3.2), bodyMat);
        chassis.castShadow = true;
        chassis.receiveShadow = true;
        chassis.position.y = 0.55;

        const cabin = new Mesh(new BoxGeometry(1.4, 0.6, 1.4), new MeshStandardMaterial({ color: 0xf4f5f7, metalness: 0.05, roughness: 0.2 }));
        cabin.castShadow = true;
        cabin.receiveShadow = true;
        cabin.position.set(0, 0.95, -0.15);
        cabin.scale.set(0.92, 1, 0.95);

        const hood = new Mesh(new BoxGeometry(1.6, 0.25, 1.2), bodyMat);
        hood.castShadow = true;
        hood.receiveShadow = true;
        hood.position.set(0, 0.78, -0.95);

        const spoiler = new Mesh(new BoxGeometry(1.2, 0.08, 0.6), accentMat);
        spoiler.castShadow = true;
        spoiler.receiveShadow = true;
        spoiler.position.set(0, 0.9, 1.5);

        const mirrorGeo = new BoxGeometry(0.15, 0.08, 0.3);
        const mirrorL = new Mesh(mirrorGeo, trimMat);
        mirrorL.position.set(-0.95, 0.8, -0.6);
        mirrorL.castShadow = true;
        mirrorL.receiveShadow = true;
        const mirrorR = mirrorL.clone();
        mirrorR.position.x = 0.95;

        const grilleGeo = new BoxGeometry(1.2, 0.2, 0.06);
        const grille = new Mesh(grilleGeo, accentMat);
        grille.position.set(0, 0.55, -1.7);
        grille.castShadow = true;
        grille.receiveShadow = true;

        const bumperGeo = new BoxGeometry(1.4, 0.12, 0.08);
        const frontBumper = new Mesh(bumperGeo, trimMat);
        frontBumper.position.set(0, 0.4, -1.72);
        const rearBumper = frontBumper.clone();
        rearBumper.position.z = 1.72;
        [frontBumper, rearBumper].forEach((b) => {
            b.castShadow = true;
            b.receiveShadow = true;
        });

        const wheelGeo = new CylinderGeometry(0.34, 0.34, 0.25, 20);
        wheelGeo.rotateZ(Math.PI / 2);
        const rimGeo = new CylinderGeometry(0.24, 0.24, 0.12, 16);
        rimGeo.rotateZ(Math.PI / 2);
        const spokeGeo = new BoxGeometry(0.045, 0.045, 0.22);
        const bandGeo = new CylinderGeometry(0.33, 0.33, 0.012, 18);
        bandGeo.rotateZ(Math.PI / 2);
        const rimBandGeo = new CylinderGeometry(0.24, 0.24, 0.012, 18);
        rimBandGeo.rotateZ(Math.PI / 2);
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
            const rimBand = new Mesh(rimBandGeo, rimMat);
            tire.castShadow = true;
            tire.receiveShadow = true;
            rim.castShadow = true;
            rim.receiveShadow = true;
            rimBand.castShadow = true;
            rimBand.receiveShadow = true;
            group.add(tire, rim, rimBand);
            const bandMat = new MeshStandardMaterial({ color: 0x1f1f22, metalness: 0.2, roughness: 0.65 });
            const bandPositions = [-0.11, -0.04, 0.04, 0.11];
            bandPositions.forEach((x) => {
                const band = new Mesh(bandGeo, bandMat);
                band.position.x = x;
                group.add(band);
            });
            const spokeCount = 5;
            for (let i = 0; i < spokeCount; i += 1) {
                const spoke = new Mesh(spokeGeo, rimMat);
                const angle = (i / spokeCount) * Math.PI * 2;
                const radius = 0.16;
                spoke.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
                spoke.rotation.z = angle;
                group.add(spoke);
            }
            return group;
        });

        const lightGeo = new BoxGeometry(0.2, 0.12, 0.08);
        const headMat = new MeshStandardMaterial({ color: 0xfff3d0, emissive: 0xfff3d0, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.05 });
        const tailMat = new MeshStandardMaterial({ color: 0xff3b2e, emissive: 0xff3b2e, emissiveIntensity: 1.0, roughness: 0.5, metalness: 0.05 });
        const headlights = [-0.4, 0.4].map((x) => {
            const l = new Mesh(lightGeo, headMat);
            l.position.set(x, height * 0.55, -length / 2 + 0.15);
            return l;
        });
        const taillights = [-0.38, 0.38].map((x) => {
            const l = new Mesh(lightGeo, tailMat);
            l.position.set(x, height * 0.5, length / 2 - 0.12);
            return l;
        });

        this.headLights = this.createHeadLights();
        this.add(
            chassis,
            cabin,
            hood,
            spoiler,
            mirrorL,
            mirrorR,
            grille,
            frontBumper,
            rearBumper,
            ...this.wheelGroups,
            ...headlights,
            ...taillights,
            ...this.headLights
        );
        this.wheelRadius = 0.34;
        this.wheelSpin = 0;
    }

    update(delta) {
        this.position.x += this.direction * this.speed * delta;
        const travel = Math.abs(this.speed * delta);
        this.wheelSpin += travel / this.wheelRadius;
        this.wheelGroups.forEach((wg) => {
            wg.rotation.x = this.wheelSpin * 1.4 * (this.direction > 0 ? 1 : -1);
        });
    }

    createHeadLights() {
        const lights = [];
        const positions = [
            [-0.4, 0.55, -1.6],
            [0.4, 0.55, -1.6],
        ];
        positions.forEach(([x, y, z]) => {
            const l = new SpotLight(0xfff3d0, 0, 16, Math.PI / 8, 0.35, 1.2);
            l.position.set(x, y, z);
            l.target.position.set(x, y - 0.05, z - 4);
            l.castShadow = false;
            lights.push(l);
            this.add(l.target);
        });
        return lights;
    }

    setHeadLights(on) {
        const intensity = on ? 1.8 : 0;
        this.headLights.forEach((l) => {
            l.intensity = intensity;
        });
    }
}

export default TrafficCar;
