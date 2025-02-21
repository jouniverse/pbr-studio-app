var GEO_TYPES = ["box", "octahedron", "sphere", "torus"];

var uploadedTextures = {
  map: null, // base color
  normalMap: null,
  roughnessMap: null,
  metalnessMap: null,
  displacementMap: null, // height
  aoMap: null,
};

var renderer, objMaterial;
var repeatX = { value: 3 };
var repeatY = { value: 2 };
var scene, camera;
var gui;
var lightLeftParams = { color: "#FFE0B4" }; // hex for rgb(255, 220, 180)
var lightRightParams = { color: "#FFE0B4" };
var currentCubemapNumber = 1;
var reflectionCube;
var showBackground = true;
var envMapDisabled = false;

function init() {
  //  add cubemap to the scene
  scene = new THREE.Scene();
  gui = new dat.GUI();

  // Add geometry selection
  var geometryState = {
    type: "sphere", // Default geometry
  };

  //  dat.gui
  var folder0 = gui.addFolder("geometry");
  folder0
    .add(geometryState, "type", GEO_TYPES)
    .name("select geometry")
    .onChange(function (value) {
      // Remove existing object
      var oldObj = scene.getObjectByName("obj");
      scene.remove(oldObj);

      // Create new geometry with same material
      var newObj = getGeometry(value, 1, objMaterial);
      newObj.name = "obj";

      // Add to scene
      scene.add(newObj);
    });
  folder0
    .add({ value: 0 }, "value", 0, 2 * Math.PI)
    .name("obj rotation y")
    .onChange(function (value) {
      scene.rotation.y = value;
    });
  folder0
    .add({ value: 0 }, "value", 0, 2 * Math.PI)
    .name("obj rotation x")
    .onChange(function (value) {
      scene.rotation.x = value;
    });

  // initialize objects
  objMaterial = getMaterial("standard", "rgb(255, 255, 255)");

  var geoTypes = GEO_TYPES;

  var obj = getGeometry(geoTypes[2], 1, objMaterial);
  obj.name = "obj";

  // add lights
  var lightLeft = getSpotLight(1, "rgb(255, 220, 180)");
  var lightRight = getSpotLight(1, "rgb(255, 220, 180)");

  lightLeft.position.x = -2.7;
  lightLeft.position.y = 2;
  lightLeft.position.z = -1.8;
  lightLeft.intensity = 0.8;

  lightRight.position.x = 5;
  lightRight.position.y = 6.6;
  lightRight.position.z = -2.9;
  lightRight.intensity = 1;

  // camera
  camera = new THREE.PerspectiveCamera(
    45, // field of view
    window.innerWidth / window.innerHeight, // aspect ratio
    1, // near clipping plane
    1000 // far clipping plane
  );
  camera.position.z = 7;
  camera.position.x = -2;
  camera.position.y = 7;
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  // Add objects to scene
  scene.add(obj);
  scene.add(lightLeft);
  scene.add(lightRight);

  // load the cube map
  reflectionCube = loadCubemap(currentCubemapNumber);
  scene.background = reflectionCube;
  objMaterial.envMap = reflectionCube;

  // dat.gui
  var folder1 = gui.addFolder("lights");
  // light 1
  var light1 = folder1.addFolder("light 1");
  light1.add(lightLeft, "intensity", 0, 10);
  light1.add(lightLeft.position, "x", -15, 15);
  light1.add(lightLeft.position, "y", -15, 15);
  light1.add(lightLeft.position, "z", -15, 15);
  // Add color control for light 1
  light1
    .addColor(lightLeftParams, "color")
    .name("color")
    .onChange(function (value) {
      lightLeft.color.set(value);
    });
  // Add other controls for light 1
  var other1 = light1.addFolder("other");
  other1.add(lightLeft, "penumbra", 0, 1).name("penumbra");
  other1.add(lightLeft, "angle", 0, Math.PI / 2).name("angle");
  other1.add(lightLeft, "decay", 0, 2).name("decay");

  // light 2
  var light2 = folder1.addFolder("light 2");
  light2.add(lightRight, "intensity", 0, 10);
  light2.add(lightRight.position, "x", -15, 15);
  light2.add(lightRight.position, "y", -15, 15);
  light2.add(lightRight.position, "z", -15, 15);
  // Add color control for light 2
  light2
    .addColor(lightRightParams, "color")
    .name("color")
    .onChange(function (value) {
      lightRight.color.set(value);
    });
  // Add other controls for light 2
  var other2 = light2.addFolder("other");
  other2.add(lightRight, "penumbra", 0, 1).name("penumbra");
  other2.add(lightRight, "angle", 0, Math.PI / 2).name("angle");
  other2.add(lightRight, "decay", 0, 2).name("decay");

  var folder2 = gui.addFolder("texture");
  // Store repeat controls in guiControls
  window.guiControls = {
    repeatX: folder2
      .add(repeatX, "value", 0, 10)
      .name("repeat X")
      .onChange(function (value) {
        Object.keys(objMaterial).forEach(function (key) {
          if (objMaterial[key] && objMaterial[key].isTexture) {
            objMaterial[key].repeat.x = value;
          }
        });
      }),

    repeatY: folder2
      .add(repeatY, "value", 0, 10)
      .name("repeat Y")
      .onChange(function (value) {
        Object.keys(objMaterial).forEach(function (key) {
          if (objMaterial[key] && objMaterial[key].isTexture) {
            objMaterial[key].repeat.y = value;
          }
        });
      }),

    // ... rest of the controls
    bumpScale: folder2.add(objMaterial, "bumpScale", 0, 2),
    roughness: folder2.add(objMaterial, "roughness", 0, 1),
    metalness: folder2.add(objMaterial, "metalness", 0, 1),
    aoMapIntensity: folder2.add(objMaterial, "aoMapIntensity", 0, 1),
    displacementBias: folder2.add(objMaterial, "displacementBias", -0.1, 0.1),
    displacementScale: folder2.add(objMaterial, "displacementScale", -1, 1),
  };

  // Create normal subfolder and add controls
  var normalFolder = folder2.addFolder("normal");
  window.guiControls.normalScaleX = normalFolder
    .add(objMaterial.normalScale, "x", 0, 1)
    .name("x");
  window.guiControls.normalScaleY = normalFolder
    .add(objMaterial.normalScale, "y", 0, 1)
    .name("y");

  // Set initial material properties
  objMaterial.bumpScale = 1;
  objMaterial.normalScale.set(1, 1);
  objMaterial.displacementBias = 0;
  objMaterial.displacementScale = 0;
  objMaterial.aoMapIntensity = 0.5;
  objMaterial.roughness = 0.5;
  objMaterial.metalness = 0.5;

  // Update GUI to match initial values
  Object.values(window.guiControls).forEach((control) =>
    control.updateDisplay()
  );

  var folder3 = gui.addFolder("env map");
  // Add cubemap selector
  folder3
    .add({ cubemap: currentCubemapNumber }, "cubemap", {
      "Cubemap 1": 1,
      "Cubemap 2": 2,
      "Cubemap 3": 3,
      "Cubemap 4": 4,
      "Cubemap 5": 5,
      "Cubemap 6": 6,
      "Cubemap 7": 7,
      "Cubemap 8": 8,
      "Cubemap 9": 9,
      "Cubemap 10": 10,
    })
    .name("select cubemap")
    .onChange(function (value) {
      currentCubemapNumber = value;
      reflectionCube = loadCubemap(value);
      if (!envMapDisabled) {
        scene.background = showBackground ? reflectionCube : null;
        objMaterial.envMap = reflectionCube;
        objMaterial.needsUpdate = true;
      }
    });
  folder3.add(objMaterial, "envMapIntensity", 0, 10);

  // Add global enable/disable control
  folder3
    .add({ disabled: false }, "disabled")
    .name("disable env")
    .onChange(function (value) {
      envMapDisabled = value;
      if (value) {
        // Disable everything
        scene.background = null;
        objMaterial.envMap = null;
      } else {
        // Restore previous state
        scene.background = showBackground ? reflectionCube : null;
        objMaterial.envMap = reflectionCube;
      }
      objMaterial.needsUpdate = true;
    });

  // Add visibility control
  folder3
    .add({ visible: true }, "visible")
    .name("show env")
    .onChange(function (value) {
      showBackground = value;
      if (!envMapDisabled) {
        scene.background = value ? reflectionCube : null;
        objMaterial.needsUpdate = true;
      }
    });

  // Camera controls (now after camera is created)
  var folder4 = gui.addFolder("camera");
  folder4.add(camera.position, "x", -20, 20).name("position x");
  folder4.add(camera.position, "y", -20, 20).name("position y");
  folder4.add(camera.position, "z", -20, 20).name("position z");

  folder4
    .add(
      {
        reset: function () {
          camera.position.set(-2, 7, 7);
          camera.lookAt(new THREE.Vector3(0, 0, 0));
        },
      },
      "reset"
    )
    .name("reset camera");

  // renderer
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.getElementById("webgl").appendChild(renderer.domElement);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);

  // Add distance limits
  controls.minDistance = 2.6; // Prevents getting too close to the obj
  controls.maxDistance = 20; // Prevents getting too far from the obj

  update(renderer, scene, camera, controls);

  // Set up GitHub link placeholder
  document
    .getElementById("github-link")
    .addEventListener("click", function (e) {
      if (!this.href || this.href === "#") {
        e.preventDefault();
        alert("GitHub repository link will be available soon!");
      }
    });

  return scene;
}

