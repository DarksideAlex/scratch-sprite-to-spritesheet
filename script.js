const fileInput = document.getElementById('spriteUpload');
const generateButton = document.getElementById('generateSpritesheet');
const canvas = document.getElementById('spritesheetCanvas');
const ctx = canvas.getContext('2d');
const downloadLink = document.getElementById('downloadLink');
const rowInput = document.querySelector("#rowNumber");
const rowSlider = document.querySelector("#rowSlider");
const spaceInput = document.querySelector("#spaceNumber");
const spaceSlider = document.querySelector("#spaceSlider");

rowSlider.onchange = (e) => {
  rowInput.value = rowSlider.value;
};
rowInput.onchange = (e) => {
  rowSlider.value = Math.max(rowSlider.min, Math.min(rowInput.value, rowSlider.max));
  rowInput.value = rowSlider.value;
};

rowSlider.ontouchmove = rowSlider.onchange;
rowSlider.onmousemove = rowSlider.onchange;

spaceSlider.onchange = (e) => {
  spaceInput.value = spaceSlider.value;
};
spaceInput.onchange = (e) => {
  spaceSlider.value = Math.max(spaceSlider.min, Math.min(spaceInput.value, 999999999));
  spaceInput.value = spaceSlider.value;
};

spaceSlider.ontouchmove = spaceSlider.onchange;
spaceSlider.onmousemove = spaceSlider.onchange;

let spriteJson = null;
let imagesMap = new Map();


const scaleUp = (num) => Math.ceil(num) + Math.sign(num) * spaceInput.value;

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file && file.name.endsWith('.sprite3')) {
    document.querySelector("#lFile").innerHTML = "Processing: " + file.name;
    document.querySelector("#lFile").style.background = "linear-gradient(45deg, #f39c12, #f1c40f)";

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      // Extract `sprite.json`
      const jsonFile = Object.keys(zipContent.files).find(name => name.endsWith('sprite.json'));
      if (!jsonFile) throw new Error("Missing sprite.json in the .sprite3 file.");
      const spriteJsonContent = await zipContent.file(jsonFile).async('string');
      spriteJson = JSON.parse(spriteJsonContent);

      // Extract images
      imagesMap.clear();
      const imageFiles = Object.keys(zipContent.files).filter(name => /\.(png)$/i.test(name));
      for (const imageFile of imageFiles) {
        const blob = await zipContent.file(imageFile).async('blob');
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onload = () => {
          imagesMap.set(imageFile, img);
        }
      }

      document.querySelector("#lFile").innerHTML = `Loaded: ${file.name} (${imageFiles.length} images)`;
      document.querySelector("#lFile").style.width = "calc-size(auto)";
      document.querySelector("#lFile").style.height = "4vh";
      document.querySelector("#lFile").style.padding = "0vh 2vw";
      document.querySelector("#lFile").style.color = "white";
      document.querySelector("#lFile").style.border = "0.4vh solid black";
      document.querySelector("#lFile").style.background = "linear-gradient(45deg, #56ab2f, #a8e063)";
      rowSlider.max = imageFiles.length;
      rowSlider.value = rowSlider.max;
      rowSlider.onchange();
      generateButton.classList = "";
    } catch (error) {
      document.querySelector("#lFile").innerHTML = "Error: " + error.message;
      document.querySelector("#lFile").style.color = "white";
      document.querySelector("#lFile").style.background = "linear-gradient(45deg, #e74c3c, #c0392b)";
      document.querySelector("#lFile").style.width = "calc-size(auto)";
      document.querySelector("#lFile").style.height = "4vh";
      document.querySelector("#lFile").style.padding = "0vh 2vw";
      document.querySelector("#lFile").style.border = "0.4vh solid black";
      alert("Error processing sprite: " + error.message);
      console.log("Error processing sprite: " + error.message);
    }
  } else {
    document.querySelector("#lFile").innerHTML = "Not a sprite!";
    document.querySelector("#lFile").style.color = "white";
    document.querySelector("#lFile").style.border = "0.4vh solid black";
    document.querySelector("#lFile").style.width = "calc-size(auto)";
    document.querySelector("#lFile").style.height = "4vh";
    document.querySelector("#lFile").style.padding = "0vh 2vw";
    document.querySelector("#lFile").style.background = "linear-gradient(45deg, #dd4433, #881100)";
  }
});

// Generate spritesheet
generateButton.addEventListener('click', () => {
  if (!spriteJson || imagesMap.size === 0) {
    alert('Please upload a .sprite3 file containing both sprite JSON and costume images.');
    return;
  }

  const imgsPerRow = rowInput.value;
  const costumes = spriteJson.costumes;

  let maxWidth = 0;
  let maxHeight = 0;

  // Calculate max dimensions
  const imagesData = costumes.map(costume => {
    const img = imagesMap.get(costume.md5ext);
    if (!img) {
      alert(`Costume ${costume.md5ext} not found. Perhaps it was a vector costume?`);
      return null;
    } else {
      const offsetX = Math.max(costume.rotationCenterX, img.width - costume.rotationCenterX);
      const offsetY = Math.max(costume.rotationCenterY, img.height - costume.rotationCenterY);

      const imgWidthTotal = 2 * offsetX;
      const imgHeightTotal = 2 * offsetY;
      maxWidth = Math.max(maxWidth, imgWidthTotal);
      maxHeight = Math.max(maxHeight, imgHeightTotal);
      return {
        img: img,
        scaledWidth: img.width,
        scaledHeight: img.height,
        rotationCenterX: costume.rotationCenterX,
        rotationCenterY: costume.rotationCenterY
      };
    }
  }).filter(costume => costume != null);

  const fixedWidth = scaleUp(maxWidth);
  const fixedHeight = scaleUp(maxHeight);

  canvas.width = fixedWidth * imgsPerRow;
  canvas.height = fixedHeight * Math.ceil(imagesData.length / imgsPerRow);

  ctx.imageSmoothingEnabled = false;
  canvas.style.imageRendering = 'pixelated';

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let xOffset = 0;
  let yOffset = 0;
  imagesData.forEach(({ img, scaledWidth, scaledHeight, rotationCenterX, rotationCenterY }) => {
    if (img) {
      const offsetX = xOffset + (fixedWidth / 2 - rotationCenterX);
      const offsetY = yOffset + (fixedHeight / 2 - rotationCenterY);

      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      xOffset += fixedWidth;
      if (xOffset >= canvas.width) {
        xOffset = 0;
        yOffset += fixedHeight;
      }
    }
  });

  // Generate download link
  canvas.toBlob(blob => {
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'spritesheet.png';
    downloadLink.style.display = 'block';
    downloadLink.textContent = 'Download Spritesheet';
    downloadLink.classList = "";
  }, 'image/png');
});