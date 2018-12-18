#!/usr/bin/env node

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const s3 = require('s3');
const util = require('util');
const {
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
} = require('./helpers');

const readdir = util.promisify(fs.readdir);
const unlink = util.promisify(fs.unlink);
const writeFile = util.promisify(fs.writeFile);


// Main function for the whole script
async function main() {
  const data = await downloadGameData();
  const sheetData = await fetchGoogleSheetData();

  await clearGameData();
  writeGamesListData(data);
  writeGamesSingleData(data);
  createGamePages(data, sheetData);

  const skillData = await writeSkillsData(data);
  createSkillPages(skillData);
}


// Remove all the game data files
const clearGameData = async function() {
  const gamesDir = `${REPO_ROOT}/site/data/${GAMES_ROOT}`;
  return await clearDirectory(gamesDir);
}


// Create the games data file for the list page
const writeGamesListData = async function(data) {
  const { categories, games } = data;

  const result = grades.map(function(grade) {
    const gradeGames = games.filter(game => game.level.startsWith(grade));

    const gradeCategories = categories
      .map(function(category) {
        return {
          name: category,
          games: gradeGames
            .filter(game => game.category === category)
            .sort((a, b) => a.levelIndex - b.levelIndex)
            .map(game => _gameData(game))
        };
      })
      .filter(category => category.games.length > 0);

    return {
      grade: gradeLabels[grade],
      categories: gradeCategories
    };
  });

  const fileData = JSON.stringify(result, null, 4);
  return await writeFile(
    `${REPO_ROOT}/site/data/${GAMES_ROOT}/_index.json`, fileData
  );
}


// Create the games data files for the single pages
const writeGamesSingleData = async function(data) {
  const { games } = data;

  for (const game of games) {
    const fileData = JSON.stringify({'standards': game.standards}, null, 4);
    await writeFile(
      `${REPO_ROOT}/site/data/${GAMES_ROOT}/${slugify(game.title)}.json`,
      fileData
    );
  }
}


// Create the skills data file for the list page
const writeSkillsData = async function(data) {
  const { categories, games } = data;
  const result = categories
    .map(function(category) {
      return {
        category,
        games: games
          .filter(game => game.category === category)
          .sort((a, b) => a.levelIndex - b.levelIndex)
          .map(game => _gameData(game))
      };
    })
    .filter(category => category.games.length > 0);

  const fileData = JSON.stringify(result, null, 4);
  await writeFile(`${REPO_ROOT}/site/data/${SKILLS_ROOT}.json`, fileData);

  return result;
}


// Create the individual game pages
const createGamePages = async function(data, sheetData) {
  const { games } = data;
  const gamesDir = `${REPO_ROOT}/site/content/${GAMES_ROOT}`;

  // Remove all the game pages
  await clearDirectory(gamesDir);

  // Make the games list page
  const indexData = [
    '+++',
    'title = "Math Games | MathBRIX"',
    'description = "A complete list of every MathBRIX game"',
    `url = "/${GAMES_ROOT}"`,
    '+++'
  ].join('\n');
  await writeFile(`${gamesDir}/_index.md`, indexData);

  // Make the single game pages
  for (const game of games) {
    const rowData = sheetData.find(row => row.pageTitle === game.title);

    if (!rowData) {
      throw new Error(`No Google sheet entry found for ${game.title}`);
    }

    const data = [
      '+++',
      `title = "${rowData.serpTitle}"`,
      `pagetitle = "${game.title}"`,
      `description = "${rowData.serpDescription}"`,
      `pagedescription = "${rowData.pageDescription}"`,
      `slug = "${slugify(game.title)}"`,
      `url = "${getGameURL(game)}"`,
      `grade = "${getGrade(game)}"`,
      `category = "${game.category}"`,
      `gametype = "${game.game}"`,
      `subgametype = "${game.subgame}"`,
      '+++'
    ].join('\n');
    const path = `${gamesDir}/${slugify(game.title)}.md`;
    await writeFile(path, data);
  }
}

// Create the individual skill pages
const createSkillPages = async function(categoryData) {
  const skillsDir = `${REPO_ROOT}/site/content/${SKILLS_ROOT}`;

  // Remove all the skill pages
  await clearDirectory(skillsDir);

  // Make the skills list page
  const indexData = [
    '+++',
    'title = "Math Skills | MathBRIX"',
    'description = "A complete list of every math skill that MathBRIX teaches"',
    `url = "/${SKILLS_ROOT}"`,
    '+++'
  ].join('\n');
  await writeFile(`${skillsDir}/_index.md`, indexData);

  // Make the single skill pages
  for (const { category } of categoryData) {
    const data = [
      '+++',
      `title = "${category} | MathBRIX"`,
      `url = "/${SKILLS_ROOT}/${slugify(category)}"`,
      '+++'
    ].join('\n');
    const path = `${skillsDir}/${slugify(category)}.md`;
    await writeFile(path, data);
  }
}


const _gameData = function(game) {
  return {
    name: game.title,
    slug: slugify(game.title),
    url: getGameURL(game),
    image: slugify(game.subgame)
  };
}


main();
