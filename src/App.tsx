import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// Mesh generators
function createLily() {
    const group = new THREE.Group();
    // Petals
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.quadraticCurveTo(0.5, 1, 0, 2);
    petalShape.quadraticCurveTo(-0.5, 1, 0, 0);
    
    const extrudeSettings = { depth: 0.02, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.01, bevelThickness: 0.01 };
    const petalGeo = new THREE.ExtrudeGeometry(petalShape, extrudeSettings);
    petalGeo.center();
    petalGeo.translate(0, 1, 0);

    const petalMat = new THREE.MeshPhysicalMaterial({
        color: 0xff66aa,
        emissive: 0xff0055,
        emissiveIntensity: 0.4,
        roughness: 0.1,
        transmission: 0.9,
        thickness: 0.1,
        side: THREE.DoubleSide,
    });

    for (let i = 0; i < 6; i++) {
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.rotation.y = (i / 6) * Math.PI * 2;
        petal.rotation.x = Math.PI / 6;
        group.add(petal);
    }
    
    // Stem
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x22aa22, emissive: 0x005500, emissiveIntensity: 0.5 });
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.05, 3, 8);
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = -1.5;
    group.add(stem);
    
    group.scale.set(0.6, 0.6, 0.6);
    return group;
}

function createDragon() {
    const group = new THREE.Group();
    const dragonMat = new THREE.MeshPhysicalMaterial({
        color: 0xcc0000,
        emissive: 0x550000,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.8,
        clearcoat: 1.0,
        side: THREE.DoubleSide
    });

    // Body
    const points = [];
    for (let i = 0; i <= 64; i++) {
        const t = i / 64;
        const x = Math.sin(t * Math.PI * 2) * 1.5;
        const y = Math.cos(t * Math.PI * 4) * 0.5;
        const z = t * 4 - 2;
        points.push(new THREE.Vector3(x, y, z));
    }
    const path = new THREE.CatmullRomCurve3(points);
    const bodyGeo = new THREE.TubeGeometry(path, 64, 0.15, 8, false);
    const body = new THREE.Mesh(bodyGeo, dragonMat);
    group.add(body);
    
    // Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(2, 1);
    wingShape.lineTo(2.5, -0.5);
    wingShape.lineTo(1.5, -1);
    wingShape.lineTo(0.5, -0.5);
    wingShape.lineTo(0, 0);
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    
    const leftWing = new THREE.Mesh(wingGeo, dragonMat);
    leftWing.position.set(0, 0.5, 0);
    leftWing.rotation.x = -Math.PI / 4;
    leftWing.rotation.y = Math.PI / 6;
    
    const rightWing = new THREE.Mesh(wingGeo, dragonMat);
    rightWing.position.set(0, 0.5, 0);
    rightWing.rotation.x = Math.PI / 4 + Math.PI;
    rightWing.rotation.y = -Math.PI / 6;
    rightWing.scale.x = -1;
    
    group.add(leftWing);
    group.add(rightWing);

    // Head
    const headGeo = new THREE.ConeGeometry(0.25, 0.8, 8);
    const head = new THREE.Mesh(headGeo, dragonMat);
    head.position.set(0, 0.5, 2.2);
    head.rotation.x = Math.PI / 2;
    group.add(head);

    group.scale.set(0.5, 0.5, 0.5);
    return group;
}

function createButterfly() {
    const butterflyRoot = new THREE.Group();
    let mixer: THREE.AnimationMixer | null = null;
    let lastTime = 0;
    
    const loader = new GLTFLoader();
    loader.load('/animated_butterfly.glb', (gltf) => {
        const model = gltf.scene;
        
        // Auto-scale and center the model
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        if (maxDim > 0) {
            const scale = 1.5 / maxDim;
            model.scale.set(scale, scale, scale);
        }

        const center = box.getCenter(new THREE.Vector3());
        // Apply the same scale to center to offset correctly
        model.position.sub(center.multiplyScalar(1.5 / maxDim));
        
        // Elevate slightly so it floats on the finger
        model.position.y += 0.5;

        // Traverse to update materials (optional: make it a bit brighter)
        model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                if (mesh.material) {
                   mesh.castShadow = true;
                   mesh.receiveShadow = true;
                }
            }
        });
        
        butterflyRoot.add(model);
        
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
        }
    }, undefined, (error) => {
        console.error('Error loading butterfly model:', error);
    });

    butterflyRoot.userData.update = (time: number) => {
        if (mixer) {
            if (lastTime === 0) lastTime = time;
            const delta = (time - lastTime) / 1000;
            mixer.update(delta);
            lastTime = time;
        }
    };
    return butterflyRoot;
}

