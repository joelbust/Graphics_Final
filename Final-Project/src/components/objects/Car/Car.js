import { Group, BoxGeometry, MeshStandardMaterial, Mesh, CylinderGeometry, CircleGeometry, MeshBasicMaterial, Vector3, SpotLight } from 'three';

class Car extends Group {
    constructor(inputState) {
        super();

        this.name = 'car';
        this.inputState = inputState;

        this.state = {
            velocity: 0,
            heading: 0,
            maxSpeed: 30,
            accel: 22,
            brake: 30,
            friction: 8,
            turnRate: 0.8,
            maxTurnRate: 2.6,
            turnRamp: 0.9,
            minSpeedForTurn: 2,
            speedMultiplier: 1,
            steerHold: 0,
        };

        this.autoDrive = true;

        // Body pieces
        const bodyMaterial = new MeshStandardMaterial({ color: 0xff6347, metalness: 0.18, roughness: 0.52 });
        const accentMaterial = new MeshStandardMaterial({ color: 0x1a1c1f, metalness: 0.5, roughness: 0.38 });
        const trimMaterial = new MeshStandardMaterial({ color: 0xd7d9de, metalness: 0.6, roughness: 0.35 });

        const chassis = new Mesh(new BoxGeometry(1.9, 0.5, 3.2), bodyMaterial);
        chassis.castShadow = true;
        chassis.receiveShadow = true;
        chassis.position.y = 0.55;

        const cabin = new Mesh(new BoxGeometry(1.4, 0.6, 1.4), new MeshStandardMaterial({ color: 0xf4f5f7, metalness: 0.05, roughness: 0.2 }));
        cabin.castShadow = true;
        cabin.receiveShadow = true;
        cabin.position.set(0, 0.95, -0.15);
        cabin.scale.set(0.92, 1, 0.95); // slight taper for roofline

        const hood = new Mesh(new BoxGeometry(1.6, 0.25, 1.2), bodyMaterial);
        hood.castShadow = true;
        hood.receiveShadow = true;
        hood.position.set(0, 0.78, -0.95);

        const spoiler = new Mesh(new BoxGeometry(1.2, 0.08, 0.6), accentMaterial);
        spoiler.castShadow = true;
        spoiler.receiveShadow = true;
        spoiler.position.set(0, 0.9, 1.5);

        // Mirrors
        const mirrorGeo = new BoxGeometry(0.15, 0.08, 0.3);
        const mirrorL = new Mesh(mirrorGeo, trimMaterial);
        mirrorL.position.set(-0.95, 0.8, -0.6);
        mirrorL.castShadow = true;
        mirrorL.receiveShadow = true;
        const mirrorR = mirrorL.clone();
        mirrorR.position.x = 0.95;

        // Front grille + bumper trim
        const grilleGeo = new BoxGeometry(1.2, 0.2, 0.06);
        const grille = new Mesh(grilleGeo, accentMaterial);
        grille.position.set(0, 0.55, -1.7);
        grille.castShadow = true;
        grille.receiveShadow = true;

        const bumperGeo = new BoxGeometry(1.4, 0.12, 0.08);
        const frontBumper = new Mesh(bumperGeo, trimMaterial);
        frontBumper.position.set(0, 0.4, -1.72);
        const rearBumper = frontBumper.clone();
        rearBumper.position.z = 1.72;
        [frontBumper, rearBumper].forEach((b) => {
            b.castShadow = true;
            b.receiveShadow = true;
        });

        // Lights
        const headLightMaterial = new MeshStandardMaterial({ color: 0xfff6d5, emissive: 0xfff6d5, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.05 });
        const tailLightMaterial = new MeshStandardMaterial({ color: 0xff3b2e, emissive: 0xff3b2e, emissiveIntensity: 1.0, roughness: 0.5, metalness: 0.05 });
        const headLight = new BoxGeometry(0.3, 0.15, 0.1);
        const tailLight = new BoxGeometry(0.28, 0.15, 0.08);

        const headlights = [-0.45, 0.45].map((x) => {
            const light = new Mesh(headLight, headLightMaterial);
            light.position.set(x, 0.73, -1.65);
            return light;
        });
        const taillights = [-0.42, 0.42].map((x) => {
            const light = new Mesh(tailLight, tailLightMaterial);
            light.position.set(x, 0.65, 1.6);
            return light;
        });

        // Wheels with steering pivots
        const wheelGeometry = new CylinderGeometry(0.42, 0.42, 0.28, 24);
        wheelGeometry.rotateZ(Math.PI / 2);
        const rimGeometry = new CylinderGeometry(0.26, 0.26, 0.12, 16);
        rimGeometry.rotateZ(Math.PI / 2);
        const spokeGeometry = new BoxGeometry(0.05, 0.05, 0.24);
        const tireBandGeometry = new CylinderGeometry(0.41, 0.41, 0.012, 24);
        tireBandGeometry.rotateZ(Math.PI / 2);
        const wheelMaterial = new MeshStandardMaterial({ color: 0x0f0f10, metalness: 0.35, roughness: 0.9 });
        const rimMaterial = new MeshStandardMaterial({ color: 0xc0c5ce, metalness: 0.8, roughness: 0.25 });
        const spokeMaterial = new MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.6, roughness: 0.35 });

        const frontPivotPositions = [
            [-0.9, 0.3, -1.2],
            [0.9, 0.3, -1.2],
        ];
        const rearPositions = [
            [-0.9, 0.3, 1.2],
            [0.9, 0.3, 1.2],
        ];

        this.wheels = [];
        this.frontWheelPivots = [];
        this.wheelRadius = 0.42;
        this.wheelSpin = 0;
        this.dustPuffs = [];
        this.dustTimer = 0;
        this.headLights = this.createHeadLights();

        frontPivotPositions.forEach(([x, y, z]) => {
            const pivot = new Group();
            pivot.position.set(x, y, z);
        const assembly = this.createWheelAssembly(
            wheelGeometry,
            rimGeometry,
            spokeGeometry,
            wheelMaterial,
            rimMaterial,
            spokeMaterial,
            tireBandGeometry
        );
            pivot.add(assembly);
            this.frontWheelPivots.push(pivot);
            this.wheels.push(assembly);
            this.add(pivot);
        });

        rearPositions.forEach(([x, y, z]) => {
            const wheelGroup = new Group();
            wheelGroup.position.set(x, y, z);
            const assembly = this.createWheelAssembly(
                wheelGeometry,
                rimGeometry,
                spokeGeometry,
                wheelMaterial,
                rimMaterial,
                spokeMaterial,
                tireBandGeometry
            );
            wheelGroup.add(assembly);
            this.wheels.push(assembly);
            this.add(wheelGroup);
        });

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
            ...headlights,
            ...taillights,
            ...this.headLights
        );
    }

    createHeadLights() {
        const lights = [];
        const positions = [
            [-0.45, 0.7, -1.65],
            [0.45, 0.7, -1.65],
        ];
        positions.forEach(([x, y, z]) => {
            const l = new SpotLight(0xfff6d5, 0, 16, Math.PI / 6, 0.35, 1);
            l.position.set(x, y, z);
            l.target.position.set(x, y - 0.1, z - 3.5);
            l.castShadow = false;
            lights.push(l);
            this.add(l.target);
        });
        return lights;
    }

    setHeadLights(on) {
        const intensity = on ? 3 : 0;
        this.headLights.forEach((l) => {
            l.intensity = intensity;
        });
    }

    setSpeedMultiplier(multiplier) {
        this.state.speedMultiplier = multiplier;
    }

    update(delta) {
        const { accel, brake, friction, maxSpeed, turnRate, minSpeedForTurn, speedMultiplier } = this.state;
        const { forward, backward, left, right } = this.inputState;
        const forwardActive = this.autoDrive || forward;
        const brakeActive = backward;

        // Update velocity
        if (forwardActive) {
            this.state.velocity += accel * speedMultiplier * delta;
        } else if (brakeActive) {
            this.state.velocity -= brake * speedMultiplier * delta;
        } else {
            // Passive friction
            const frictionForce = friction * delta * Math.sign(this.state.velocity);
            if (Math.abs(frictionForce) > Math.abs(this.state.velocity)) {
                this.state.velocity = 0;
            } else {
                this.state.velocity -= frictionForce;
            }
        }

        // Clamp speed
        const maxSpeedScaled = maxSpeed * speedMultiplier;
        this.state.velocity = Math.max(-maxSpeedScaled * 0.4, Math.min(maxSpeedScaled, this.state.velocity));

        // Turning scales with speed and ramps up the longer you hold the button
        const speedFactor = Math.min(1, Math.abs(this.state.velocity) / maxSpeed);
        const steerDir = (this.inputState.left ? 1 : 0) - (this.inputState.right ? 1 : 0);
        if (steerDir !== 0) {
            this.state.steerHold += delta;
        } else {
            this.state.steerHold = 0;
        }
        const rampedTurn = Math.min(this.state.maxTurnRate, turnRate + this.state.turnRamp * this.state.steerHold);

        if (speedFactor > minSpeedForTurn / maxSpeed && steerDir !== 0) {
            this.state.heading += steerDir * rampedTurn * delta * speedFactor * Math.sign(this.state.velocity || 1);
        }
        const steerVisual = steerDir * Math.min(0.5, 0.12 + this.state.steerHold * 0.16) * speedFactor;
        this.frontWheelPivots.forEach((pivot) => {
            pivot.rotation.y = steerVisual;
        });

        // Integrate position
        this.rotation.y = this.state.heading;
        const forwardDir = -Math.sin(this.state.heading);
        const rightDir = -Math.cos(this.state.heading);

        this.position.x += forwardDir * this.state.velocity * delta;
        this.position.z += rightDir * this.state.velocity * delta;

        // Keep car within lane boundaries
        const laneHalfWidth = 9;
        this.position.x = Math.max(-laneHalfWidth, Math.min(laneHalfWidth, this.position.x));

        // Spin wheels based on travel distance
        const travel = this.state.velocity * delta;
        this.wheelSpin += travel / this.wheelRadius;
        this.wheels.forEach((wheel) => {
            wheel.rotation.x = -this.wheelSpin;
        });

        this.updateDust(delta);
    }

    spawnDustPuff() {
        if (!this.parent) return;
        const geo = new CircleGeometry(0.08, 8);
        const mat = new MeshBasicMaterial({ color: 0x2f2f2f, transparent: true, opacity: 0.2, depthWrite: false });
        const puff = new Mesh(geo, mat);
        puff.rotation.x = -Math.PI / 2;

        // Spawn behind rear wheels
        const offset = new Vector3(0, 0.05, 1.3);
        const side = Math.random() < 0.5 ? -0.9 : 0.9;
        offset.x = side;
        const worldPos = offset.clone().applyMatrix4(this.matrixWorld);
        puff.position.copy(worldPos);
        // Give the puff a random outward velocity with some upward lift
        const theta = Math.random() * Math.PI * 2;
        const radial = 0.8 + Math.random() * 0.7;
        const vx = Math.cos(theta) * radial;
        const vz = Math.sin(theta) * radial;
        const vy = 0.9 + Math.random() * 0.7;
        puff.userData.velocity = new Vector3(vx, vy, vz);

        this.parent.add(puff);
        this.dustPuffs.push({ mesh: puff, life: 0.25 });
    }

    updateDust(delta) {
        // Spawn based on speed
        const speed = Math.abs(this.state.velocity);
        this.dustTimer -= delta;
        if (speed > 3 && this.dustTimer <= 0) {
            const maxSpeed = this.state.maxSpeed || 30;
            const norm = Math.min(1, speed / maxSpeed);
            const spawnCount = Math.min(8, Math.max(1, Math.floor(1 + norm * 5)));
            for (let i = 0; i < spawnCount; i += 1) {
                this.spawnDustPuff();
            }
            // Faster speed = faster spawn cadence
            const rate = Math.max(0.05, 0.14 - norm * 0.07);
            this.dustTimer = rate;
        }

        // Fade and shrink existing puffs
        for (let i = this.dustPuffs.length - 1; i >= 0; i -= 1) {
            const puff = this.dustPuffs[i];
            puff.life -= delta;
            if (puff.life <= 0 || !puff.mesh.parent) {
                if (puff.mesh.parent) puff.mesh.parent.remove(puff.mesh);
                this.dustPuffs.splice(i, 1);
                continue;
            }
            const t = puff.life / 0.25;
            const maxSpeed = this.state.maxSpeed || 30;
            const norm = Math.min(1, speed / maxSpeed);
            const maxScale = 0.5 + norm * 0.8;
            puff.mesh.material.opacity = 0.2 * t;
            puff.mesh.scale.setScalar(maxScale * (0.5 + (1 - t) * 0.5));
            if (puff.mesh.userData.velocity) {
                puff.mesh.position.addScaledVector(puff.mesh.userData.velocity, delta);
                // add a bit of drag
                puff.mesh.userData.velocity.multiplyScalar(0.94);
                // gravity-lite
                puff.mesh.userData.velocity.y -= 0.6 * delta;
            }
        }
    }

    createWheelAssembly(wheelGeometry, rimGeometry, spokeGeometry, wheelMaterial, rimMaterial, spokeMaterial, tireBandGeometry) {
        const assembly = new Group();
        const tire = new Mesh(wheelGeometry, wheelMaterial);
        const rim = new Mesh(rimGeometry, rimMaterial);
        tire.castShadow = true;
        tire.receiveShadow = true;
        rim.castShadow = true;
        rim.receiveShadow = true;
        assembly.add(tire, rim);

        // Subtle tire bands to show rotation
        const bandMat = new MeshStandardMaterial({ color: 0x1f1f22, metalness: 0.2, roughness: 0.65 });
        const bandPositions = [-0.12, -0.04, 0.04, 0.12];
        bandPositions.forEach((x) => {
            const band = new Mesh(tireBandGeometry, bandMat);
            band.position.x = x;
            assembly.add(band);
        });

        const spokeCount = 6;
        for (let i = 0; i < spokeCount; i += 1) {
            const spoke = new Mesh(spokeGeometry, spokeMaterial);
            const angle = (i / spokeCount) * Math.PI * 2;
            const radius = 0.18;
            spoke.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
            spoke.rotation.z = angle;
            assembly.add(spoke);
        }
        return assembly;
    }
}

export default Car;
