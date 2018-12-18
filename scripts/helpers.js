const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const s3 = require('s3');
const { promisify } = require('util');
const credentials = require('../service-account.json');
const GoogleSpreadsheet = require('google-spreadsheet');

const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const writeFile = promisify(fs.writeFile);


const REPO_ROOT = '..';

const GAMES_ROOT = 'games';

const SKILLS_ROOT = 'skills';

const grades = ['Kindergarten', 'Grade 1', 'Grade 2'];

const gradeLabels = {
  'Kindergarten': 'Kindergarten',
  'Grade 1': '1st Grade',
  'Grade 2': '2nd Grade'
};

const result = dotenv.config({
  path: path.join(REPO_ROOT, '.env')
});

if (result.error) {
  throw result.error;
}


const downloadGameData = function() {
  return new Promise(function(resolve) {
    const client = s3.createClient({
      s3Options: {
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
        region: 'us-west-2'
      }
    });

    client.downloadBuffer({
      Bucket: 'mathbrix-assets',
      Key: 'brochure-site-games.json'
    }).on('end', function(buffer) {
      const data = JSON.parse(buffer.toString());
      resolve(data);
    });
  });
}

const fetchGoogleSheetData = async function() {
  const spreadsheetId = '1F3IVapbgEfLYPSQI0Y5d0ncDlE0lUj2NmfHlwreKdHs';
  const sheet = new GoogleSpreadsheet(spreadsheetId);
  await promisify(sheet.useServiceAccountAuth)(credentials);
  // This is the tab number of the sheet we want, indexed starting at 1.
  // Ensure that this sheet does not get reordered in Google Sheets.
  const worksheetId = 1;
  const rows = await promisify(sheet.getRows)(worksheetId);
  return rows
    .filter(row => row.number !== '')
    .map(function(row) {
      return {
        pageTitle: row.longtitleforweb,
        serpTitle: row.fullserptitle,
        pageDescription: row['on-pagedescription'],
        serpDescription: row.metadescriptionforserp
      };
    });
}

const getGameURL = function(game) {
  const gradeSlug = slugify(getGrade(game));
  const gameSlug = slugify(game.title);
  return `/${gradeSlug}/${gameSlug}`;
}

const getGrade = function(game) {
  const grade = grades.find(g => game.level.startsWith(g));
  return gradeLabels[grade];
}

const slugify = function(val) {
  return val
    .replace(/[\s_,:\(\)]/g, '-')
    .replace(/[']/g, '')
    .replace(/--/g, '-')
    .replace(/-$/g, '')
    .toLowerCase();
}

const clearDirectory = async function(dir) {
  const files = await readdir(dir);
  return await Promise.all(
    files.map(f => unlink(path.join(dir, f)))
  );
}


Object.assign(exports, {
  GAMES_ROOT,
  REPO_ROOT,
  SKILLS_ROOT,
  grades,
  gradeLabels,
  clearDirectory,
  downloadGameData,
  fetchGoogleSheetData,
  getGameURL,
  getGrade,
  slugify
});
