#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const util = require('util');
const {
  GAMES_ROOT,
  REPO_ROOT,
  downloadGameData,
  getGameURL,
  getGrade,
  slugify
} = require('./helpers');

const writeFile = util.promisify(fs.writeFile);


const writeRedirects = async function() {
  let { games } = await downloadGameData();
  games = games.sort((a, b) => a.levelIndex - b.levelIndex);

  const redirects = Object.assign(
    {
      '/personalized-learning': '/',
      '/conceptual-math': '/',
      '/learning-analytics': '/',
      '/game-based-learning': '/',
      '/executive-functioning-skills': '/',
      '/minicomputer': '/',
      '/1st-grade/minicomputer-addition-up-to-100-carrying': '/games',
      '/login-options': 'https://help.mathbrix.com/article/6-login-options'
    },
    games.reduce(function(acc, cur) {
      acc[_getOldGameURL(cur)] = getGameURL(cur);
      return acc;
    }, {})
  );

  // Get max length of all old URLs
  const maxLen = Math.max(...Object.keys(redirects).map(url => url.length));

  const resultStr = Object.entries(redirects)
    .map(function([from, to]) {
      // Add space padding so that new URLs are visually aligned
      const lenDiff = maxLen - from.length;
      const padding = [...Array(lenDiff).keys()].reduce(acc => acc += ' ', ' ');
      return `${from}${padding} ${to}`;
    })
    .join('\n');

  writeFile(path.join(REPO_ROOT, '_redirects'), resultStr);
}

const _getOldGameURL = function(game) {
  const gradeSlug = slugify(getGrade(game));
  const gameSlug = slugify(game.game);
  const categorySlug = slugify(game.category);
  return `/${GAMES_ROOT}/${gradeSlug}/${categorySlug}/${gameSlug}`;
}

writeRedirects();
