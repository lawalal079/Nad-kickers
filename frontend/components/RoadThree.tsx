"use client";

import React, { useRef, useMemo, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useTexture, Html } from "@react-three/drei";
import * as THREE from "three";

interface Ball3DProps {
    gameState: string;
    lastResult: any;
    playerMove: number | null;
    isOnFire: boolean;
}

function Ball3D({ gameState, lastResult, playerMove, isOnFire }: Ball3DProps) {
    const ballRef = useRef<THREE.Group>(null);
    const [animationTime, setAnimationTime] = useState(0);

    // Load the optimized soccer ball texture with stable versioning
    const texture = useTexture("/textures/soccer_ball_pro.png?v=5");

    useEffect(() => {
        if (texture) {
            texture.anisotropy = 16;
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1, 1); // Pattern is already dense, use 1:1 for fidelity
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
        }
    }, [texture]);

    // Initial constants
    const startPos = new THREE.Vector3(0, -2, 10);
    const kickDuration = 0.8;

    useFrame((state, delta) => {
        if (!ballRef.current) return;

        if (gameState === "idle") {
            ballRef.current.position.lerp(startPos, 0.1);
            ballRef.current.rotation.x += delta * 0.5;
            setAnimationTime(0);
        } else if (gameState === "kicking" || gameState === "processing" || gameState === "result") {
            const midPhaseTime = 0.4; // Reach mid-point in 0.4s

            if (gameState === "kicking" || (gameState === "processing" && animationTime < midPhaseTime)) {
                // PHASE 1: Quick travel to suspense point
                const t = Math.min(animationTime / midPhaseTime, 1);
                const targetX = playerMove === 0 ? -4 : playerMove === 2 ? 4 : 0; // Moderate curve
                const targetZ = 0; // Mid-way to goal
                const arcHeight = 3;

                const x = THREE.MathUtils.lerp(startPos.x, targetX, t);
                const z = THREE.MathUtils.lerp(startPos.z, targetZ, t);
                const y = startPos.y + Math.sin(t * Math.PI) * arcHeight;

                ballRef.current.position.set(x, y, z);
                ballRef.current.rotation.x -= delta * 15;
                ballRef.current.rotation.y += delta * 5;

                setAnimationTime(prev => prev + delta);
            } else if (gameState === "processing") {
                // PHASE 2: Suspense Hover (Wait for VRF)
                ballRef.current.position.y += Math.sin(state.clock.elapsedTime * 10) * 0.01; // Vibration
                ballRef.current.rotation.x -= delta * 25; // Super fast spin
                ballRef.current.rotation.y += delta * 10;
            } else if (gameState === "result" && lastResult) {
                // PHASE 3: Resolve Outcome
                const { isGoal, goalieMove, actualMove } = lastResult;
                const isSave = !isGoal && goalieMove === actualMove;

                // Final destination
                let finalX = 0;
                let finalZ = -22; // Behind goal line
                let finalY = 0;

                if (isGoal) {
                    finalX = actualMove === 0 ? -7 : actualMove === 2 ? 7 : 0;
                    finalY = 1.5;
                } else if (isSave) {
                    // Hit goalie (Z=-15 roughly) and bounce
                    finalX = actualMove === 0 ? -4 : actualMove === 2 ? 4 : 0;
                    finalZ = -14;
                    finalY = 2;
                } else {
                    // Miss (Went wide/over)
                    finalX = actualMove === 0 ? -12 : actualMove === 2 ? 12 : 0;
                    finalY = 6; // High or wide
                    finalZ = -25;
                }

                ballRef.current.position.lerp(new THREE.Vector3(finalX, finalY, finalZ), 0.15);
                ballRef.current.rotation.x -= delta * 10;
            }
        }
    });

    return (
        <group ref={ballRef} position={[0, -2, 10]}>
            {/* Real Sphere Geometry with soccer texture */}
            <mesh castShadow>
                <sphereGeometry args={[0.8, 64, 64]} />
                <meshStandardMaterial
                    map={texture}
                    color="#ffffff"
                    metalness={0.6}
                    roughness={0.2}
                    emissive={isOnFire ? "#E879F9" : "#ffffff"}
                    emissiveIntensity={isOnFire ? 2 : 0.05}
                />
            </mesh>

            {/* Glowing inner core if on fire */}
            {isOnFire && (
                <mesh>
                    <sphereGeometry args={[0.85, 24, 24]} />
                    <meshBasicMaterial color="#E879F9" transparent opacity={0.4} wireframe />
                </mesh>
            )}

            {/* Dynamic Light that follows the ball */}
            <pointLight
                intensity={isOnFire ? 15 : 6}
                distance={15}
                color={isOnFire ? "#E879F9" : "#ffffff"}
                position={[0, 1, 0]}
            />
        </group>
    );
}

function RoadMesh() {
    const meshRef = useRef<THREE.Mesh>(null);

    const gridMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: "#E879F9",
            transparent: true,
            opacity: 0.2,
            wireframe: true,
            emissive: "#E879F9",
            emissiveIntensity: 0.4,
        });
    }, []);

    const groundMaterial = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: "#0E0C15",
            metalness: 0.6,
            roughness: 0.4,
        });
    }, []);

    return (
        <group rotation={[-Math.PI / 2.05, 0, 0]} position={[0, -2.5, 0]}>
            <mesh ref={meshRef} receiveShadow>
                <planeGeometry args={[100, 500, 1, 1]} />
                <primitive object={groundMaterial} attach="material" />
            </mesh>

            <mesh position={[0, 0, 0.05]}>
                <planeGeometry args={[100, 500, 40, 100]} />
                <primitive object={gridMaterial} attach="material" />
            </mesh>

            <mesh position={[0, 250, 0.02]}>
                <planeGeometry args={[100, 60]} />
                <meshBasicMaterial color="#E879F9" transparent opacity={0.05} />
            </mesh>
        </group>
    );
}

export default function RoadThree({ gameState, lastResult, playerMove, isOnFire }: Ball3DProps) {
    return (
        <div className="absolute inset-0 z-0 bg-[#0E0C15]">
            <Canvas
                shadows={false}
                camera={{ position: [0, 6, 25], fov: 38 }}
                gl={{ antialias: true, powerPreference: "high-performance" }}
                dpr={[1, 2]}
            >
                <color attach="background" args={["#0E0C15"]} />
                <fogExp2 attach="fog" args={["#0E0C15", 0.03]} />

                <ambientLight intensity={0.5} />
                <pointLight position={[0, 10, 10]} intensity={1.5} color="#836EF9" />
                <spotLight
                    position={[0, 20, 0]}
                    angle={0.4}
                    penumbra={1}
                    intensity={1.5}
                    color="#E879F9"
                />

                <RoadMesh />
                <Suspense fallback={null}>
                    <Ball3D
                        gameState={gameState}
                        lastResult={lastResult}
                        playerMove={playerMove}
                        isOnFire={isOnFire}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
}
