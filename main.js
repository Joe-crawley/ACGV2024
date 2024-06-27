import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CCDIKSolver,CCDIKHelper } from 'three/addons/animation/CCDIKSolver.js';
import Stats from 'stats.js'



const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)
const tick = () =>
{
    stats.begin()

    // ...

    stats.end()
}


function choose(choices) {
    var index = Math.floor(Math.random() * choices.length);
    return choices[index];
  }


function SkeletalBones(BoneHeight,BoneCount,radius){    //Function to create skinned mesh of cylinder with skin weights for deformation

    const LimbHeight = BoneHeight * BoneCount
    const sizing = {
        BoneHeight : BoneHeight,
        BoneCount : BoneCount,
        LimbHeight : LimbHeight,
        HalfLimbHeight : LimbHeight * 0.5
    };
    const geometry = new THREE.CylinderGeometry(radius,radius,sizing.LimbHeight,8,sizing.BoneCount * 3,true)
    const geomPosition = geometry.attributes.position;
    const vertex = new THREE.Vector3()
    //Update geometry weights for skeletal deformation (from three.js docs)
    const skinIndicies = [];
    const skinWeights = [];

    for (let i = 0; i < geomPosition.count; i++){
        vertex.fromBufferAttribute(geomPosition,i);
        const y = (vertex.y + sizing.HalfLimbHeight);

        const skinIndex = Math.floor(y / sizing.BoneHeight);
        const skinWeight = (y % sizing.BoneHeight)/ sizing.BoneHeight;
        skinIndicies.push(skinIndex,skinIndex+1,0,0);
        skinWeights.push(1-skinWeight,skinWeight,0,0);


    }

    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndicies,4));
    geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeights,4));


    //Time for Bones
    //IK RootBone
    const rootBone = new THREE.Bone();
    rootBone.name = 'root';
    rootBone.position.y = -sizing.HalfLimbHeight;
    
    const bones = [];
    bones.push(rootBone);
    let prevBone = new THREE.Bone();
    rootBone.add(prevBone);
    bones.push(prevBone);
    //prevBone.position.y = - sizing.HalfLimbHeight;
    prevBone.position.y = 0;
    for (let i = 1; i < sizing.BoneCount;i++){
        const bone = new THREE.Bone();
        bone.position.y = sizing.BoneHeight;
        bones.push(bone);
        prevBone.add(bone);
        prevBone = bone;
    }
    //For Inverse kinematics
    const targetBone = new THREE.Bone();
    targetBone.name = 'target';
    targetBone.position.y = sizing.LimbHeight + sizing.BoneHeight;

    //Mesh time
    const LimbMaterial = new THREE.MeshPhongMaterial({color :'orange',emissive : 'orange', side: THREE.DoubleSide,flatShading:true});

    const LimbMesh = new THREE.SkinnedMesh(geometry,LimbMaterial);

    const skeleton = new THREE.Skeleton(bones);

    LimbMesh.bind(skeleton);
    
    LimbMesh.scale.multiplyScalar(1);
    
    LimbMesh.add(bones[0]);
    LimbMesh.bind(skeleton);
    


    return LimbMesh
}
// Function to create a human model with skeleton arms and legs with ik solver
function CreatePeopleNew(){
    const human = new THREE.Group();
    const LeftArm = SkeletalBones(1,8,0.6);

    
    //LeftArm positioning
    LeftArm.scale.setScalar(1);
    LeftArm.name = 'LeftArm';
    LeftArm.skeleton.bones[0].rotation.x = Math.PI/2;
    LeftArm.skeleton.bones[0].rotation.z = Math.PI/2;
    LeftArm.position.x = 1;
    LeftArm.position.y += 5.4;
    LeftArm.rotation.y = Math.PI;
    const RightArm = SkeletalBones(1,8,0.6);
    RightArm.name = 'RightArm';

    //RightArm Positioning
    RightArm.skeleton.bones[0].rotation.x = -Math.PI/2;
    RightArm.skeleton.bones[0].rotation.z = -Math.PI/2;
    RightArm.position.x = -1;
    RightArm.position.y += 5.4;
    RightArm.rotation.y = Math.PI;
    //LeftLeg
    const LeftLeg = SkeletalBones(1,4,0.6);
    LeftLeg.name = 'LeftLeg';
    LeftLeg.skeleton.bones[0].rotation.y = Math.PI /2;
    LeftLeg.position.y -= 6.1;
    LeftLeg.position.x = 1.2;
    //RightLeg
    const RightLeg = SkeletalBones(1,4,0.6);
    RightLeg.name = 'RightLeg';
    RightLeg.skeleton.bones[0].rotation.y = Math.PI / 2;
    RightLeg.position.y -= 6.1;
    RightLeg.position.x = -1.2;
    //create body
    const bodyMaterial = new THREE.MeshPhongMaterial({color :'red',emissive : 'red', side: THREE.DoubleSide,flatShading:true})
    const bodyGeometry = new THREE.CylinderGeometry(2,2,8,4,12,true);
    const body = new THREE.Mesh(bodyGeometry,bodyMaterial);
    //create head
    const headMaterial = new THREE.MeshPhongMaterial({color:'green',emissive:'blue',side:THREE.DoubleSide,flatShading:true});
    const headGeometry = new THREE.SphereGeometry(2,24,24);
    const head = new THREE.Mesh(headGeometry,headMaterial);
    head.position.y = 100;
    human.add(head);
    body.position.y = -4.9;
    head.add(body);
    body.add(LeftArm);
    body.add(RightArm);
    body.add(LeftLeg);
    body.add(RightLeg);
    head.scale.setScalar(2);
    LeftLeg.rotation.x = Math.PI;
    RightLeg.rotation.x = Math.PI;

    human.traverse(function(node){
        if (node instanceof THREE.Mesh){
            node.castShadow = true;
        }
        
    })
    const armIKS = [{target:8,effector:7,links:[{index:1},{index:2},{index:3},{index:4},{index:6},{index:4}]}]
    const ArmIKSolvers = [new CCDIKSolver(LeftArm,armIKS),new CCDIKSolver(RightArm,armIKS)];




    
    return [human,ArmIKSolvers];

}
var legRotation = 0;
//function to animate walking by rotating bones and moving model !
function animateWalking(leg1,leg2,human,walkSpeed){

    leg1.skeleton.bones[1].rotation.z = Math.sin(legRotation) * 0.2;
    leg1.skeleton.bones[2].rotation.z = Math.sin(legRotation) * 0.2;
    leg1.skeleton.bones[3].rotation.z = Math.sin(legRotation) * 0.4;
    
    leg2.skeleton.bones[1].rotation.z = -Math.sin(legRotation) * 0.2;
    leg2.skeleton.bones[2].rotation.z = -Math.sin(legRotation) * 0.2;
    leg2.skeleton.bones[3].rotation.z = -Math.sin(legRotation) * 0.4;
    
    human.position.x -= 0.01 * walkSpeed;
    legRotation += 0.01 * walkSpeed;
}
//function to enable / disable anti aliasing
function ToggleAA(){
    const Newantialias = !renderer.antialias;
    renderer.dispose();
    renderer = new THREE.WebGLRenderer({antialias:Newantialias,toneMapping:THREE.ACESFilmicToneMapping,maxLights : 12});
    renderer.setPixelRatio(window.devicePixelRatio);
    //renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;

    renderer.toneMappingExposure = 1;
    //renderer.shadowMap.type = THREE.VSMShadowMap;
    //renderer.shadowMap.renderSingleSided = false;
    renderer.setSize(window.innerWidth,window.innerHeight);
    document.body.replaceChild(renderer.domElement,document.body.getElementsByTagName('canvas')[0]);
}
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55,window.innerWidth / window.innerHeight,1,3000000)
camera.position.set(-300,100,-300);
const renderer = new THREE.WebGLRenderer({antialias:true,toneMapping:THREE.ACESFilmicToneMapping,maxLights : 12});
renderer.setPixelRatio(window.devicePixelRatio);

