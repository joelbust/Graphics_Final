import { Scene, Color, Vector3, PlaneGeometry, Mesh, MeshStandardMaterial, FogExp2, SphereGeometry, CircleGeometry, Group, CylinderGeometry } from 'three';
import { createClient } from '@supabase/supabase-js';
import { BasicLights } from 'lights';
import { Car, Ground, Tree, Obstacle, Cone, TrafficCar } from 'objects';

class DrivingScene extends Scene {
    constructor() {
        super();

        // Supabase REST endpoint placeholders (replace with your project values)
        this.SUPA_URL = 'https://cwsrnxaauwshypovpxdb.supabase.co';
        this.SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3c3JueGFhdXdzaHlwb3ZweGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODYwMDIsImV4cCI6MjA4MDM2MjAwMn0.48mSY3EnQx1KlCjuMvhN36fXr-HnxnbLrhrE4WWRQEI';
        this.SUPA_SCORE_ENDPOINT = `${this.SUPA_URL}/rest/v1/scores`;
        this.SUPA_HEADERS = {
            'Content-Type': 'application/json',
            apikey: this.SUPA_KEY,
            Authorization: `Bearer ${this.SUPA_KEY}`,
        };

        this.state = {
            updateList: [],
            input: {
                forward: false,
                backward: false,
                left: false,
                right: false,
            },
            cameraTarget: new Vector3(),
            lastTime: null,
            segmentLength: 80,
            maxAheadSegments: 3,
            maxBehindSegments: 2,
            segments: new Map(),
            lastSegmentIndex: null,
            lastIntersectionIndex: -100,
            carHalfWidth: 0.9,
            carHalfLength: 1.6,
            distance: 0,
            score: 0,
            runStartTime: null,
            hudEl: null,
            maxSpeedMultiplier: 3,
            roadWidth: 18,
            roadStartOffset: -40,
            intersectionSpacing: 2,
            intersectionChance: 1.0,
            gameState: 'idle', // idle | playing | gameover
            cameraMode: 'menu', // menu | follow
            startOverlay: null,
            gameOverOverlay: null,
            scoreListEl: null,
            playerName: 'Guest',
            mode: 'night',
            modeButtons: {
                day: [],
                night: [],
            },
            accumulator: 0,
            fixedDelta: 1 / 60,
            warmupUntil: null,
            warmupDuration: 0,
            touchControls: null,
            chat: {
                client: null,
                channel: null,
                container: null,
                list: null,
                input: null,
                status: null,
                messages: [],
            },
        };

        this.background = new Color(0x223247);
        this.fog = new FogExp2(this.background, 0.015);

        this.startPosition = new Vector3(0, 0, -24);

        const ground = new Ground();
        const car = new Car(this.state.input);
        const lights = new BasicLights();
        this.lights = lights;

        car.position.copy(this.startPosition);
        lights.position.set(0, 5, 0);

        this.add(ground, car, lights);
        this.car = car;
        this.ground = ground;

        this.sun = this.createSkyBody(1.6, new Color(0xfff4b8));
        this.moon = this.createSkyBody(1.3, new Color(0xcfd8ff));
        this.sun.position.set(18, 18, -12);
        this.moon.position.set(-16, 15, 10);
        this.add(this.sun, this.moon);

        this.startArea = this.createStartPad();
        this.startArea.position.set(this.startPosition.x, 0, this.startPosition.z);
        this.add(this.startArea);

        this.addToUpdateList(car);
        this.registerInputListeners();
        this.ensureSegments();
        this.initHUD();
        this.initUI();
        this.initTouchControls();
        this.initChatUI();
        this.initChatClient();
        this.showStartOverlay();
        this.applyMode(this.state.mode);
    }

    ensureSegments() {
        const { segmentLength, maxAheadSegments, maxBehindSegments, segments, roadStartOffset } = this.state;
        const currentIndex = Math.max(0, Math.floor((roadStartOffset - this.car.position.z) / segmentLength));

        if (currentIndex === this.state.lastSegmentIndex) {
            return;
        }

        // Spawn forward segments
        for (let i = currentIndex; i <= currentIndex + maxAheadSegments; i += 1) {
            if (!segments.has(i)) {
                const segment = this.spawnSegment(i);
                segments.set(i, segment);
            }
        }

        // Cleanup far-behind segments
        for (const [index, segment] of segments.entries()) {
            if (index < currentIndex - maxBehindSegments) {
                this.cleanupSegment(segment);
                segments.delete(index);
            }
        }

        this.state.lastSegmentIndex = currentIndex;
    }

