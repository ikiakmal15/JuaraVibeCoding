const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'padel.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Database deleted successfully');
} else {
  console.log('No database to delete');
}