renderer.shadowMap.enabled = true;

renderer.toneMappingExposure = 1;

renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera,renderer.domElement)
controls.addEventListener('change',renderer);
const AAButton = document.getElementById('AntiAliasing')
AAButton.addEventListener('click',ToggleAA);

let materialArray = [];

const front = new THREE.TextureLoader().load('NewSkyBox/Daylight Box_Front.bmp')

const back = new THREE.TextureLoader().load('NewSkyBox/Daylight Box_Back.bmp')
const top = new THREE.TextureLoader().load('NewSkyBox/Daylight Box_Top.bmp')
const bottom = new THREE.TextureLoader().load('NewSkyBox/Daylight Box_Bottom.bmp')
const right = new THREE.TextureLoader().load('NewSkyBox/Daylight Box_Right.bmp')
const left = new THREE.TextureLoader().load('NewSkyBox/Daylight Box_Left.bmp')
front.generateMipmaps = true;
back.generateMipmaps = true;
top.generateMipmaps = true;
bottom.generateMipmaps = true;
right.generateMipmaps = true;
left.generateMipmaps = true;
materialArray.push(new THREE.MeshBasicMaterial({map: right}));
materialArray.push(new THREE.MeshBasicMaterial({map: left}));
materialArray.push(new THREE.MeshBasicMaterial({map: top}));
materialArray.push(new THREE.MeshBasicMaterial({map: bottom}));
materialArray.push(new THREE.MeshBasicMaterial({map: front}));
materialArray.push(new THREE.MeshBasicMaterial({map: back}));

