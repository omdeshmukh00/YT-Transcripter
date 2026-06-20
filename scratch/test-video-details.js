import { getVideoDetails } from '../lib/getVideoDetails.ts';

async function run() {
  const videoId = '0M8Ih6yigMo';
  console.log(`Fetching details for video ID: ${videoId}...`);
  try {
    const details = await getVideoDetails(videoId);
    console.log('Result details:', details);
  } catch (err) {
    console.error('Error fetching details:', err);
  }
}

run();
