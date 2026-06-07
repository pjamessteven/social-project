import fs from 'fs';
import path from 'path';

const messagesDir = path.join(process.cwd(), 'messages');
const files = fs.readdirSync(messagesDir).filter(f => f.endsWith('.json') && f !== 'fr.bak.json');

// Restore resources key in all locale files
files.forEach(file => {
  const filePath = path.join(messagesDir, file);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!content.header || !content.header.navigation) return;
  
  const nav = content.header.navigation;
  
  // Restore resources if missing
  if (!nav.resources) {
    nav.resources = "Resources";
  }
  
  // Remove the standalone nav keys that are now inside Resources dropdown
  delete nav.videos;
  delete nav.studies;
  delete nav.support;
  
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  console.log(`Updated ${file}`);
});

console.log('Done!');
