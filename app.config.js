// Lets the web build be served from a sub-path such as GitHub Pages' /expense-tracker.
// EXPO_BASE_URL is only set by the deploy workflow, so local development is unaffected.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL ?? '',
  },
});
