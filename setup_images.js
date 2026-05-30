const fs = require('fs');
const path = require('path');

const destDir = path.join(__dirname, 'backend', 'uploads', 'courts');
fs.mkdirSync(destDir, { recursive: true });

const srcDir = 'C:\\Users\\MyBook Hype AMD\\.gemini\\antigravity\\brain\\3dded6a1-b932-456a-87de-1df5ecba196f';

const files = {
  'court_indoor_1_1779249079283.png': 'court1.png',
  'court_outdoor_1_1779249096824.png': 'court2.png',
  'court_stadium_1779249114921.png': 'court3.png',
  'court_garden_1779249133195.png': 'court4.png',
  'court_city_1779249148535.png': 'court5.png',
  'court_beach_1779249163895.png': 'court6.png',
};

for (const [src, dest] of Object.entries(files)) {
  const srcPath = path.join(srcDir, src);
  const destPath = path.join(destDir, dest);
  try {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${src} -> ${dest}`);
  } catch (e) {
    console.error(`Failed to copy ${src}: ${e.message}`);
  }
}
console.log('Done!');