    createSkyBody(radius, color) {
        const geo = new SphereGeometry(radius, 24, 16);
        const mat = new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5, roughness: 0.3, metalness: 0.0 });
        const mesh = new Mesh(geo, mat);
        mesh.position.y = 10;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        return mesh;
    }

    createStartPad() {
        const group = new Group();
        const radius = 22;
        const padGeo = new CircleGeometry(radius, 64);
        const padMat = new MeshStandardMaterial({ color: new Color(0x1f2733), roughness: 0.75, metalness: 0.08 });
        const pad = new Mesh(padGeo, padMat);
        pad.rotation.x = -Math.PI / 2;
        pad.position.y = 0.02;
        pad.receiveShadow = true;
        group.add(pad);

        // Ring barrier with a gap toward the road entrance (negative Z)
        const barrierCount = 64;
        const gapCenter = -Math.PI / 2; // toward negative Z
        const gapHalf = 0.6;
        const barrierRadius = radius + 0.6;
        const height = 1.0;
        const radiusTop = 0.45;
        const barrierGeo = new CylinderGeometry(radiusTop, radiusTop, height, 16);
        const barrierMat = new MeshStandardMaterial({ color: new Color(0x6b7079), roughness: 0.6, metalness: 0.2 });

        for (let i = 0; i < barrierCount; i += 1) {
            const angle = (i / barrierCount) * Math.PI * 2;
            const diff = Math.atan2(Math.sin(angle - gapCenter), Math.cos(angle - gapCenter));
            if (Math.abs(diff) < gapHalf) continue; // leave entrance gap

            const seg = new Mesh(barrierGeo, barrierMat);
            const x = Math.cos(angle) * barrierRadius;
            const z = Math.sin(angle) * barrierRadius;
            seg.position.set(x, height / 2, z);
            seg.castShadow = true;
            seg.receiveShadow = true;
            group.add(seg);
        }

        return group;
    }

    spawnSegment(index) {
        const { segmentLength, roadWidth, intersectionSpacing, intersectionChance, lastIntersectionIndex, roadStartOffset } = this.state;
        const startZ = roadStartOffset - (index + 1) * segmentLength;
        const endZ = roadStartOffset - index * segmentLength;
        const canIntersect = index > 2 && index - lastIntersectionIndex >= intersectionSpacing;
        const isIntersection = canIntersect && Math.random() < intersectionChance;
        if (isIntersection) {
            this.state.lastIntersectionIndex = index;
        }
        const roadData = this.spawnRoadStrip(startZ, endZ, roadWidth);
        const obstacles = this.spawnObstaclesInRange(startZ, endZ);
        const barriers = this.spawnBarriers(startZ, endZ, roadWidth, isIntersection);
        obstacles.push(...barriers);
        const trees = this.spawnTreesInRange(startZ, endZ);
        const crossData = isIntersection ? this.spawnCrossRoad(startZ, endZ, roadWidth) : null;
        const midZ = (startZ + endZ) / 2;
        return {
            index,
            startZ,
            endZ,
            midZ,
            obstacles,
            barriers,
            trafficCars: [],
            isIntersection,
            trafficActivated: false,
            crossRoad: crossData ? crossData.crossRoad : null,
            crossLines: crossData ? crossData.crossLines : null,
            crossSideLines: crossData ? crossData.crossSideLines : null,
            road: roadData.road,
            lines: roadData.lines,
            sideLines: roadData.sideLines,
            shoulders: roadData.shoulders,
            trees,
        };
    }

    spawnObstaclesInRange(startZ, endZ) {
        const obstacles = [];
        const laneXs = [-6, -2, 2, 6];
        const minZ = startZ + 6;
        const maxZ = endZ - 6;
        const obstacleChance = 0.35;
        const minSeparation = 7;

        // Keep starting area clear
        if (endZ > -25) {
            return obstacles;
        }

        let z = maxZ;
        while (z > minZ) {
            if (Math.random() < obstacleChance) {
                const laneX = laneXs[Math.floor(Math.random() * laneXs.length)] + (Math.random() - 0.5) * 0.6;
                const typeRoll = Math.random();
                let obstacle;

                if (typeRoll < 0.35) {
                    obstacle = new Cone({
                        radius: 0.32 + Math.random() * 0.06,
                        height: 0.7 + Math.random() * 0.15,
                    });
                } else if (typeRoll < 0.7) {
                    obstacle = new Obstacle({
                        width: 1.4 + Math.random() * 0.5,
                        depth: 1.2 + Math.random() * 0.4,
                        height: 0.9 + Math.random() * 0.4,
                    });
                } else {
                    // Wider barrier
                    obstacle = new Obstacle({
                        width: 2.4 + Math.random() * 0.8,
                        depth: 0.8 + Math.random() * 0.3,
                        height: 0.9,
                        color: 0x9a5c2f,
                    });
                }

                obstacle.position.set(laneX, 0, z);
                obstacle.rotation.y = (Math.random() - 0.5) * 0.4;
                this.add(obstacle);
                obstacles.push(obstacle);
                z -= minSeparation;
            }
            z -= 4 + Math.random() * 4;
        }

        return obstacles;
    }

    spawnTreesInRange(startZ, endZ) {
        const trees = [];
        const spacing = 30;
        const offsetX = 11;
        for (let z = startZ; z <= endZ; z += spacing) {
            const jitter = (Math.random() - 0.5) * 3;
            const leftTree = new Tree({ foliageHeight: 2.3 + Math.random() * 0.7 });
            leftTree.position.set(-offsetX + jitter, 0, z + jitter);
            leftTree.scale.setScalar(0.85 + Math.random() * 0.35);

            const rightTree = new Tree({ foliageHeight: 2.3 + Math.random() * 0.7 });
            rightTree.position.set(offsetX + jitter, 0, z - jitter);
            rightTree.scale.setScalar(0.85 + Math.random() * 0.35);

            this.add(leftTree, rightTree);
            trees.push(leftTree, rightTree);
        }
        return trees;
    }

    spawnRoadStrip(startZ, endZ, width = this.state.roadWidth) {
        // Slightly extend length to overlap neighbors and avoid seams
        const length = Math.abs(endZ - startZ) + 0.2;
        const midZ = (startZ + endZ) / 2;

        // Broad grass patch so the ground follows the road
        const grassWidth = width + 120;
        const grassGeometry = new PlaneGeometry(grassWidth, length);
        grassGeometry.rotateX(-Math.PI / 2);
        const grassMaterial = new MeshStandardMaterial({ color: new Color(0x3d6e3d), roughness: 0.95, metalness: 0.02 });
        const grass = new Mesh(grassGeometry, grassMaterial);
        grass.receiveShadow = true;
        // Nudge grass slightly below 0 to avoid z-fighting with base ground
        grass.position.set(0, -0.02, midZ);
        this.add(grass);

        const geometry = new PlaneGeometry(width, length);
        geometry.rotateX(-Math.PI / 2);
        const material = new MeshStandardMaterial({ color: new Color(0x1f2733), roughness: 0.95, metalness: 0.05 });
        const road = new Mesh(geometry, material);
        road.receiveShadow = true;
        road.position.set(0, 0.001, midZ);
        this.add(road);

        // Dashes along center
        const lineGeometry = new PlaneGeometry(0.25, 2.4);
        lineGeometry.rotateX(-Math.PI / 2);
        const lineMaterial = new MeshStandardMaterial({
            color: new Color(0xf4f5f7),
            emissive: new Color(0x222222),
            roughness: 0.4,
            metalness: 0.1,
        });
        const lines = [];
        for (let z = startZ + 3; z <= endZ; z += 6) {
            const dash = new Mesh(lineGeometry, lineMaterial);
            dash.position.set(0, 0.02, z);
            dash.receiveShadow = false;
            dash.castShadow = false;
            this.add(dash);
            lines.push(dash);
        }

        // Side lane lines
        const sideLineGeometry = new PlaneGeometry(0.15, length);
        sideLineGeometry.rotateX(-Math.PI / 2);
        const sideLines = [];
        const sideOffset = width / 2 - 0.7;
        [-sideOffset, sideOffset].forEach((x) => {
            const side = new Mesh(sideLineGeometry, lineMaterial);
            side.position.set(x, 0.02, midZ);
            side.receiveShadow = false;
            side.castShadow = false;
            this.add(side);
            sideLines.push(side);
        });

        // Grass shoulders
        const shoulderWidth = 4;
        const shoulderGeometry = new PlaneGeometry(shoulderWidth, length);
        shoulderGeometry.rotateX(-Math.PI / 2);
        const shoulderMaterial = new MeshStandardMaterial({ color: new Color(0x427a42), roughness: 0.95, metalness: 0.02 });
        const leftShoulder = new Mesh(shoulderGeometry, shoulderMaterial);
        leftShoulder.position.set(-width / 2 - shoulderWidth / 2, 0.0005, (startZ + endZ) / 2);
        leftShoulder.receiveShadow = true;
        const rightShoulder = new Mesh(shoulderGeometry, shoulderMaterial);
        rightShoulder.position.set(width / 2 + shoulderWidth / 2, 0.0005, (startZ + endZ) / 2);
        rightShoulder.receiveShadow = true;
        this.add(leftShoulder, rightShoulder);

        return { grass, road, lines, sideLines, shoulders: [leftShoulder, rightShoulder] };
    }

    spawnBarriers(startZ, endZ, width = this.state.roadWidth, isIntersection = false) {
        const length = Math.abs(endZ - startZ);
        const barrierThickness = 0.8;
        const barrierHeight = 0.9;
        const barrierOffset = width / 2 + barrierThickness * 0.6;
        const midZ = (startZ + endZ) / 2;
        const gapSize = isIntersection ? width + 10 : 0; // leave a gap for crossing traffic

        const makeBarrierSegments = (xPos) => {
            if (!isIntersection) {
                const single = new Obstacle({
                    width: barrierThickness,
                    depth: length,
                    height: barrierHeight,
                    color: 0x6b7079,
                });
                single.position.set(xPos, 0, midZ);
                single.children.forEach((child) => {
                    child.castShadow = true;
                    child.receiveShadow = true;
                });
                return [single];
            }

            const halfGap = gapSize / 2;
            const depthEach = (length - gapSize) / 2;
            const z1 = midZ - halfGap - depthEach / 2;
            const z2 = midZ + halfGap + depthEach / 2;

            const seg1 = new Obstacle({
                width: barrierThickness,
                depth: depthEach,
                height: barrierHeight,
                color: 0x6b7079,
            });
            seg1.position.set(xPos, 0, z1);
            const seg2 = new Obstacle({
                width: barrierThickness,
                depth: depthEach,
                height: barrierHeight,
                color: 0x6b7079,
            });
            seg2.position.set(xPos, 0, z2);
            [seg1, seg2].forEach((seg) => {
                seg.children.forEach((child) => {
                    child.castShadow = true;
                    child.receiveShadow = true;
                });
            });
            return [seg1, seg2];
        };

        const leftSegments = makeBarrierSegments(-barrierOffset);
        const rightSegments = makeBarrierSegments(barrierOffset);

        [...leftSegments, ...rightSegments].forEach((seg) => this.add(seg));
        return [...leftSegments, ...rightSegments];
    }

    spawnCrossRoad(startZ, endZ, width = this.state.roadWidth) {
        const length = width * 8; // extend far so it doesn't fade into grass
        const crossGeometry = new PlaneGeometry(length, width);
        crossGeometry.rotateX(-Math.PI / 2);
        const material = new MeshStandardMaterial({ color: new Color(0x1f2733), roughness: 0.95, metalness: 0.05 });
        const crossRoad = new Mesh(crossGeometry, material);
        crossRoad.position.set(0, 0.01, (startZ + endZ) / 2);
        this.add(crossRoad);

        // Center dashes along the cross road (along X)
        const dashGeometry = new PlaneGeometry(2.4, 0.25);
        dashGeometry.rotateX(-Math.PI / 2);
        const dashMaterial = new MeshStandardMaterial({
            color: new Color(0xf4f5f7),
            emissive: new Color(0x222222),
            roughness: 0.4,
            metalness: 0.1,
        });
        const crossLines = [];
        for (let x = -length / 2 + 3; x <= length / 2; x += 6) {
            const dash = new Mesh(dashGeometry, dashMaterial);
            dash.position.set(x, 0.015, (startZ + endZ) / 2);
            dash.receiveShadow = false;
            dash.castShadow = false;
            this.add(dash);
            crossLines.push(dash);
        }

        // Side lines along the cross road edges
        const sideGeometry = new PlaneGeometry(length, 0.15);
        sideGeometry.rotateX(-Math.PI / 2);
        const sideLines = [];
        const sideOffset = width / 2 - 0.7;
        [ -sideOffset, sideOffset ].forEach((zOffset) => {
            const side = new Mesh(sideGeometry, dashMaterial);
            side.position.set(0, 0.012, (startZ + endZ) / 2 + zOffset);
            side.receiveShadow = false;
            side.castShadow = false;
            this.add(side);
            sideLines.push(side);
        });

        return { crossRoad, crossLines, crossSideLines: sideLines };
    }

    spawnTrafficCars(startZ, endZ, width = this.state.roadWidth, playerSpeed = 0, playerEta = 2) {
        // Occasionally skip traffic so some intersections are empty
        if (Math.random() < 0.45) return [];

        const cars = [];
        const count = 1 + Math.floor(Math.random() * 4); // 1-4 cars
        const midZ = (startZ + endZ) / 2;
        const crossLength = width * 8;
        const baseSpeed = 5.2 + Math.random() * 1.3; // ~5.2–6.5
        const speedBoost = Math.min(1.6, playerSpeed * 0.08);
        for (let i = 0; i < count; i += 1) {
            const dir = Math.random() < 0.5 ? 1 : -1;
            // Try to time the crossing to the player's arrival
            const carSpeed = baseSpeed + speedBoost;
            // Jitter timing so some are early/late when you reach the intersection
            const timingJitter = (Math.random() - 0.5) * 1.8; // ~-0.9s to +0.9s
            const eta = Math.max(0.25, playerEta + timingJitter);
            // Give them plenty of runway so they visibly drive in
            const desiredDist = Math.max(12, Math.min(crossLength / 2 + 40, carSpeed * Math.max(0.6, eta + 0.8)));
            const startX = dir > 0 ? -desiredDist : desiredDist;
            const zOffset = (Math.random() - 0.5) * 8;
            const trafficCar = new TrafficCar({
                color: Math.random() < 0.5 ? 0x4a8bd7 : 0xd76d4a,
                speed: carSpeed,
                direction: dir,
            });
            trafficCar.position.set(startX, 0, midZ + zOffset);
            trafficCar.setHeadLights(this.state.mode === 'night');
            this.add(trafficCar);
            cars.push(trafficCar);
        }
        return cars;
    }

    activateTraffic() {
        const playerSpeed = Math.max(0.1, Math.abs(this.car.state.velocity));
        // Allow activation farther out so cars have time to drive in
        const leadDistance = Math.max(40, Math.min(140, playerSpeed * 4 + 50));
        for (const segment of this.state.segments.values()) {
            if (!segment.isIntersection || segment.trafficActivated) continue;
            const ahead = this.car.position.z - segment.midZ; // positive means intersection ahead of player
            if (ahead >= 0 && ahead <= leadDistance) {
                const eta = playerSpeed > 0.1 ? ahead / playerSpeed : 2;
                const cars = this.spawnTrafficCars(segment.startZ, segment.endZ, this.state.roadWidth, playerSpeed, eta);
                segment.trafficCars = cars;
                segment.trafficActivated = true;
                segment.obstacles.push(...cars);
                cars.forEach((car) => this.addToUpdateList(car));
            }
        }
    }

    cleanupSegment(segment) {
        if (!segment) return;
        if (segment.obstacles) {
            for (const obstacle of segment.obstacles) {
                this.remove(obstacle);
            }
        }
        if (segment.trafficCars) {
            for (const car of segment.trafficCars) {
                this.remove(car);
                this.removeFromUpdateList(car);
            }
        }
        if (segment.road) {
            this.remove(segment.road);
        }
        if (segment.crossRoad) {
            this.remove(segment.crossRoad);
        }
        if (segment.crossLines) {
            for (const line of segment.crossLines) {
                this.remove(line);
            }
        }
        if (segment.crossSideLines) {
            for (const line of segment.crossSideLines) {
                this.remove(line);
            }
        }
        if (segment.grass) {
            this.remove(segment.grass);
        }
        if (segment.lines) {
            for (const line of segment.lines) {
                this.remove(line);
            }
        }
        if (segment.sideLines) {
            for (const line of segment.sideLines) {
                this.remove(line);
            }
        }
        if (segment.shoulders) {
            for (const shoulder of segment.shoulders) {
                this.remove(shoulder);
            }
        }
        if (segment.barriers) {
            for (const barrier of segment.barriers) {
                this.remove(barrier);
            }
        }
        if (segment.trees) {
            for (const tree of segment.trees) {
                this.remove(tree);
            }
        }
    }

    checkCollisions() {
        const { segments, carHalfWidth, carHalfLength } = this.state;
        const carPos = this.car.position;

        // Only check nearby segments (current and next couple)
        const currentIndex = Math.floor(-carPos.z / this.state.segmentLength);
        const nearby = [currentIndex - 1, currentIndex, currentIndex + 1];

        for (const index of nearby) {
            const segment = segments.get(index);
            if (!segment) continue;

            if (segment.obstacles) {
                for (const obstacle of segment.obstacles) {
                    const obsHalfWidth = (obstacle.dimensions?.width || 1.6) / 2;
                    const obsHalfLength = (obstacle.dimensions?.depth || 1.6) / 2;
                    const dx = carPos.x - obstacle.position.x;
                    const dz = carPos.z - obstacle.position.z;

                    if (Math.abs(dx) < carHalfWidth + obsHalfWidth && Math.abs(dz) < carHalfLength + obsHalfLength) {
                        this.handleCollision();
                        return;
                    }
                }
            }

            if (segment.barriers) {
                for (const barrier of segment.barriers) {
                    const barrierHalfWidth = 0.5;
                    const barrierHalfLength = this.state.segmentLength / 2;
                    const dx = carPos.x - barrier.position.x;
                    const dz = carPos.z - barrier.position.z;
                    if (Math.abs(dx) < carHalfWidth + barrierHalfWidth && Math.abs(dz) < carHalfLength + barrierHalfLength) {
                        this.handleCollision();
                        return;
                    }
                }
            }
        }
    }

    handleCollision() {
        // Simple reset on collision, but preserve score for display
        this.car.state.velocity = 0;
        this.car.state.heading = 0;
        this.car.setSpeedMultiplier(1);
        this.state.gameState = 'gameover';
        this.ensureSegments();
        this.updateHUD(this.state.score, 1);
        this.persistAndLoadScores();
        this.showGameOverOverlay();
    }

    registerInputListeners() {
        window.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.state.input.forward = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.state.input.backward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.state.input.left = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.state.input.right = true;
                    break;
                default:
                    break;
            }
        });

        window.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.state.input.forward = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.state.input.backward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.state.input.left = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.state.input.right = false;
                    break;
                default:
                    break;
            }
        });
    }

    addToUpdateList(object) {
        this.state.updateList.push(object);
    }
    removeFromUpdateList(object) {
        const idx = this.state.updateList.indexOf(object);
        if (idx !== -1) {
            this.state.updateList.splice(idx, 1);
        }
    }

    update(timeStamp, camera) {
        const { updateList, lastTime, cameraTarget, fixedDelta } = this.state;
        const delta = lastTime === null ? 0 : (timeStamp - lastTime) / 1000;
        const cappedDelta = Math.min(delta, 0.02); // tighter cap to smooth updates
        this.state.lastTime = timeStamp;

        const isPlaying = this.state.gameState === 'playing';

        if (isPlaying) {
            this.activateTraffic();
            // Fixed timestep integration for smoother motion
            this.state.accumulator += cappedDelta;
            let steps = 0;
            const maxSteps = 5;
            while (this.state.accumulator >= fixedDelta && steps < maxSteps) {
                for (const obj of updateList) {
                    if (typeof obj.update === 'function') {
                        obj.update(fixedDelta);
                    }
                }
                this.state.accumulator -= fixedDelta;
                steps += 1;
            }
        } else {
            this.state.accumulator = 0;
        }

        // Update difficulty and score
        let speedMultiplier = 1;
        if (isPlaying) {
            if (this.state.runStartTime === null) {
                this.state.runStartTime = timeStamp;
                this.state.warmupUntil = null;
            }
            const elapsed = (timeStamp - this.state.runStartTime) / 1000;
            speedMultiplier = Math.min(this.state.maxSpeedMultiplier, 1 + elapsed * 0.02); // ramps up but capped
            this.car.setSpeedMultiplier(speedMultiplier);

            this.state.distance += Math.abs(this.car.state.velocity) * delta;
            this.state.score = Math.floor(this.state.distance);
        } else {
            this.car.state.velocity = 0;
        }

        if (camera) {
            if (this.state.cameraMode === 'menu') {
                // Front/side view of the car for the menu (zoomed out)
                const offset = new Vector3(3.5, 3.2, -8).applyAxisAngle(new Vector3(0, 1, 0), this.car.state.heading);
                const desired = new Vector3().copy(this.car.position).add(offset);
                camera.position.lerp(desired, 0.06);
                const lookTarget = this.car.position.clone().add(new Vector3(0, 1, 0));
                cameraTarget.lerp(lookTarget, 0.1);
                camera.lookAt(cameraTarget);
            } else {
                // Smooth follow camera with a bit of height and trailing distance
                const desiredPosition = new Vector3(0, 3, 8)
                    .applyAxisAngle(new Vector3(0, 1, 0), this.car.state.heading)
                    .add(this.car.position);

                camera.position.lerp(desiredPosition, 0.15);
                cameraTarget.lerp(this.car.position, 0.2);
                camera.lookAt(cameraTarget);
            }
        }

        this.ensureSegments();
        if (isPlaying) {
            this.checkCollisions();
        }
        this.updateHUD(this.state.score, speedMultiplier);
    }

    initHUD() {
        const hud = document.createElement('div');
        hud.style.position = 'fixed';
        hud.style.top = '12px';
        hud.style.left = '12px';
        hud.style.color = '#f5f7ff';
        hud.style.fontFamily = 'monospace';
        hud.style.fontSize = '15px';
        hud.style.padding = '8px 10px';
        hud.style.background = 'rgba(0, 0, 0, 0.35)';
        hud.style.borderRadius = '6px';
        hud.style.zIndex = '10';
        hud.innerText = 'Score: 0 | Speed x1.0';
        document.body.appendChild(hud);
        this.state.hudEl = hud;
    }

    updateHUD(score, speedMultiplier) {
        if (!this.state.hudEl) return;
        this.state.hudEl.innerText = `Score: ${score} | Speed x${speedMultiplier.toFixed(2)}`;
    }

    async persistAndLoadScores(skipSave = false) {
        // Skip if Supabase placeholders are not set
        if (this.SUPA_URL.includes('YOUR_PROJECT') || this.SUPA_KEY.includes('YOUR_ANON_KEY')) return;
        if (!skipSave) {
            try {
                await this.saveScore(this.state.playerName || 'Guest', this.state.score);
            } catch (e) {
                // ignore network errors for now
            }
        }
        try {
            const scores = await this.loadTopScores();
            this.renderLeaderboard(scores);
        } catch (e) {
            // ignore
        }
    }

    async saveScore(name, score) {
        const payload = { name: name || 'Guest', score: Math.floor(score || 0) };
        return fetch(this.SUPA_SCORE_ENDPOINT, {
            method: 'POST',
            headers: this.SUPA_HEADERS,
            body: JSON.stringify(payload),
        });
    }

    async loadTopScores() {
        const res = await fetch(
            `${this.SUPA_SCORE_ENDPOINT}?select=name,score&order=score.desc&limit=10`,
            { headers: this.SUPA_HEADERS }
        );
        if (!res.ok) return [];
        return res.json();
    }

    renderLeaderboard(scores) {
        const targets = [this.state.scoreListEl, this.state.startScoreListEl];
        targets.forEach((el) => {
            if (!el) return;
            if (!scores || scores.length === 0) {
                el.innerText = 'No scores yet';
                return;
            }
            el.innerHTML = scores
                .map((s, i) => `${i + 1}. ${s.name || 'Guest'} — ${s.score}`)
                .join('<br>');
        });
    }

    initChatClient() {
        if (this.SUPA_URL.includes('YOUR_PROJECT') || this.SUPA_KEY.includes('YOUR_ANON_KEY')) return;
        if (!this.state.chat.container) return; // UI not ready yet
        if (this.state.chat.client) return;
        const client = createClient(this.SUPA_URL, this.SUPA_KEY);
        this.state.chat.client = client;
        this.loadChatMessages();
        this.subscribeChat();
    }

    async loadChatMessages() {
        if (!this.state.chat.client) return;
        try {
            const { data, error } = await this.state.chat.client
                .from('messages')
                .select('id, user, body, created_at')
                .order('created_at', { ascending: false })
                .limit(50);
            if (!error && data) {
                // reverse to show oldest first in render
                this.state.chat.messages = data.reverse();
                this.renderChatMessages();
            }
        } catch (e) {
            // ignore
        }
    }

    subscribeChat() {
        if (!this.state.chat.client) return;
        if (this.state.chat.channel) return;
        const channel = this.state.chat.client
            .channel('public:messages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    if (payload?.new) {
                        this.appendChatMessage(payload.new);
                    }
                }
            )
            .subscribe((status) => {
                if (this.state.chat.status) {
                    this.state.chat.status.innerText = status === 'SUBSCRIBED' ? 'live' : status.toLowerCase();
                }
            });
        this.state.chat.channel = channel;
    }

    async sendChatMessage() {
        if (!this.state.chat.client || !this.state.chat.input) return;
        const body = this.state.chat.input.value.trim();
        if (!body) return;
        const user = this.state.playerName || 'Guest';
        this.state.chat.input.value = '';
        try {
            await this.state.chat.client.from('messages').insert({ user, body });
        } catch (e) {
            if (this.state.chat.status) {
                this.state.chat.status.innerText = 'error';
            }
        }
    }

    appendChatMessage(msg) {
        this.state.chat.messages.push(msg);
        // keep last 100
        if (this.state.chat.messages.length > 100) {
            this.state.chat.messages.shift();
        }
        this.renderChatMessages();
    }

    renderChatMessages() {
        const list = this.state.chat.list;
        if (!list) return;
        const msgs = this.state.chat.messages || [];
        if (msgs.length === 0) {
            list.innerHTML = '<div style=\"opacity:0.7\">No messages yet</div>';
            return;
        }
        list.innerHTML = msgs
            .map((m) => {
                const name = (m.user || 'Guest').slice(0, 16);
                const body = (m.body || '').slice(0, 160);
                return `<div><span style=\"color:#7dd3fc\">${name}:</span> ${body}</div>`;
            })
            .join('');
        list.scrollTop = list.scrollHeight;
    }

    initUI() {
        // Start overlay
        const startOverlay = document.createElement('div');
        Object.assign(startOverlay.style, {
            position: 'fixed',
            inset: '0',
            background: 'rgba(12, 18, 28, 0.76)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: '#f5f7ff',
            fontFamily: 'monospace',
            zIndex: '20',
        });
        // Top-left leaderboard on the start screen
        const startBoard = document.createElement('div');
        Object.assign(startBoard.style, {
            position: 'absolute',
            top: '14px',
            right: '14px',
            padding: '10px 12px',
            background: 'rgba(6, 10, 16, 0.65)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#dfe7ff',
            fontSize: '13px',
            lineHeight: '1.4',
            minWidth: '170px',
            maxHeight: '200px',
            overflowY: 'auto',
            textAlign: 'left',
        });
        const startBoardTitle = document.createElement('div');
        startBoardTitle.innerText = 'Top 10 Scores';
        startBoardTitle.style.fontWeight = 'bold';
        startBoardTitle.style.marginBottom = '6px';
        startBoard.appendChild(startBoardTitle);
        const startBoardList = document.createElement('div');
        startBoard.appendChild(startBoardList);
        startOverlay.appendChild(startBoard);
        const startTitle = document.createElement('div');
        startTitle.innerText = 'Endless Drive';
        startTitle.style.fontSize = '28px';
        startTitle.style.marginBottom = '12px';

        const nameInput = document.createElement('input');
        Object.assign(nameInput.style, {
            padding: '8px 10px',
            fontSize: '14px',
            borderRadius: '6px',
            border: '1px solid #3a3f4b',
            marginBottom: '12px',
            fontFamily: 'monospace',
            background: '#111722',
            color: '#f5f7ff',
        });
        nameInput.placeholder = 'Your name';
        nameInput.maxLength = 12;
        nameInput.value = this.state.playerName || 'Guest';
        nameInput.addEventListener('input', () => {
            this.state.playerName = nameInput.value || 'Guest';
        });

        const modeRow = document.createElement('div');
        modeRow.style.display = 'flex';
        modeRow.style.alignItems = 'center';
        modeRow.style.gap = '8px';
        modeRow.style.marginBottom = '12px';
        const modeLabel = document.createElement('span');
        modeLabel.innerText = 'Mode:';
        modeLabel.style.fontSize = '14px';
        modeLabel.style.opacity = '0.85';
        modeRow.appendChild(modeLabel);
        const dayBtn = this.createModeButton('Day', 'day');
        const nightBtn = this.createModeButton('Night', 'night');
        modeRow.appendChild(dayBtn);
        modeRow.appendChild(nightBtn);

        const startBtn = document.createElement('button');
        startBtn.innerText = 'Start';
        startBtn.style.padding = '10px 18px';
        startBtn.style.fontSize = '16px';
        startBtn.style.cursor = 'pointer';
        startBtn.style.borderRadius = '6px';
        startBtn.style.border = 'none';
        startBtn.style.background = '#38bdf8';
        startBtn.style.color = '#0b1020';
        startBtn.addEventListener('click', () => this.startGame());
        startOverlay.appendChild(startTitle);
        startOverlay.appendChild(nameInput);
        startOverlay.appendChild(modeRow);
        startOverlay.appendChild(startBtn);
        document.body.appendChild(startOverlay);

        // Game over overlay
        const gameOverOverlay = document.createElement('div');
        Object.assign(gameOverOverlay.style, {
            position: 'fixed',
            inset: '0',
            background: 'rgba(12, 0, 0, 0.7)',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: '#f5f7ff',
            fontFamily: 'monospace',
            zIndex: '21',
        });
        const gameOverTitle = document.createElement('div');
        gameOverTitle.innerText = 'Game Over';
        gameOverTitle.style.fontSize = '26px';
        gameOverTitle.style.marginBottom = '8px';
        const gameOverScore = document.createElement('div');
        gameOverScore.style.marginBottom = '14px';

        const scoreList = document.createElement('div');
        scoreList.style.fontFamily = 'monospace';
        scoreList.style.fontSize = '14px';
        scoreList.style.marginBottom = '14px';
        scoreList.style.maxHeight = '200px';
        scoreList.style.overflowY = 'auto';

        const modeRowOver = document.createElement('div');
        modeRowOver.style.display = 'flex';
        modeRowOver.style.alignItems = 'center';
        modeRowOver.style.gap = '8px';
        modeRowOver.style.marginBottom = '12px';
        const modeLabelOver = document.createElement('span');
        modeLabelOver.innerText = 'Mode:';
        modeLabelOver.style.fontSize = '14px';
        modeLabelOver.style.opacity = '0.85';
        modeRowOver.appendChild(modeLabelOver);
        const dayBtnOver = this.createModeButton('Day', 'day');
        const nightBtnOver = this.createModeButton('Night', 'night');
        modeRowOver.appendChild(dayBtnOver);
        modeRowOver.appendChild(nightBtnOver);

        const retryBtn = document.createElement('button');
        retryBtn.innerText = 'Back to Menu';
        retryBtn.style.padding = '10px 18px';
        retryBtn.style.fontSize = '16px';
        retryBtn.style.cursor = 'pointer';
        retryBtn.style.borderRadius = '6px';
        retryBtn.style.border = 'none';
        retryBtn.style.background = '#f97316';
        retryBtn.style.color = '#0b1020';
        retryBtn.addEventListener('click', () => this.showStartOverlay());

        gameOverOverlay.appendChild(gameOverTitle);
        gameOverOverlay.appendChild(gameOverScore);
        gameOverOverlay.appendChild(scoreList);
        gameOverOverlay.appendChild(modeRowOver);
        gameOverOverlay.appendChild(retryBtn);
        document.body.appendChild(gameOverOverlay);

        this.state.startOverlay = startOverlay;
        this.state.gameOverOverlay = gameOverOverlay;
        this.state.gameOverScoreEl = gameOverScore;
        this.state.scoreListEl = scoreList;
        this.state.startScoreListEl = startBoardList;
        this.refreshModeButtons();
    }

    initTouchControls() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            position: 'fixed',
            inset: '0',
            pointerEvents: 'none',
            zIndex: '15',
        });

        const makeBtn = (label, onPress, onRelease) => {
            const btn = document.createElement('div');
            Object.assign(btn.style, {
                width: '58px',
                height: '58px',
                background: 'rgba(20,25,35,0.72)',
                color: '#f5f7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                fontFamily: 'monospace',
                fontSize: '20px',
                userSelect: 'none',
                pointerEvents: 'auto',
                touchAction: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            });
            btn.innerText = label;
            const start = (e) => {
                e.preventDefault();
                onPress();
            };
            const end = (e) => {
                e.preventDefault();
                onRelease();
            };
            btn.addEventListener('touchstart', start);
            btn.addEventListener('touchend', end);
            btn.addEventListener('touchcancel', end);
            return btn;
        };

        const left = makeBtn('◄', () => (this.state.input.left = true), () => (this.state.input.left = false));
        const right = makeBtn('►', () => (this.state.input.right = true), () => (this.state.input.right = false));

        Object.assign(left.style, { position: 'absolute', top: '50%', left: '20px', transform: 'translateY(-50%)' });
        Object.assign(right.style, { position: 'absolute', top: '50%', right: '20px', transform: 'translateY(-50%)' });

        container.appendChild(left);
        container.appendChild(right);
        document.body.appendChild(container);
        this.state.touchControls = container;
    }

    initChatUI() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            position: 'fixed',
            bottom: '12px',
            right: '12px',
            width: '280px',
            background: 'rgba(8, 10, 16, 0.72)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            color: '#e8ecf5',
            fontFamily: 'monospace',
            fontSize: '12px',
            zIndex: '30', // above start/game overlays so chat is accessible in the menu
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'auto',
            boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
        });
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            borderTopLeftRadius: '10px',
            borderTopRightRadius: '10px',
        });
        const title = document.createElement('div');
        title.innerText = 'Live Chat';
        title.style.fontWeight = 'bold';
        const status = document.createElement('div');
        status.innerText = 'connecting...';
        status.style.fontSize = '11px';
        status.style.opacity = '0.7';
        header.appendChild(title);
        header.appendChild(status);
        const list = document.createElement('div');
        Object.assign(list.style, {
            padding: '8px 10px',
            maxHeight: '130px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
        });
        const inputRow = document.createElement('div');
        Object.assign(inputRow.style, {
            display: 'flex',
            padding: '8px 10px',
            gap: '6px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            marginTop: 'auto',
        });
        const input = document.createElement('input');
        Object.assign(input.style, {
            flex: '1',
            padding: '6px 8px',
            background: '#0f1421',
            border: '1px solid #243044',
            color: '#e8ecf5',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '12px',
        });
        input.placeholder = 'Message...';
        const sendBtn = document.createElement('button');
        Object.assign(sendBtn.style, {
            padding: '6px 10px',
            background: '#38bdf8',
            border: 'none',
            borderRadius: '6px',
            color: '#0b1020',
            cursor: 'pointer',
            fontWeight: 'bold',
        });
        sendBtn.innerText = 'Send';
        sendBtn.addEventListener('click', () => this.sendChatMessage());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendChatMessage();
            }
        });
        inputRow.appendChild(input);
        inputRow.appendChild(sendBtn);

        const toggleBtn = document.createElement('button');
        Object.assign(toggleBtn.style, {
            marginLeft: '8px',
            padding: '4px 8px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
            color: '#e8ecf5',
            cursor: 'pointer',
            fontSize: '11px',
        });
        toggleBtn.innerText = 'Hide';
        toggleBtn.addEventListener('click', () => {
            const isHidden = list.style.display === 'none';
            list.style.display = isHidden ? 'flex' : 'none';
            inputRow.style.display = isHidden ? 'flex' : 'none';
            toggleBtn.innerText = isHidden ? 'Hide' : 'Show';
            container.style.height = isHidden ? '' : 'auto';
        });
        header.appendChild(toggleBtn);

        container.appendChild(header);
        container.appendChild(list);
        container.appendChild(inputRow);
        document.body.appendChild(container);

        this.state.chat.container = container;
        this.state.chat.list = list;
        this.state.chat.input = input;
        this.state.chat.status = status;
    }

    createModeButton(label, mode) {
        const btn = document.createElement('button');
        btn.innerText = label;
        btn.style.padding = '6px 12px';
        btn.style.fontSize = '13px';
        btn.style.cursor = 'pointer';
        btn.style.borderRadius = '6px';
        btn.style.border = 'none';
        btn.style.background = mode === 'day' ? '#cdeafe' : '#d7d0ff';
        btn.style.color = '#0b1020';
        btn.addEventListener('click', () => {
            this.applyMode(mode);
            this.refreshModeButtons();
        });
        this.state.modeButtons[mode].push(btn);
        return btn;
    }

    refreshModeButtons() {
        const activeMode = this.state.mode;
        ['day', 'night'].forEach((mode) => {
            const active = mode === activeMode;
            const buttons = this.state.modeButtons[mode] || [];
            buttons.forEach((btn) => {
                btn.style.background = active ? (mode === 'day' ? '#7dd3fc' : '#c4b5fd') : '#232733';
                btn.style.color = active ? '#0b1020' : '#f5f7ff';
            });
        });
    }

    applyMode(mode) {
        this.state.mode = mode;
        if (mode === 'day') {
            this.background.set(0x7bb8e3);
            this.fog.color.set(0xdfe9f3);
            this.fog.density = 0.01;
            this.sun.visible = true;
            this.moon.visible = false;
            this.car.setHeadLights(false);
        } else {
            this.background.set(0x0c1625);
            this.fog.color.set(0x0b1020);
            this.fog.density = 0.015;
            this.sun.visible = false;
            this.moon.visible = true;
            this.car.setHeadLights(true);
        }

        if (this.fog) {
            this.fog.near = 10;
            this.fog.far = 150;
        }

        if (this.lights && this.lights.children) {
            this.lights.children.forEach((light) => {
                if (light.isAmbientLight) {
                    light.intensity = mode === 'day' ? 1.0 : 0.9;
                    light.color.set(mode === 'day' ? 0xf5f6ff : 0x404060);
                }
                if (light.isHemisphereLight) {
                    light.intensity = mode === 'day' ? 1.6 : 1.1;
                    light.color.set(mode === 'day' ? 0xfff4d8 : 0x8899bb);
                    light.groundColor.set(mode === 'day' ? 0x597a59 : 0x0a0f1c);
                }
                if (light.isSpotLight) {
                    light.intensity = mode === 'day' ? 0.9 : 1.9;
                    light.color.set(mode === 'day' ? 0xfff1d6 : 0xb0c7ff);
                    light.position.set(mode === 'day' ? 6 : 4, mode === 'day' ? 2.5 : 1.4, mode === 'day' ? 3 : 1.2);
                }
            });
        }
        // Tone down sun/moon emissive glow
        if (this.sun && this.sun.material) {
            this.sun.material.emissiveIntensity = mode === 'day' ? 0.9 : 0.2;
        }
        if (this.moon && this.moon.material) {
            this.moon.material.emissiveIntensity = mode === 'day' ? 0.1 : 1.0;
        }
        this.refreshModeButtons();
    }

    showStartOverlay() {
        if (this.state.startOverlay) this.state.startOverlay.style.display = 'flex';
        if (this.state.gameOverOverlay) this.state.gameOverOverlay.style.display = 'none';
        this.state.gameState = 'idle';
        this.state.cameraMode = 'menu';
        // Reset input so the car stays put in menu view
        this.state.input.forward = false;
        this.state.input.backward = false;
        this.state.input.left = false;
        this.state.input.right = false;
        this.car.state.velocity = 0;
        this.car.state.heading = 0;
        this.car.position.copy(this.startPosition);
        // refresh leaderboard when returning to menu
        this.persistAndLoadScores(true);
    }

    showGameOverOverlay() {
        if (this.state.gameOverOverlay) {
            this.state.gameOverOverlay.style.display = 'flex';
            if (this.state.gameOverScoreEl) {
                this.state.gameOverScoreEl.innerText = `Score: ${this.state.score}`;
            }
        }
    }

    startGame() {
        this.car.position.copy(this.startPosition);
        this.car.state.velocity = 0;
        this.car.state.heading = 0;
        this.car.setSpeedMultiplier(1);
        // Reset input and update list to a clean state
        this.state.input.forward = false;
        this.state.input.backward = false;
        this.state.input.left = false;
        this.state.input.right = false;
        this.state.updateList = [this.car];
        this.state.segments.forEach((segment) => this.cleanupSegment(segment));
            this.state.segments.clear();
            this.state.lastSegmentIndex = null;
            this.state.lastIntersectionIndex = -100;
            this.state.lastTime = null;
            this.state.distance = 0;
            this.state.score = 0;
            this.state.runStartTime = null;
        this.state.gameState = 'playing';
        this.state.cameraMode = 'follow';
        this.state.accumulator = 0;
        this.state.input.forward = true; // ensure movement starts
        this.persistAndLoadScores(true);
        this.ensureSegments();
        this.updateHUD(0, 1);
        if (this.state.startOverlay) this.state.startOverlay.style.display = 'none';
        if (this.state.gameOverOverlay) this.state.gameOverOverlay.style.display = 'none';
        this.applyMode(this.state.mode);
    }
}

export default DrivingScene;
