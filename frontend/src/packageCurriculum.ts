import { request, idPath } from './api';
import { roadmapFromApi, type PackageRoadmap } from './packageRoadmap';
/** Package IDs are the source boundary; horse Training_Plans are never queried. */
export async function readPackageCurriculum(packageId:string):Promise<PackageRoadmap> {
  const raw=await request<any>('/training-packages/'+idPath(packageId)+'/roadmap-template');
  if(typeof raw?.title!=='string'||!raw.title.trim()||typeof raw.goal!=='string'||!raw.goal.trim())throw Error('The source curriculum is missing its title or goal.');
  const result=roadmapFromApi(raw);
  if(!result.stages.length)throw Error('No roadmap stages are configured for this package.');
  if(result.stages.some(s=>!Array.isArray(s.daysOfWeek)||s.daysOfWeek.some(d=>typeof d!=='string')||typeof s.activityName!=='string'||!Number.isFinite(s.startDay)||!Number.isFinite(s.endDay)))throw Error('The source curriculum contains incomplete stage data.');
  return result;
}