for(let i = 0;i<6;i++)
    materialArray[i].side = THREE.BackSide;
const skyBoxGeometry = new THREE.BoxGeometry(1000,1000,1000,600,600,60);
const skybox = new THREE.Mesh(skyBoxGeometry,materialArray);





//Function returns displacement map image, with 'noise' generated from parameteric surface (bezier)
function GetDisplacementMap(amplitude){
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const size = 101;

    canvas.width = size;
    canvas.height = size;

    const image = context.getImageData(0,0,size,size);
    const data = image.data;
    const Bezier = new THREE.CubicBezierCurve3(new THREE.Vector3(Math.random(),Math.random(),Math.random()).normalize(),new THREE.Vector3(Math.random(),Math.random(),Math.random()).normalize(),new THREE.Vector3(Math.random(),Math.random(),Math.random()).normalize(),new THREE.Vector3(Math.random(),Math.random(),Math.random()).normalize(),new THREE.Vector3(Math.random(),Math.random(),Math.random()).normalize())
    

    for (let i = 0; i < size;i++){
        
        for (let j = 0; j < size; j++){
            const t = (((size**2) - (i*j)) - 1);
        
            
            let displacement;
            if(j % 2 == 0){
                displacement =  Math.abs((Bezier.getPoint(t).x * amplitude) % 255); // % 255 ensures values are within white to black range
               
            }
            else{
                displacement = Math.abs((Bezier.getPoint(t).y * amplitude) % 255);
                
            }
            
        
            const index = (i * size + j) * 4;
            
            const colourValue = Math.floor((displacement + 1));
            
            data[index] = data[index + 1] = data[index + 2] = colourValue;
            data[index + 3] = 255;
        }
    }

    context.putImageData(image,0,0);  //return as image
   
    return canvas.toDataURL();
    //const size 
}
const displacementMap = new THREE.TextureLoader().load(GetDisplacementMap(0.01));
displacementMap.wrapS = THREE.RepeatWrapping;
displacementMap.wrapT = THREE.RepeatWrapping;
displacementMap.repeat.set(2,2);

const groundPlaneTexture = new THREE.TextureLoader().load('CobbleTexture/cobblestone_03_diff_4k.jpg');
groundPlaneTexture.generateMipmaps = true;
//groundPlaneTexture.anisotropy = 2;
groundPlaneTexture.recieveShadow = true;
groundPlaneTexture.castShadow = true;
groundPlaneTexture.wrapS = THREE.RepeatWrapping;
groundPlaneTexture.wrapT = THREE.RepeatWrapping;

