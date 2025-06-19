// Known fallback/error messages for project and context selectors
const projectSelectorFallbacks = [
  'waiting for projects',
  'Error fetching projects',
  'No projects found',
  'Loading...',
  'Fetching...',
  'Electron API not available',
  '' // Empty string also means no project selected
];

// Known error messages from the backend for dropdown options
const backendErrorMessages = [
  'Error setting project',
  'Error fetching contexts',
  'No specific contexts found for this project',
  'No contexts found at all',
  'No contexts found for this project',
  'Loading contexts...',
  'Fetching contexts...',
  'Project ID required',
  'Timeout waiting for contexts'
];

module.exports = {
  projectSelectorFallbacks,
  backendErrorMessages
}; 