function getMaterial(type, color) {
  var selectedMaterial;
  var materialOptions = {
    color: color === undefined ? "rgb(255, 255, 255)" : color,
  };

  switch (type) {
    case "basic":
      selectedMaterial = new THREE.MeshBasicMaterial(materialOptions);
      break;
    case "lambert":
      selectedMaterial = new THREE.MeshLambertMaterial(materialOptions);
      break;
    case "phong":
      selectedMaterial = new THREE.MeshPhongMaterial(materialOptions);
      break;
    case "standard":
      selectedMaterial = new THREE.MeshStandardMaterial(materialOptions);
      break;
    default:
      selectedMaterial = new THREE.MeshBasicMaterial(materialOptions);
      break;
  }

  return selectedMaterial;
}

function getGeometry(type, size, material) {
  var geometry;
  var segmentMultiplier = 2;

  switch (type) {
    case "box":
      geometry = new THREE.BoxGeometry(size, size, size);
      break;
    case "cone":
      geometry = new THREE.ConeGeometry(size, size, 256 * segmentMultiplier);
      break;
    case "cylinder":
      geometry = new THREE.CylinderGeometry(
        size,
        size,
        size,
        64 * segmentMultiplier
      );
      break;
    case "octahedron":
      geometry = new THREE.OctahedronGeometry(size);
      break;
    case "sphere":
      geometry = new THREE.SphereGeometry(
        size,
        64 * segmentMultiplier,
        64 * segmentMultiplier
      );
      break;
    case "tetrahedron":
      geometry = new THREE.TetrahedronGeometry(size);
      break;
    case "torus":
      geometry = new THREE.TorusGeometry(
        size / 2,
        size / 4,
        64 * segmentMultiplier,
        400 * segmentMultiplier
      );
      break;
    case "torusKnot":
      geometry = new THREE.TorusKnotGeometry(
        size / 2,
        size / 6,
        256 * segmentMultiplier,
        100 * segmentMultiplier
      );
      break;
    default:
      break;
  }

  var obj = new THREE.Mesh(geometry, material);
  obj.castShadow = true;
  obj.name = type;

  return obj;
}