groundPlaneTexture.repeat.set(32,32);


const GroundMat = new THREE.MeshPhongMaterial({map:groundPlaneTexture,side:THREE.FrontSide,shadowSide:THREE.BackSide,displacementMap:displacementMap});

GroundMat.displacementScale = 4.4;
;
const GroundPlane = new THREE.PlaneGeometry(1000,1000,100,100);


const Plane = new THREE.Mesh(GroundPlane,GroundMat);

Plane.castShadow = true;
Plane.receiveShadow = true;

Plane.rotateX(-Math.PI /2);
Plane.position.y = 0;
Plane.needsUpdate = true;

scene.add(Plane);

const maxAniso = renderer.capabilities.getMaxAnisotropy();

//Adjusts the filtering used on materials based on their distance from the camera
function UpdateFiltering(mesh){
    const distance = mesh.position.distanceTo(camera.position)
    mesh.traverse(function(node){
        if (node instanceof THREE.Mesh && node.material.map !== null){
            if (distance >= 500){
                mesh.material.map.minFilter = THREE.LinearMipMapNearestFilter;
                mesh.material.map.magFilter = THREE.LinearFilter;
                mesh.material.map.anisotropy = maxAniso / 4;
                
            }
            else{
                if (distance >= 250){
                    mesh.material.map.minFilter = THREE.LinearMipMapLinearFilter;
                    mesh.material.map.magFilter = THREE.LinearFilter;
                    mesh.material.map.anisotropy = maxAniso / 2;
                }
                else{
                    if (distance < 100){
                        mesh.material.map.minFilter = THREE.NearestMipMapNearestFilter;
                        mesh.material.map.magFilter = THREE.LinearFilter;
                        mesh.material.map.anisotropy = maxAniso;
        
                    }
                }
            }
        }
    })
    

}

function LODHelper(Geometries){  //Function takes Geometries and returns an LOD 
   
    const newLOD = new THREE.LOD();

    for(let i = 0 ; i < Geometries.length;i++){

        newLOD.addLevel(Geometries[i],(i+1) * 150);

    }
    return newLOD;
}


const ArmIKSolvers = [];   //array to hold Inverse kinematic solvers

const loader = new GLTFLoader();
let MarketFull;
let Market50;
let Market10;
let Markets = [];
loader.load('/MarketStall/Market100.glb',function(gltf){    //creates market LODs

    MarketFull = gltf.scene;

    MarketFull.scale.setScalar(20);
    MarketFull.traverse(function(node){
        if (node instanceof THREE.Mesh){
            node.castShadow = true;
            node.recieveShadow = true;

            if (node.material.map){
                node.material.map.generateMipmaps = true;

            
            }

        }
    })
    Markets.push(MarketFull)

})

