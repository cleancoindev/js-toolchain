/**
 * Main export for Webpack configuration builder helpers
 *
 * @package: Everledger JS Toolchain
 * @author:  pospi <sam@everledger.io>
 * @since:   2016-10-06
 * @flow
 */

// Setup a module system hook so that `npm link`ed modules can resolve their dependencies correctly
require('@pospi/appcore/hooks/node-setGlobalIncludePath')(module);

// Load in dependencies
const webpack = require('webpack');
const tap = require('webpack-partial/tap').default;
const { compose } = require('ramda');

// A debug helper for use in dependant projects when testing configs
const debug = tap((config) => {
  console.log('WEBPACK CONFIG:');
  console.log(require('util').inspect(config, { depth: null, colors: true }));
  console.log('');
  // process.exit();
});

// Load in low-level configuration components
const setOutputPath = require('./setOutputPath');
const addEntrypoints = require('./addEntrypoints');

const useBabel = require('./useBabel');
const makeBabelConfig = require('../babel/makeBabelConfig');
const setBabelFeatures = require('../babel/setBabelFeatures');
const addBabelPresets = require('../babel/addBabelPresets');
const addBabelPlugin = require('../babel/addBabelPlugin');

const devSourcemaps = require('./devSourcemaps');
const devUseHistoryAPI = require('./devUseHistoryAPI');
const devCSSLoaders = require('./devCSSLoaders');

const prodSourcemaps = require('./prodSourcemaps');
const prodCSSLoaders = require('./prodCSSLoaders');

// Compose them into most common higher-level configurations
const baseBabelConfig = [
  // JSX & ES7
  addBabelPresets(["es2015", "react", "stage-0"]),
  // Flowtype
  addBabelPlugin("transform-flow-strip-types"),
];

const baseDevConfig = compose(
  devSourcemaps,
  devUseHistoryAPI,
  devCSSLoaders,
  useBabel(makeBabelConfig(
    ...baseBabelConfig.concat([
      // enable caching while developing to speed up compilation
      setBabelFeatures({
        cacheDirectory: true,
      }),
      // auto-apply HMR functionality to React components
      addBabelPlugin("react-hot-loader/babel"),
      addBabelPlugin(["react-transform", {
        "transforms": [{
          "transform": "react-transform-hmr",
          "imports": ["react"], // :NOTE: if you use React Native, pass "react-native" instead
          "locals": ["module"], // :IMPORTANT:
        }, {
      // assist with React render() debugging
          "transform": "react-transform-catch-errors",
          "imports": [
            "react",  // :NOTE: if you use React Native, pass "react-native" instead
            "redbox-react", // React component to render error
          ],
        }],
      }]),
      // ES7 async / await runtime with extra stack trace info for debugging
      addBabelPlugin(["fast-async", {
        "env": {
          "asyncStackTrace": true,
        },
        "runtimePattern": "directive",  // requires "use runtime-nodent" at start of entrypoint file
      }]),
    ])
  )),
  // enable HMR functionality in the bulid
  addEntrypoints(['react-hot-loader/patch', 'webpack-hot-middleware/client'])
);

const baseProdConfig = compose(
  prodSourcemaps,
  prodCSSLoaders,
  useBabel(makeBabelConfig(
    ...baseBabelConfig.concat([
      // disable caching to ensure we always have the latest code being compiled, even in weird conditions
      setBabelFeatures({
        cacheDirectory: false,
      }),
      // ES7 async / await runtime, fastest mode (no detailed stack traces)
      addBabelPlugin(["fast-async", {
        "env": {
          "asyncStackTrace": true,
        },
        "runtimePattern": "directive",  // requires "use runtime-nodent" at start of entrypoint file
      }]),
    ])
  ))
);

// Export for use in dependant projects
module.exports = {
  webpack,
  compose,
  debug,

  setOutputPath,
  addEntrypoints,

  useBabel,
  makeBabelConfig,
  setBabelFeatures,
  addBabelPresets,
  addBabelPlugin,

  devSourcemaps,
  devUseHistoryAPI,
  devCSSLoaders,

  prodSourcemaps,
  prodCSSLoaders,

  baseDevConfig,
  baseProdConfig,
};