function getSpotLight(intensity, color) {
  color = color === undefined ? "rgb(255, 220, 180)" : color;
  var light = new THREE.SpotLight(color, intensity);
  light.castShadow = true;

  // Set initial values for the new properties
  light.penumbra = 0.7; // Initial penumbra value
  light.angle = Math.PI / 4; // Initial angle (45 degrees)
  light.decay = 1; // Initial decay value

  //Set up shadow properties for the light
  light.shadow.mapSize.width = 2048; // default: 512
  light.shadow.mapSize.height = 2048; // default: 512
  light.shadow.bias = 0.001;

  return light;
}

function update(renderer, scene, camera, controls) {
  controls.update();
  renderer.render(scene, camera);

  requestAnimationFrame(function () {
    update(renderer, scene, camera, controls);
  });
}

function loadCubemap(number) {
  var path = "/assets/cubemap/cmap-" + number + "/";
  var format = ".png";
  var urls = [
    path + "px" + format,
    path + "nx" + format,
    path + "py" + format,
    path + "ny" + format,
    path + "pz" + format,
    path + "nz" + format,
  ];
  var reflectionCube = new THREE.CubeTextureLoader().load(urls);
  reflectionCube.format = THREE.RGBFormat;
  return reflectionCube;
}

function handleTextureUpload(file, textureType) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const loader = new THREE.TextureLoader();
      loader.load(
        e.target.result,
        function (texture) {
          uploadedTextures[textureType] = texture;
          resolve(texture);
        },
        undefined,
        reject
      );
    };
    reader.readAsDataURL(file);
  });
}

function applyTexturesToMaterial(material, textures) {
  // Reset all texture-related properties
  material.map = null;
  material.normalMap = null;
  material.roughnessMap = null;
  material.metalnessMap = null;
  material.displacementMap = null;
  material.aoMap = null;

  // Apply new textures
  Object.keys(textures).forEach((key) => {
    if (textures[key]) {
      material[key] = textures[key];
      // Apply wrapping and repeat settings
      material[key].wrapS = THREE.RepeatWrapping;
      material[key].wrapT = THREE.RepeatWrapping;
      material[key].repeat.set(repeatX.value, repeatY.value);
    }
  });

  material.needsUpdate = true;
}