loader.load('/MarketStall/Market50.glb',function(gltf){

    Market50 = gltf.scene;

    Market50.scale.setScalar(20);
    Market50.traverse(function(node){
        
        if (node instanceof THREE.Mesh){
            node.recieveShadow = true;
            node.castShadow = true;
            if (node.material.map){
                node.material.map.generateMipmaps = true;
               
            
            }

        }
    })
    Markets.push(Market50)

})
loader.load('/MarketStall/Market10.glb',function(gltf){

    Market10 = gltf.scene;

    Market10.scale.setScalar(20);
    Market10.traverse(function(node){
        if (node instanceof THREE.Mesh){
            
            node.receiveShadow = true
            node.castShadow = true;

            node.material.map.generateMipmaps = true;
    
        }
    })
    Markets.push(Market10)
    
    const MarketLOD = LODHelper(Markets);
    
    MarketLOD.updateMatrix();
    for(let i=0; i < 6;i++){

        const tempMarket = MarketLOD.clone();
        const temp2Market = MarketLOD.clone()

        scene.add(tempMarket);
        scene.add(temp2Market)
        tempMarket.position.x = -450 +  i * 125;
        tempMarket.position.z = -300;
        temp2Market.position.x = -450 + i * 125;
        temp2Market.position.z = 300;
        temp2Market.rotation.y = Math.PI;
    }

})
let MarketHumans = [];
for(let i=0; i < 6;i++){

    const [MarketHuman,MarketHumanSolver] = CreatePeopleNew();
    const [MarketHuman2,MarketHumanSolver2] = CreatePeopleNew();
    
    
    scene.add(MarketHuman);
    scene.add(MarketHuman2);
    MarketHuman.position.x = -450 +  i * 125;
    MarketHuman.position.z = -315;
    MarketHuman.position.y = -72;
    MarketHuman2.position.x = -450 + i * 125;
    MarketHuman2.position.z = 315;
    MarketHuman2.position.y = -72;
    MarketHuman2.rotation.y = Math.PI;
    MarketHuman.getObjectByName('LeftArm').skeleton.bones[1].position.x -= 2;
    MarketHuman2.getObjectByName('LeftArm').skeleton.bones[1].position.x -= 2;
    MarketHumans.push(MarketHuman);
    MarketHumans.push(MarketHuman2);
    ArmIKSolvers.push(MarketHumanSolver);
    ArmIKSolvers.push(MarketHumanSolver2);
}

//Statue Placement
let NapoleonFull;
let Napoleon50;
let Napoleon10;
let Napoleons = [];
loader.load('/Statue/Napoleon.glb',function(gltf){

    NapoleonFull = gltf.scene;

    NapoleonFull.scale.setScalar(20);
    NapoleonFull.traverse(function(node){
        if (node instanceof THREE.Mesh){
            node.castShadow = true;
            node.receiveShadow = true
            if (node.material.map){
                node.material.map.generateMipmaps = true;
            
            }    
        }
    })
    
    Napoleons.push(NapoleonFull);

})
loader.load('/Statue/Napoleon50.glb',function(gltf){

    Napoleon50 = gltf.scene;

    
    Napoleon50.scale.setScalar(20);
    Napoleon50.traverse(function(node){
        if (node instanceof THREE.Mesh){
            node.receiveShadow = true;
            node.castShadow = true;
            if (node.material.map){
                node.material.map.generateMipmaps = true;
            
            }    
        }
    })
    
    Napoleons.push(Napoleon50);

})

loader.load('/Statue/Napoleon10.glb',function(gltf){

    Napoleon10 = gltf.scene;

    
    Napoleon10.scale.setScalar(20);
    Napoleon10.traverse(function(node){
        if (node instanceof THREE.Mesh){
            node.receiveShadow = true;
            node.castShadow = true;
            if (node.material.map){
                node.material.map.generateMipmaps = true;
            
            }    
        }
    })
    
    Napoleons.push(Napoleon10);
    const NapoleonLOD = LODHelper(Napoleons);
    
    NapoleonLOD.updateMatrix();
    NapoleonLOD.rotation.y = -Math.PI / 2;
    NapoleonLOD.scale.setScalar(0.05);
    const tempNapoleon = NapoleonLOD.clone();
    tempNapoleon.position.x = 350;
    
    scene.add(tempNapoleon);

})


