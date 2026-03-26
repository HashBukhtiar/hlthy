// Aggregate exports so bare 'features/...' imports resolve during bundling.
// Merge firestore infra and auth ui exports.
try {
  const infra = require('./infra/firestore');
  const authUi = require('./auth/ui/useSession');
  module.exports = Object.assign({}, infra, authUi);
} catch (e) {
  // If requiring .ts files directly fails in some environments, export empty object
  // Metro/Babel should handle .ts imports in normal dev runs.
  module.exports = {};
}