function createTree() {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 2.5, 8), trunkMat);
    trunk.position.y = -1.25;
    group.add(trunk);
    
    const leafMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x228b22, 
        emissive: 0x003300,
        emissiveIntensity: 0.4,
        roughness: 0.8, 
        transmission: 0.5,
        transparent: true,
        opacity: 0.9 
    });
    
    const positions = [
        [0, 0.5, 0],
        [-0.5, 0, 0.5],
        [0.5, 0, 0.5],
        [0, 0, -0.6],
        [0, 1.2, 0],
        [-0.8, 0.5, -0.2],
        [0.8, 0.5, -0.2]
    ];
    
    positions.forEach(pos => {
        const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8), leafMat);
        leaves.position.set(pos[0], pos[1], pos[2]);
        group.add(leaves);
    });
    
    group.scale.set(0.6, 0.6, 0.6);
    return group;
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const isDrawModeRef = useRef(false);
  const lastDrawPointRef = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    isDrawModeRef.current = isDrawMode;
    if (activeMeshRef.current) {
        activeMeshRef.current.visible = !isDrawMode;
    }
  }, [isDrawMode]);

  const toggleCamera = async () => {
    if (isCameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
    } else {
      setIsCameraActive(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((resolve) => {
            videoRef.current!.onloadedmetadata = () => {
              videoRef.current!.play();
              resolve(true);
            };
          });
        }
      } catch (err) {
        console.error("Webcam error:", err);
      }
    }
  };

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const downloadSnapshot = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = '#000510';
    ctx.fillRect(0, 0, width, height);

    // Optional: Draw video frame if camera is active
    if (isCameraActive && videoRef.current) {
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        ctx.restore();
    }

    // Draw 3D Canvas
    if (canvasRef.current) {
        ctx.drawImage(canvasRef.current, 0, 0, width, height);
    }

    // Draw drawing layer
    if (drawCanvasRef.current) {
        ctx.drawImage(drawCanvasRef.current, 0, 0, width, height);
    }
    
    // Draw Hand tracking skeleton
    if (canvas2dRef.current) {
        ctx.drawImage(canvas2dRef.current, 0, 0, width, height);
    }

    // Export to PNG
    const link = document.createElement('a');
    link.download = `JARVIS_Export_${Date.now()}.png`;
    link.href = offscreen.toDataURL('image/png', 1.0);
    link.click();
  };

  // State refs for Three.js and MediaPipe to avoid closure issues in loop
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const activeMeshRef = useRef<THREE.Object3D | null>(null);
  const boxHelperRef = useRef<THREE.BoxHelper | null>(null);
  const pointLightRef = useRef<THREE.PointLight | null>(null);

  const shapesRef = useRef<THREE.Object3D[]>([]);
  const currentShapeIdxRef = useRef(0);
  const lastSwitchTimeRef = useRef(0);
  const wasRightPinchingRef = useRef(false);

  // Particles
  const particlesRef = useRef<THREE.Points | null>(null);
  const particleDataRef = useRef<{ velocities: THREE.Vector3[], life: number[] }>({ velocities: [], life: [] });

  useEffect(() => {
    let animationFrameId: number;
    let handLandmarker: HandLandmarker | null = null;
    let lastVideoTime = -1;

    const init = async () => {
      if (!videoRef.current || !canvasRef.current || !containerRef.current) return;

      // 1. Setup Three.js
      setLoadingText('Setting up 3D environment...');
      const width = window.innerWidth;
      const height = window.innerHeight;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.z = 10;
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererRef.current = renderer;

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const pointLight = new THREE.PointLight(0x00d2ff, 2, 20);
      pointLight.position.set(0, 0, 5);
      scene.add(pointLight);
      pointLightRef.current = pointLight;

      const fillLight = new THREE.DirectionalLight(0xffb703, 1);
      fillLight.position.set(5, 5, 5);
      scene.add(fillLight);

      // Shapes
      const lily = createLily();
      const dragon = createDragon();
      const tree = createTree();
      const butterflyRoot = createButterfly();

      shapesRef.current = [lily, dragon, tree, butterflyRoot];

      activeMeshRef.current = shapesRef.current[0];
      scene.add(activeMeshRef.current);

      // Box Helper
      const boxHelper = new THREE.BoxHelper(activeMeshRef.current, 0xffffff);
      boxHelper.visible = false;
      scene.add(boxHelper);
      boxHelperRef.current = boxHelper;

      // Particles (Burst effect)
      const particleGeo = new THREE.BufferGeometry();
      const particleCount = 100;
      const posArray = new Float32Array(particleCount * 3);
      for(let i=0; i<particleCount * 3; i++) posArray[i] = 1000; // start off-screen
      particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const particleMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.8 });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);
      particlesRef.current = particles;

      particleDataRef.current.velocities = Array(particleCount).fill(0).map(() => new THREE.Vector3());
      particleDataRef.current.life = Array(particleCount).fill(0);

      // 2. Setup Camera
      setLoadingText('Requesting webcam access...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 } });
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current!.play();
            resolve(true);
          };
        });
      } catch (err) {
        console.error("Webcam error:", err);
        setLoadingText('Camera access denied or unavailable.');
        return;
      }

      // 3. Setup MediaPipe
      setLoadingText('Loading AI models (MediaPipe Tasks Vision)...');
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
        );

        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.2,
          minHandPresenceConfidence: 0.2,
          minTrackingConfidence: 0.2,
        });

        setIsLoading(false);

        // Animation Loop
        const tick = () => {
          if (!videoRef.current || !sceneRef.current || !cameraRef.current || !rendererRef.current) return;

          // Process MediaPipe
          const video = videoRef.current;
          if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            const videoTime = video.currentTime;
            if (videoTime !== lastVideoTime && handLandmarker) {
              lastVideoTime = videoTime;
              const results = handLandmarker.detectForVideo(video, performance.now());
              handleTracking(results);
              drawSkeleton(results);
            }
          }

          // Animate Idle active mesh slightly
          if (activeMeshRef.current && boxHelperRef.current && !boxHelperRef.current.visible) {
              activeMeshRef.current.rotation.y += 0.005;
              activeMeshRef.current.rotation.x += 0.002;
          }

          // Trigger custom animations per shape (e.g. butterfly wings)
          if (activeMeshRef.current && activeMeshRef.current.userData.update) {
              activeMeshRef.current.userData.update(performance.now());
          }

          // Update box helper bounds
          if (boxHelperRef.current && activeMeshRef.current) {
              boxHelperRef.current.update();
          }

          // Update Particles
          updateParticles();

          rendererRef.current.render(sceneRef.current, cameraRef.current);
          animationFrameId = requestAnimationFrame(tick);
        };

        tick();
      } catch (err) {
        console.error("MediaPipe initialization error:", err);
        setLoadingText('Failed to load AI models. Please ensure your connection is stable.');
      }
    };

    init();

    // Resize handler
    const handleResize = () => {
        if (!cameraRef.current || !rendererRef.current) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
        if (canvas2dRef.current) {
            canvas2dRef.current.width = w;
            canvas2dRef.current.height = h;
        }
        if (drawCanvasRef.current) {
            const ctx = drawCanvasRef.current.getContext('2d');
            const data = ctx?.getImageData(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
            drawCanvasRef.current.width = w;
            drawCanvasRef.current.height = h;
            if (ctx && data) {
                ctx.putImageData(data, 0, 0);
            }
        }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (handLandmarker) handLandmarker.close();
      if (rendererRef.current) {
          rendererRef.current.dispose();
      }
    };
  }, []);

   const handleTracking = (results: any) => {
       if (!sceneRef.current || !cameraRef.current || !activeMeshRef.current || !boxHelperRef.current) return;

       let isRightPinchingNow = false;
       let isLeftPinchingNow = false;
       let rightIndexTipPos: {x: number, y: number} | null = null;
       let rightPinchMidPos: {x: number, y: number} | null = null;

       if (results.landmarks && results.landmarks.length > 0) {
           results.landmarks.forEach((landmarks: any, index: number) => {
               // MediaPipe handedness is relative to the *image*.
               // Because we process the unmirrored image, a physical right hand is on the left side of the image,
               // and MediaPipe correctly identifies it as "Right".
               const rawClassification = results.handednesses[index][0].categoryName; const classification = rawClassification === "Left" ? "Right" : "Left";

               const thumbTip = landmarks[4];
               const indexTip = landmarks[8];
               const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
               const isPinching = pinchDist < 0.05;

               if (classification === 'Right') {
                   rightIndexTipPos = { x: indexTip.x, y: indexTip.y };
                   if (isPinching) {
                       isRightPinchingNow = true;
                       rightPinchMidPos = { x: (thumbTip.x + indexTip.x) / 2, y: (thumbTip.y + indexTip.y) / 2 };
                   }
               } else if (classification === 'Left') {
                   if (isPinching) {
                       isLeftPinchingNow = true;
                   }
               }
           });
       }

       if (isDrawModeRef.current) {
           // In draw mode, if left hand is pinching, we draw using right index finger tip.
           if (isLeftPinchingNow && rightIndexTipPos) {
               const ctx = drawCanvasRef.current?.getContext('2d');
               if (ctx && drawCanvasRef.current) {
                   const w = drawCanvasRef.current.width;
                   const h = drawCanvasRef.current.height;
                   const px = rightIndexTipPos.x * w;
                   const py = rightIndexTipPos.y * h;

                   if (!lastDrawPointRef.current) {
                       lastDrawPointRef.current = {x: px, y: py};
                   } else {
                       ctx.beginPath();
                       ctx.moveTo(lastDrawPointRef.current.x, lastDrawPointRef.current.y);
                       ctx.lineTo(px, py);
                       ctx.strokeStyle = '#06b6d4'; // Cyan color for drawing
                       ctx.lineWidth = 6;
                       ctx.lineCap = 'round';
                       ctx.lineJoin = 'round';
                       ctx.shadowColor = '#06b6d4';
                       ctx.shadowBlur = 12;
                       ctx.stroke();
                       lastDrawPointRef.current = {x: px, y: py};
                   }
               }
           } else {
               lastDrawPointRef.current = null;
           }
       } else {
           // Move mode
           if (isRightPinchingNow && rightPinchMidPos) {
               const targetPos = unprojectCoordinate(rightPinchMidPos.x, rightPinchMidPos.y, 0); // target Z = 0
               activeMeshRef.current!.position.lerp(targetPos, 0.4);

               activeMeshRef.current!.rotation.y += 0.05;
               activeMeshRef.current!.rotation.x += 0.05;

               if (pointLightRef.current) {
                   pointLightRef.current.position.lerp(new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z + 2), 0.4);
               }

               if (!wasRightPinchingRef.current) {
                   triggerBurst(targetPos);
               }
           }
           
           if (isLeftPinchingNow) {
               // Cycle shapes
               const now = performance.now();
               if (now - lastSwitchTimeRef.current > 1000) {
                   lastSwitchTimeRef.current = now;
                   switchShape();
               }
           }
       }

       boxHelperRef.current.visible = isRightPinchingNow && !isDrawModeRef.current;
       wasRightPinchingRef.current = isRightPinchingNow;
  };

  const drawSkeleton = (results: any) => {
      const canvas = canvas2dRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (results.landmarks && results.landmarks.length > 0) {
          results.landmarks.forEach((landmarks: any, index: number) => {
              const rawClassification = results.handednesses[index][0].categoryName; const classification = rawClassification === "Left" ? "Right" : "Left";
              const isRight = classification === 'Right';
              const color = isRight ? '#f59e0b' : '#06b6d4'; // Amber for right, Cyan for left
              
              ctx.save();
              ctx.strokeStyle = color;
              ctx.lineWidth = 2;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              
              // Glowing effect
              ctx.shadowColor = color;
              ctx.shadowBlur = 10;

              // Draw connections
              const connections = [
                  [0, 1], [1, 2], [2, 3], [3, 4],
                  [0, 5], [5, 6], [6, 7], [7, 8],
                  [5, 9], [9, 10], [10, 11], [11, 12],
                  [9, 13], [13, 14], [14, 15], [15, 16],
                  [13, 17], [17, 18], [18, 19], [19, 20],
                  [0, 17]
              ];

              ctx.beginPath();
              connections.forEach(([p1, p2]) => {
                  const l1 = landmarks[p1];
                  const l2 = landmarks[p2];
                  ctx.moveTo(l1.x * w, l1.y * h);
                  ctx.lineTo(l2.x * w, l2.y * h);
              });
              ctx.stroke();

              // Draw joints
              ctx.fillStyle = '#ffffff';
              ctx.shadowBlur = 8;
              ctx.shadowColor = '#ffffff';
              landmarks.forEach((lm: any) => {
                  ctx.beginPath();
                  ctx.arc(lm.x * w, lm.y * h, 3, 0, 2 * Math.PI);
                  ctx.fill();
              });

              ctx.restore();
          });
      }
  };

  const unprojectCoordinate = (x: number, y: number, targetZ: number) => {
      if (!cameraRef.current) return new THREE.Vector3();
      // Mirror X because of CSS scaleX(-1) on the video element.
      // Left on physical camera (x near 0) appears on Right of screen (nx near 1).
      const nx = ((1 - x) * 2) - 1;
      const ny = -(y * 2) + 1;
      const vec = new THREE.Vector3(nx, ny, 0.5);
      vec.unproject(cameraRef.current);
      vec.sub(cameraRef.current.position).normalize();
      const distance = (targetZ - cameraRef.current.position.z) / vec.z;
      return new THREE.Vector3().copy(cameraRef.current.position).add(vec.multiplyScalar(distance));
  };

  const switchShape = () => {
      if (!sceneRef.current || !activeMeshRef.current) return;
      sceneRef.current.remove(activeMeshRef.current);

      currentShapeIdxRef.current = (currentShapeIdxRef.current + 1) % shapesRef.current.length;
      activeMeshRef.current = shapesRef.current[currentShapeIdxRef.current];
      
      // Reset position/rotation to center
      activeMeshRef.current.position.set(0, 0, 0);
      activeMeshRef.current.rotation.set(0, 0, 0);
      activeMeshRef.current.visible = !isDrawModeRef.current;

      sceneRef.current.add(activeMeshRef.current);

      if (boxHelperRef.current) {
          boxHelperRef.current.setFromObject(activeMeshRef.current);
      }

      triggerBurst(activeMeshRef.current.position);
  };

  const triggerBurst = (origin: THREE.Vector3) => {
      if (!particlesRef.current) return;
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const count = positions.length / 3;

      for (let i = 0; i < count; i++) {
          positions[i * 3] = origin.x + (Math.random() - 0.5) * 1.5;
          positions[i * 3 + 1] = origin.y + (Math.random() - 0.5) * 1.5;
          positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 1.5;

          particleDataRef.current.velocities[i].set(
              (Math.random() - 0.5) * 0.4,
              (Math.random() - 0.5) * 0.4,
              (Math.random() - 0.5) * 0.4
          );
          particleDataRef.current.life[i] = 1.0;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
  };

  const updateParticles = () => {
      if (!particlesRef.current) return;
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const count = positions.length / 3;
      let updated = false;

      for (let i = 0; i < count; i++) {
          if (particleDataRef.current.life[i] > 0) {
              particleDataRef.current.life[i] -= 0.03;
              positions[i * 3] += particleDataRef.current.velocities[i].x;
              positions[i * 3 + 1] += particleDataRef.current.velocities[i].y;
              positions[i * 3 + 2] += particleDataRef.current.velocities[i].z;
              updated = true;
          } else {
              // Hide particle off-screen
              positions[i * 3] = 1000;
          }
      }
      if (updated) {
          particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-[#000510] text-[#a0a0a0] font-sans selection:bg-cyan-500/30 border border-[#001122]">
      {/* Video Background */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover -scale-x-100 z-0 transition-opacity duration-500 ${isCameraActive ? 'opacity-30' : 'opacity-0'}`}
        playsInline
        muted
      />

      {/* Grid Overlay for aesthetic */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-[5]" style={{ backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      
      {/* JARVIS Core HUD element */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[6] opacity-30">
        <div className="w-[600px] h-[600px] border border-cyan-500/20 rounded-full animate-[spin_40s_linear_infinite] relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-cyan-500/50 rounded-full shadow-[0_0_15px_#06b6d4]"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-cyan-500/50 rounded-full shadow-[0_0_15px_#06b6d4]"></div>
        </div>
        <div className="absolute w-[450px] h-[450px] border-2 border-dashed border-cyan-500/30 rounded-full animate-[spin_30s_linear_reverse_infinite]"></div>
        <div className="absolute w-[300px] h-[300px] border border-amber-500/20 rounded-full animate-[spin_20s_linear_infinite] relative">
          <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-1 bg-amber-500/50"></div>
          <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-1 bg-amber-500/50"></div>
        </div>
      </div>

      <div className="absolute bottom-0 w-full h-[300px] pointer-events-none z-[5]" style={{ background: 'linear-gradient(to top, #001 0%, transparent 100%)', transform: 'perspective(500px) rotateX(60deg)', borderTop: '1px solid #06b6d420' }}>
         <div className="w-full h-full" style={{ backgroundImage: 'linear-gradient(#06b6d430 1px, transparent 1px), linear-gradient(90deg, #06b6d430 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* Header Overlay */}
      <header className="absolute top-0 left-0 w-full h-16 border-b border-cyan-500/20 flex items-center justify-between px-8 bg-[#000510]/80 backdrop-blur-md z-40 shadow-[0_4px_30px_rgba(6,182,212,0.1)]">
        <div className="flex items-center gap-4 pointer-events-none">
          <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_12px_#06b6d4] animate-pulse"></div>
          <h1 className="text-xs font-bold tracking-[0.3em] uppercase text-cyan-50">J.A.R.V.I.S. <span className="text-cyan-500">MK.42</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex gap-8 font-mono text-[10px] tracking-widest text-cyan-500/70 mr-4">
            <div className="flex flex-col"><span className="opacity-50">SYS.TEMP</span><span>38.2°C</span></div>
            <div className="flex flex-col"><span className="opacity-50">CORE.MEM</span><span>42 TB</span></div>
          </div>
          <button 
            onClick={downloadSnapshot}
            className="px-4 py-1.5 rounded border bg-purple-500/20 border-purple-500/50 text-purple-400 text-[10px] uppercase font-bold tracking-widest transition-all hover:bg-white/10 hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
          >
            CAPTURE
          </button>
          <button 
            onClick={toggleCamera}
            className={`px-4 py-1.5 rounded border ${isCameraActive ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-red-500/20 border-red-500/50 text-red-400'} text-[10px] uppercase font-bold tracking-widest transition-all hover:bg-white/10 hover:scale-105 active:scale-95`}
          >
            {isCameraActive ? 'OPTICS ON' : 'OPTICS OFF'}
          </button>
        </div>
      </header>

      {/* 2D Drawing Canvas */}
      <canvas
        ref={drawCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[7] -scale-x-100"
      />

      {/* 2D Canvas for Hand Skeleton */}
      <canvas
        ref={canvas2dRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[8] -scale-x-100"
      />

      {/* Three.js Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#000510]/95 backdrop-blur-md">
          <div className="w-16 h-16 border-2 border-cyan-500/20 border-t-cyan-500 border-b-cyan-500 rounded-full animate-spin mb-6 shadow-[0_0_30px_rgba(6,182,212,0.4)]" />
          <p className="text-xs font-mono tracking-[0.3em] text-cyan-400 uppercase animate-pulse">{loadingText}</p>
        </div>
      )}

      {/* Instructions Overlay */}
      {!isLoading && (
        <aside className="absolute left-8 top-24 w-64 z-40 space-y-6 transition-opacity hover:opacity-40 duration-300 pointer-events-none">
          <div className="bg-[#000510]/50 backdrop-blur-xl border border-cyan-500/20 p-5 rounded-sm shadow-[0_0_20px_rgba(6,182,212,0.1)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
            <h2 className="text-[10px] uppercase tracking-widest text-cyan-400 mb-4 font-bold flex items-center gap-2"><span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span> Left Hand Control</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-cyan-50 font-mono tracking-widest">{isDrawMode ? "DRAW_TRIGGER" : "ASSET_SW"}</span>
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[9px] rounded-full uppercase border border-cyan-500/30">Active</span>
              </div>
              <div className="p-3 border border-cyan-500/20 bg-cyan-500/10 rounded flex justify-between items-center shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]">
                 <span className="text-[10px] text-cyan-200 font-mono tracking-widest uppercase">{isDrawMode ? "Pinch to Draw" : "Pinch to Cycle"}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-cyan-500/20">
                <p className="text-[9px] leading-relaxed text-cyan-500/60 font-mono tracking-wide uppercase">&gt;&gt; {isDrawMode ? "Hold left pinch to draw with right index finger tip." : "Cycle through physical primitives in local space."}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-[#000510]/50 backdrop-blur-xl border border-amber-500/20 p-5 rounded-sm shadow-[0_0_20px_rgba(245,158,11,0.1)] pointer-events-auto relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
            <h2 className="text-[10px] uppercase tracking-widest text-amber-400 mb-4 font-bold flex items-center gap-2"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> Right Hand Control</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-amber-50 font-mono tracking-widest">{isDrawMode ? "LASER_STYLUS" : "MANIPULATION"}</span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] rounded-full uppercase border border-amber-500/30">Active</span>
              </div>
              
              <div className="flex gap-2">
                 <button
                   onClick={() => setIsDrawMode(false)}
                   className={`flex-1 py-2 rounded border ${!isDrawMode ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/10 text-white/40'} text-[9px] uppercase font-bold tracking-widest transition-all hover:bg-amber-500/10`}
                 >
                   Move
                 </button>
                 <button
                   onClick={() => setIsDrawMode(true)}
                   className={`flex-1 py-2 rounded border ${isDrawMode ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/10 text-white/40'} text-[9px] uppercase font-bold tracking-widest transition-all hover:bg-amber-500/10`}
                 >
                   Draw
                 </button>
              </div>
              
              {isDrawMode && (
                <button
                  onClick={clearDrawing}
                  className="w-full py-2 rounded border bg-red-500/10 border-red-500/30 text-red-400 text-[9px] uppercase font-bold tracking-widest transition-all hover:bg-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                >
                  Purge Canvas
                </button>
              )}

              <div className="p-3 border border-amber-500/30 bg-amber-500/5 rounded flex justify-between items-center">
                 <span className="text-[10px] text-white/80 font-mono">
                    {isDrawMode ? 'Pinch & Drag to Draw' : 'Pinch & Drag to Move'}
                 </span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[9px] leading-relaxed text-white/40 italic">
                    {isDrawMode ? 'Pinch right hand thumb/index to draw glowing trails in the air.' : 'Pinch right hand thumb/index to move and rotate the active geometry.'}
                </p>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