let TowerFull;
let Tower50;
let Tower10;
let Towers = [];
loader.load('/Tower/Tower100.glb',function(gltf){

    TowerFull = gltf.scene;

    TowerFull.scale.setScalar(20);
    TowerFull.traverse(function(node){
        if (node instanceof THREE.Mesh){
            node.receiveShadow = true;
            node.castShadow = true;
            if (node.material.map){
                node.material.map.generateMipmaps = true;
            
            }    
        }
    })
    
    Towers.push(TowerFull);

})
loader.load('/Tower/Tower50.glb',function(gltf){

    Tower50 = gltf.scene;

    
    Tower50.scale.setScalar(20);
    Tower50.traverse(function(node){
        if (node instanceof THREE.Mesh){
            node.castShadow = true;
            node.receiveShadow = true;
            if (node.material.map){
                node.material.map.generateMipmaps = true;
            
            }    
        }
    })
    
    Towers.push(Tower50);

})
loader.load('/Tower/Tower50.glb',function(gltf){

    Tower10 = gltf.scene;

    
    Tower10.scale.setScalar(20);
    Tower10.traverse(function(node){
        if (node instanceof THREE.Mesh){
            node.receiveShadow = true;
            node.castShadow = true;
            if (node.material.map){
                node.material.map.generateMipmaps = true;
            
            }    
        }
    })
    
    Towers.push(Tower10);
   
    const TowerLOD = LODHelper(Towers);
    
    TowerLOD.updateMatrix();

    TowerLOD.scale.setScalar(0.9);
    TowerLOD.position.y = -15;
    TowerLOD.position.z = -430;
    TowerLOD.position.x = -30;
    TowerLOD.updateMatrix();
    scene.add(TowerLOD);

})
const [TowerHuman,TowerIKSolver] = CreatePeopleNew();
ArmIKSolvers.push(TowerIKSolver);
TowerHuman.position.y = 210;
TowerHuman.position.z = -390;
TowerHuman.position.x = -39;
TowerHuman.rotation.y = -Math.PI /12;
TowerHuman.scale.setScalar(1.4);
scene.add(TowerHuman);
let HouseFull;
let House50;
let House10;
let Houses = [];
let HouseLOD;
loader.load('HousesFinal/House100.glb',function(gltf){

    HouseFull = gltf.scene;
    HouseFull.scale.setScalar(1);
    HouseFull.traverse(function(node){
        if (node instanceof THREE.Mesh){
            node.receiveShadow = true;
            node.castShadow = true;
            if (node.material.map){
                node.material.map.generateMipmaps = true;
            
            }    
        }
    })
    
    Houses.push(HouseFull);

})

loader.load('HousesFinal/House100.glb',function(gltf){

    House50 = gltf.scene;

    
    House50.scale.setScalar(1);
    House50.traverse(function(node){
        if (node instanceof THREE.Mesh){
            node.receiveShadow = true;
            node.castShadow = true;
            if (node.material.map){
                node.material.map.generateMipmaps = true;
            
            }    
        }
    })
    
    Houses.push(House50);

})

loader.load('HousesFinal/House10.glb',function(gltf){

    House10 = gltf.scene;

    
    House10.scale.setScalar(1);
    House10.traverse(function(node){
        if (node instanceof THREE.Mesh){
            node.receiveShadow = true;
            node.castShadow = true;
            if (node.material.map){
                node.material.map.generateMipmaps = true;
            
            }    
        }
    })
    
    Houses.push(House10);

    HouseLOD = LODHelper(Houses);
    HouseLOD.updateMatrix();
    HouseLOD.scale.setScalar(0.25);
    HouseLOD.position.y = -15;
    
    for(let i=0; i < 10;i++){
        const TempHouse = HouseLOD.clone();
        const TempHouse2 = HouseLOD.clone();

        
        if(i != 4 && i != 5){

            TempHouse2.position.z = (-450);
            TempHouse2.position.x = (-450) + (i * 100);
            TempHouse2.rotation.y = -Math.PI / 2;
            scene.add(TempHouse2);
        };
        TempHouse.position.z = (450);
        TempHouse.position.x = (-450) + (i * 100);
        TempHouse.rotation.y = Math.PI/2;
        scene.add(TempHouse);}
    //scene.add(HouseLOD);
})




