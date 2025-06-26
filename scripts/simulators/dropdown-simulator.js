// Dropdown Simulator - Returns varying realistic values for dropdown selectors
// Usage: node dropdown-simulator.js <command-type> [options]

const crypto = require('crypto');

// Generate deterministic but varying results based on time and randomness
function getVariationSeed() {
  const now = Date.now();
  // Change results every 30 seconds for demo purposes, but make it deterministic within that window
  const timeWindow = Math.floor(now / 30000);
  return timeWindow;
}

// Generate realistic project IDs
function generateGcloudProjects() {
  const seed = getVariationSeed();
  const baseProjects = [
    'project-a-dev-abe5983f',
    'project-a-staging-2f4a8e1b',
    'project-a-prod-9c7d2a5e',
    'project-b-test-6b3f9e8c',
    'project-c-demo-4a7c2f1d'
  ];
  
  const additionalProjects = [
    'project-d-sandbox-1a2b3c4d',
    'project-e-backup-8e9f0a1b',
    'project-f-research-5c6d7e8f',
    'project-g-training-2g3h4i5j',
    'project-h-experimental-9k0l1m2n'
  ];
  
  // Vary the number of projects (3-7)
  const numProjects = 3 + (seed % 5);
  const allProjects = [...baseProjects, ...additionalProjects];
  
  // Always include the first few base projects, then add random ones
  const selectedProjects = baseProjects.slice(0, Math.min(3, numProjects));
  
  if (numProjects > 3) {
    // Add random additional projects
    const remaining = numProjects - 3;
    const shuffled = additionalProjects.sort(() => (seed % 3) - 1);
    selectedProjects.push(...shuffled.slice(0, remaining));
  }
  
  return selectedProjects;
}

// Generate realistic kubectl contexts
function generateKubectlContexts() {
  const seed = getVariationSeed();
  const baseContexts = [
    'gke_project-a-dev-abe5983f_us-central1_dev-cluster',
    'gke_project-a-staging-2f4a8e1b_us-east1_staging-cluster',
    'gke_project-a-prod-9c7d2a5e_us-west1_prod-cluster'
  ];
  
  const additionalContexts = [
    'minikube',
    'docker-desktop',
    'gke_project-b-test-6b3f9e8c_europe-west1_test-cluster',
    'kind-local-dev',
    'k3s-local-cluster'
  ];
  
  // Vary the number of contexts (2-6)
  const numContexts = 2 + (seed % 5);
  const allContexts = [...baseContexts, ...additionalContexts];
  
  // Always include the first base context, then add random ones
  const selectedContexts = [baseContexts[0]];
  
  if (numContexts > 1) {
    const remaining = numContexts - 1;
    const shuffled = [...baseContexts.slice(1), ...additionalContexts].sort(() => (seed % 3) - 1);
    selectedContexts.push(...shuffled.slice(0, remaining));
  }
  
  return selectedContexts;
}

// Generate realistic pod names
function generatePods(appLabel) {
  const seed = getVariationSeed();
  const baseNames = {
    'service-c-sub': [
      'service-c-sub-deployment-7c8d9e0f-abc12',
      'service-c-sub-deployment-7c8d9e0f-def34',
      'service-c-sub-deployment-7c8d9e0f-ghi56'
    ],
    'threat-intelligence-sub': [
      'threat-intelligence-sub-deployment-2a3b4c5d-xyz78',
      'threat-intelligence-sub-deployment-2a3b4c5d-uvw90',
      'threat-intelligence-sub-deployment-2a3b4c5d-rst12'
    ]
  };
  
  const extraSuffixes = ['789ab', 'cd0ef', '12345', '67890', 'fedcb'];
  
  const basePods = baseNames[appLabel] || [`${appLabel}-deployment-1a2b3c4d-pod01`];
  
  // Vary the number of pods (1-4)
  const numPods = 1 + (seed % 4);
  
  if (numPods <= basePods.length) {
    return basePods.slice(0, numPods);
  }
  
  // Generate additional pods
  const additionalPods = [];
  for (let i = basePods.length; i < numPods; i++) {
    const suffix = extraSuffixes[i % extraSuffixes.length];
    additionalPods.push(`${appLabel}-deployment-1a2b3c4d-${suffix}`);
  }
  
  return [...basePods, ...additionalPods];
}

// Main function to handle different command types
function simulateDropdownCommand(commandType, options = {}) {
  switch (commandType) {
    case 'gcloud-projects':
      return generateGcloudProjects();
    
    case 'kubectl-contexts':
      return generateKubectlContexts();
    
    case 'kubectl-pods-service-c-sub':
      return generatePods('service-c-sub');
    
    case 'kubectl-pods-threat-intelligence-sub':
      return generatePods('threat-intelligence-sub');
    
    default:
      // Try to auto-detect from full command
      if (commandType.includes('gcloud projects list')) {
        return generateGcloudProjects();
      } else if (commandType.includes('kubectl config get-contexts')) {
        return generateKubectlContexts();
      } else if (commandType.includes('kubectl') && commandType.includes('service-c-sub')) {
        return generatePods('service-c-sub');
      } else if (commandType.includes('kubectl') && commandType.includes('threat-intelligence-sub')) {
        return generatePods('threat-intelligence-sub');
      }
      
      return ['generic-item-1', 'generic-item-2', 'generic-item-3'];
  }
}

// Command line interface
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Dropdown Simulator - Generate varying realistic dropdown values

Usage: node dropdown-simulator.js <command-type> [options]

Command Types:
  gcloud-projects                    Generate GCP project IDs
  kubectl-contexts                   Generate Kubernetes contexts
  kubectl-pods-service-c-sub         Generate Service C Sub pods
  kubectl-pods-threat-intelligence-sub  Generate Threat Intelligence Sub pods
  "<full-command>"                   Auto-detect from full command string

Options:
  --help                            Show this help message
  --json                            Output as JSON array
  --count=<n>                       Limit number of results

Examples:
  node dropdown-simulator.js gcloud-projects
  node dropdown-simulator.js kubectl-contexts --json
  node dropdown-simulator.js "gcloud projects list --format=value(projectId)"
  node dropdown-simulator.js kubectl-pods-service-c-sub --count=2
    `);
    return;
  }
  
  const commandType = args[0];
  const isJson = args.includes('--json');
  const countArg = args.find(arg => arg.startsWith('--count='));
  const maxCount = countArg ? parseInt(countArg.split('=')[1]) : null;
  
  let results = simulateDropdownCommand(commandType);
  
  if (maxCount && maxCount > 0) {
    results = results.slice(0, maxCount);
  }
  
  if (isJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    // Output as lines (default format for dropdown parsing)
    results.forEach(result => console.log(result));
  }
}

if (require.main === module) {
  main();
}

module.exports = { simulateDropdownCommand }; 