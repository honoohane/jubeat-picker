const fs = require('fs');
const path = require('path');
const csvPath = path.join(__dirname, '..', 'jubeat_list', 'output', 'jubeat_list.csv');
console.log('Reading CSV from:', csvPath);
const csv = fs.readFileSync(csvPath, 'utf-8');
const lines = csv.trim().split('\n');
console.log('Total lines:', lines.length);

const songs = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  // Skip duplicate header lines
  if (line.startsWith('"title"')) continue;
  
  // Parse CSV properly handling escaped quotes ("" -> ")
  // Split by "," but handle escaped quotes
  const fields = [];
  let field = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const nextChar = line[j + 1];
    
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        // Escaped quote
        field += '"';
        j++; // Skip next quote
      } else {
        // End of quoted field
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field); // Last field
  
  if (fields.length < 6) continue;
  
  let [title, artist, bpm, bsc, adv, ext] = fields;
  
  // Check for [2] chart marker - keep original title
  let chart = 1;
  if (title.endsWith('[2]')) {
    chart = 2;
    // Keep [2] in title as-is
  }
  
  // Parse levels
  const bscLevel = parseFloat(bsc);
  const advLevel = parseFloat(adv);
  const extLevel = parseFloat(ext);
  
  if (!isNaN(bscLevel)) {
    songs.push({ title, artist, difficulty: 'BSC', level: bscLevel, chart });
  }
  if (!isNaN(advLevel)) {
    songs.push({ title, artist, difficulty: 'ADV', level: advLevel, chart });
  }
  if (!isNaN(extLevel)) {
    songs.push({ title, artist, difficulty: 'EXT', level: extLevel, chart });
  }
}

// Generate JS file content
let jsContent = `// jubeat All Songs - BSC/ADV/EXT difficulties with chart version
// Total: ${songs.length} entries (${Math.round(songs.length/3)} songs × 3 difficulties)
export const allJubeatSongs = [
`;

songs.forEach((song, index) => {
  const escapedTitle = song.title.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const escapedArtist = song.artist.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  jsContent += `  { title: '${escapedTitle}', artist: '${escapedArtist}', difficulty: '${song.difficulty}', level: ${song.level}, chart: ${song.chart} }`;
  if (index < songs.length - 1) {
    jsContent += ',\n';
  } else {
    jsContent += '\n';
  }
});

jsContent += '];\n';

fs.writeFileSync('src/data/songs.js', jsContent, 'utf-8');
console.log('Generated songs.js with ' + songs.length + ' entries');