let TavernFull;
let Tavern50;
let Tavern10;
let TavernLOD;
let Taverns = [];
loader.load('/Tavern/Tavern100.glb', function( gltf ){
    TavernFull = gltf.scene;
    
    

    TavernFull.scale.setScalar(40);
    
    TavernFull.traverse( function( node ) {
        if ( node instanceof THREE.Mesh ) { 

            node.receiveShadow = true
            node.castShadow = true; } 
           
    
    } );

    Taverns.push(TavernFull);
});
loader.load('/Tavern/Tavern50.glb', function( gltf ){
    Tavern50 = gltf.scene;
    Tavern50.scale.setScalar(40);
    
    Tavern50.traverse( function( node ) {
        if ( node.isMesh ) { 

            node.receiveShadow = true
            node.castShadow = true; } 
            
    
    } );

    Taverns.push(Tavern50);
});
loader.load('/Tavern/Tavern10.glb', function( gltf ){
    Tavern10 = gltf.scene;
    
    
    
    
    Tavern10.scale.setScalar(40);
    
    Tavern10.traverse( function( node ) {

        if ( node instanceof THREE.Mesh ) { 
 
            node.receiveShadow = true
            node.castShadow = true; } 

    
    } );

    Taverns.push(Tavern10);
    TavernLOD = LODHelper(Taverns);
    TavernLOD.scale.setScalar(2.4);
    TavernLOD.rotation.y = Math.PI / 2;
    TavernLOD.updateMatrix();
    TavernLOD.position.x = -450;
    TavernLOD.position.z = 50;
    scene.add(TavernLOD);
});
//Lights
let LampFull;
let Lamp50;
let Lamp10;
let LampLOD;
let Lamps = [];
loader.load('/Lamps/LampFull.glb', function( gltf ){
    LampFull = gltf.scene;
    
    

    LampFull.scale.setScalar(40);
    
    LampFull.traverse( function( node ) {
        if ( node instanceof THREE.Mesh ) { 

            node.receiveShadow = true
            node.castShadow = true; } 
           
    
    } );

    Lamps.push(LampFull);
});

loader.load('/Lamps/Lamp50.glb', function( gltf ){
    Lamp50 = gltf.scene;
    
    

    Lamp50.scale.setScalar(40);
    
    Lamp50.traverse( function( node ) {
        if ( node instanceof THREE.Mesh ) { 

            node.receiveShadow = true
            node.castShadow = true; } 
           
    
    } );

    Lamps.push(Lamp50);
});

loader.load('/Lamps/Lamp10.glb', function( gltf ){
    Lamp10 = gltf.scene;
    
    

    Lamp10.scale.setScalar(40);
    
    Lamp10.traverse( function( node ) {
        if ( node instanceof THREE.Mesh ) { 

            node.receiveShadow = true
            node.castShadow = true; } 
           
    
    } );

    Lamps.push(Lamp10);
    
    LampLOD = LODHelper(Lamps);
    LampLOD.updateMatrix();
    LampLOD.scale.setScalar(0.5);
    LampLOD.position.y = 87;

    const SpotLight = new THREE.SpotLight(0x7b6c1e,1250);

    SpotLight.distance = 400;
    SpotLight.decay = 1;
    SpotLight.angle = 1.0471975511965976 * 1;
    SpotLight.penumbra = 1.5;
    SpotLight.castShadow = true;

    SpotLight.position.set(1,300,0);
    SpotLight.shadow.mapSize.width = 256;
    SpotLight.shadow.mapSize.height = 256;
    SpotLight.shadow.camera.near = 1;
    SpotLight.shadow.far = 200;
    SpotLight.shadow.focus = 1;
    const LightandLamp = new THREE.Group()
    

    for(let i=0; i < 6;i++){
        
        const TempLamp = LampLOD.clone();
        TempLamp.castShadow = true;
        TempLamp.recieveShadow= true;
        const TempSpotLight = SpotLight.clone();
        TempSpotLight.castShadow = true;
        TempSpotLight.distance = 400;
        TempSpotLight.decay = 1;
        TempSpotLight.angle = 1.0471975511965976 * 0.6;
        TempSpotLight.penumbra = 1.5;
        TempSpotLight.castShadow = true;
            
        TempSpotLight.position.set(-450 + i * 205,250,-300);
        TempSpotLight.shadow.mapSize.width = 256;
        TempSpotLight.shadow.mapSize.height = 256;
        TempSpotLight.shadow.camera.near = 1;
        TempSpotLight.shadow.far = 100;
        TempSpotLight.shadow.focus = 1;
        
        TempLamp.position.x = -450 +  i * 205;
        TempLamp.position.z = -250;

        scene.add(TempSpotLight);
        scene.add(TempLamp);
    }

});


