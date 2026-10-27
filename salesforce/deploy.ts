// Deploys the custom objects and assigns the Migration_QA permission set to the logged-in user.
import { sf } from './sf';

const deploy = sf<{ status: string; numberComponentsDeployed: number; numberComponentsTotal: number }>([
  'project', 'deploy', 'start', '--source-dir', 'force-app', '--wait', '10',
]);
console.log(`Deploy ${deploy.status}: ${deploy.numberComponentsDeployed}/${deploy.numberComponentsTotal} components`);

try {
  sf(['org', 'assign', 'permset', '--name', 'Migration_QA']);
  console.log('Permission set Migration_QA assigned');
} catch (error) {
  // Re-running the deploy is fine; the assignment already exists.
  if (!String(error).includes('Duplicate')) throw error;
  console.log('Permission set Migration_QA already assigned');
}