function saveAsImage() {
  try {
    if (!renderer || !scene || !camera) {
      throw new Error("Renderer, scene, or camera not initialized");
    }
    renderer.render(scene, camera);
    const imageData = renderer.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "texture-render.png";
    link.href = imageData;
    link.click();
  } catch (error) {
    console.error("Error saving image:", error);
    alert("Error saving image. Please try again.");
  }
}

function clearTextures() {
  // Clear all file inputs and their spans
  const fileInputs = [
    "baseColorMap",
    "normalMap",
    "roughnessMap",
    "metallicMap",
    "heightMap",
    "aoMap",
  ];

  fileInputs.forEach((id) => {
    // Clear the file input value
    const input = document.getElementById(id);
    input.value = "";

    // Reset the span text
    const span = document.getElementById(`${id}-file-name`);
    if (span) {
      span.textContent = "No file selected";
    }
  });

  // Reset material textures
  objMaterial.map = null;
  objMaterial.bumpMap = null;
  objMaterial.normalMap = null;
  objMaterial.roughnessMap = null;
  objMaterial.metalnessMap = null;
  objMaterial.displacementMap = null;
  objMaterial.aoMap = null;

  // Reset uploaded textures object
  Object.keys(uploadedTextures).forEach((key) => {
    uploadedTextures[key] = null;
  });

  // Reset material properties to default
  objMaterial.color.setStyle("rgb(255, 255, 255)");
  objMaterial.bumpScale = 1;
  objMaterial.normalScale.set(1, 1);
  objMaterial.displacementBias = 0;
  objMaterial.displacementScale = 0;
  objMaterial.aoMapIntensity = 0.5;
  objMaterial.roughness = 0.5;
  objMaterial.metalness = 0.5;

  // Update GUI controls
  window.guiControls.bumpScale.updateDisplay();
  window.guiControls.roughness.updateDisplay();
  window.guiControls.metalness.updateDisplay();
  window.guiControls.aoMapIntensity.updateDisplay();
  window.guiControls.displacementBias.updateDisplay();
  window.guiControls.displacementScale.updateDisplay();
  window.guiControls.normalScaleX.updateDisplay();
  window.guiControls.normalScaleY.updateDisplay();

  objMaterial.needsUpdate = true;

  // Reset light colors to default
  lightLeftParams.color = "#FFE0B4";
  lightRightParams.color = "#FFE0B4";

  // Find and update the light color controls in GUI
  const lightsFolder = gui.__folders["lights"];
  if (lightsFolder) {
    const light1Folder = lightsFolder.__folders["light 1"];
    const light2Folder = lightsFolder.__folders["light 2"];

    // Get references to the lights
    const lightLeft = scene.children.find(
      (child) => child instanceof THREE.SpotLight && child.position.x < 0
    );
    const lightRight = scene.children.find(
      (child) => child instanceof THREE.SpotLight && child.position.x > 0
    );

    // Update actual light colors
    if (lightLeft) lightLeft.color.set(lightLeftParams.color);
    if (lightRight) lightRight.color.set(lightRightParams.color);

    // Update GUI
    const light1ColorControl = light1Folder.__controllers.find(
      (c) => c.property === "color"
    );
    const light2ColorControl = light2Folder.__controllers.find(
      (c) => c.property === "color"
    );

    if (light1ColorControl) light1ColorControl.updateDisplay();
    if (light2ColorControl) light2ColorControl.updateDisplay();
  }
}