//Add some walking humans !
const [human1,human1IK] = CreatePeopleNew();
const [human2,human2IK] = CreatePeopleNew();
ArmIKSolvers.push(human1IK);
ArmIKSolvers.push(human2IK);
human1.getObjectByName('LeftArm').skeleton.bones[0].position.z += 2;
human2.getObjectByName('LeftArm').skeleton.bones[0].position.z += 2;
scene.add(human1);
scene.add(human2);
human1.position.y = -72;
human1.position.z = -140;
human1.position.x = 450;
human1.rotation.y = Math.PI / 2;
human2.position.y = -72;
human2.position.z = -100;
human2.position.x = 450;
human2.rotation.y = Math.PI / 2;
const directionalLight = new THREE.DirectionalLight('gold', 0.75);
directionalLight.position.set(200,300,-150);

directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -700;
directionalLight.shadow.camera.right = 700;
directionalLight.shadow.camera.top = 700;
directionalLight.shadow.camera.bottom = -700;
directionalLight.shadow.camera.near = 5;
directionalLight.shadow.camera.far = 1000;
directionalLight.shadow.bias = -0.00035;
directionalLight.shadow.normalBias = 0.45;

scene.add(directionalLight);
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 'orange', 0.5);
scene.add(hemisphereLight);





function Dance(arm1,arm2,leg1,leg2,step){
    // 1min > of dancing accumulates errors reduce the period ?

    arm1.skeleton.bones[3].rotation.x = Math.sin(step) / 3;
    arm1.skeleton.bones[3].rotation.z = Math.sin(step);
    arm1.skeleton.bones[4].rotation.x = Math.sin(step) / 3;
    arm1.skeleton.bones[5].rotation.x = Math.sin(step) / 3;
    

    arm1.skeleton.bones[7].rotation.x = Math.sin(step % Math.PI) / 3;

    arm2.skeleton.bones[1].rotation.z = Math.sin(step) / 2;
    arm2.skeleton.bones[2].rotation.x = -Math.sin(step) / 3;
    arm2.skeleton.bones[3].rotation.x = -Math.sin(step) / 3;
    arm2.skeleton.bones[3].rotation.z = Math.sin(step);
    arm2.skeleton.bones[4].rotation.x = -Math.sin(step) / 3;
    arm2.skeleton.bones[5].rotation.x = -Math.sin(step) / 3;



}

var initial = 0



TowerHuman.getObjectByName('LeftArm').position.x -= 2


scene.add(skybox);
function animate(){
    requestAnimationFrame(animate);

    tick();

    scene.traverse(function( node ){
        if(node instanceof THREE.Mesh){
            UpdateFiltering(node);
        }
    })
    
    renderer.render(scene,camera);

    initial = (initial + 0.2);

    Dance(TowerHuman.getObjectByName('LeftArm'),TowerHuman.getObjectByName('RightArm'),'','',initial);
    animateWalking(human1.getObjectByName('LeftLeg'),human1.getObjectByName('RightLeg'),human1,30);
    animateWalking(human2.getObjectByName('LeftLeg'),human2.getObjectByName('RightLeg'),human2,30);
    Dance(human1.getObjectByName('LeftArm'),human1.getObjectByName('RightArm'),'','',initial);
    Dance(human2.getObjectByName('LeftArm'),human2.getObjectByName('RightArm'),'','',initial);


    for(let i = 0; i < MarketHumans.length;i++){
        Dance(MarketHumans[i].getObjectByName('LeftArm'),MarketHumans[i].getObjectByName('RightArm'),'','',initial);
    }
    for(let i = 0; i < ArmIKSolvers.length; i++){
        for(let j =0; j < ArmIKSolvers[i].length;j++){
            ArmIKSolvers[i][j].update();
        }
        
    }

    
}
animate()