function loadDefaultTextures(material) {
  // Clear all file inputs and their spans
  const fileInputs = [
    "baseColorMap",
    "normalMap",
    "roughnessMap",
    "metallicMap",
    "heightMap",
    "aoMap",
  ];

  fileInputs.forEach((id) => {
    // Clear the file input value
    const input = document.getElementById(id);
    input.value = "";

    // Reset the span text
    const span = document.getElementById(`${id}-file-name`);
    if (span) {
      span.textContent = "No file selected";
    }
  });

  const loader = new THREE.TextureLoader();
  const basePath = "/assets/textures/giants-causeway/giants_causeway_";

  try {
    // Set default material properties
    material.bumpScale = 1;
    material.normalScale.set(1, 1);
    material.displacementBias = 0;
    material.displacementScale = 0.1;
    material.aoMapIntensity = 0.5;
    material.roughness = 0.92;
    material.metalness = 0.01;

    // Set repeat values
    repeatX.value = 3;
    repeatY.value = 2;

    // Update GUI controls
    window.guiControls.repeatX.updateDisplay();
    window.guiControls.repeatY.updateDisplay();
    window.guiControls.bumpScale.updateDisplay();
    window.guiControls.roughness.updateDisplay();
    window.guiControls.metalness.updateDisplay();
    window.guiControls.aoMapIntensity.updateDisplay();
    window.guiControls.displacementBias.updateDisplay();
    window.guiControls.displacementScale.updateDisplay();
    window.guiControls.normalScaleX.updateDisplay();
    window.guiControls.normalScaleY.updateDisplay();

    // Load textures with proper file names
    material.map = loader.load(basePath + "basecolor.jpg");
    material.bumpMap = loader.load(basePath + "normal.jpg");
    material.normalMap = material.bumpMap;
    material.roughnessMap = loader.load(basePath + "roughness.jpg");
    material.displacementMap = loader.load(basePath + "height.jpg");
    material.metalnessMap = loader.load(basePath + "metallic.jpg");
    material.aoMap = loader.load(basePath + "ambientocclusion.jpg");

    // Apply texture settings
    const maps = [
      "map",
      "bumpMap",
      "normalMap",
      "roughnessMap",
      "metalnessMap",
      "displacementMap",
      "aoMap",
    ];
    maps.forEach((mapName) => {
      const texture = material[mapName];
      if (texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX.value, repeatY.value);
      }
    });

    material.needsUpdate = true;

    // Reset light colors to default
    lightLeftParams.color = "#FFE0B4";
    lightRightParams.color = "#FFE0B4";

    // Find and update the light color controls in GUI
    const lightsFolder = gui.__folders["lights"];
    if (lightsFolder) {
      const light1Folder = lightsFolder.__folders["light 1"];
      const light2Folder = lightsFolder.__folders["light 2"];

      // Get references to the lights
      const lightLeft = scene.children.find(
        (child) => child instanceof THREE.SpotLight && child.position.x < 0
      );
      const lightRight = scene.children.find(
        (child) => child instanceof THREE.SpotLight && child.position.x > 0
      );

      // Update actual light colors
      if (lightLeft) lightLeft.color.set(lightLeftParams.color);
      if (lightRight) lightRight.color.set(lightRightParams.color);

      // Update GUI
      const light1ColorControl = light1Folder.__controllers.find(
        (c) => c.property === "color"
      );
      const light2ColorControl = light2Folder.__controllers.find(
        (c) => c.property === "color"
      );

      if (light1ColorControl) light1ColorControl.updateDisplay();
      if (light2ColorControl) light2ColorControl.updateDisplay();
    }
  } catch (error) {
    console.error("Error loading default textures:", error);
    alert("Error loading default textures. Please check the file paths.");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  var scene = init();

  document
    .getElementById("applyTexture")
    .addEventListener("click", function () {
      const requiredMaps = [
        "baseColorMap",
        "normalMap",
        "roughnessMap",
        "metallicMap",
      ];
      const allRequired = requiredMaps.every(
        (mapId) => document.getElementById(mapId).files.length > 0
      );

      if (!allRequired) {
        alert("Please upload all required texture maps");
        return;
      }

      Promise.all([
        handleTextureUpload(
          document.getElementById("baseColorMap").files[0],
          "map"
        ),
        handleTextureUpload(
          document.getElementById("normalMap").files[0],
          "normalMap"
        ),
        handleTextureUpload(
          document.getElementById("roughnessMap").files[0],
          "roughnessMap"
        ),
        handleTextureUpload(
          document.getElementById("metallicMap").files[0],
          "metalnessMap"
        ),
        document.getElementById("heightMap").files[0]
          ? handleTextureUpload(
              document.getElementById("heightMap").files[0],
              "displacementMap"
            )
          : Promise.resolve(null),
        document.getElementById("aoMap").files[0]
          ? handleTextureUpload(
              document.getElementById("aoMap").files[0],
              "aoMap"
            )
          : Promise.resolve(null),
      ])
        .then(() => {
          applyTexturesToMaterial(objMaterial, uploadedTextures);
        })
        .catch((error) => {
          console.error("Error loading textures:", error);
          alert("Error loading textures. Please try again.");
        });
    });

  document.getElementById("useDefault").addEventListener("click", function () {
    loadDefaultTextures(objMaterial);
  });

  document.getElementById("render").addEventListener("click", saveAsImage);

  document
    .getElementById("toggle-panel")
    .addEventListener("click", function () {
      const panel = document.getElementById("texture-panel");
      panel.classList.toggle("visible");
    });

  document
    .getElementById("clearTextures")
    .addEventListener("click", function () {
      clearTextures();
    });
});
