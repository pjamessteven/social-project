import { videos } from '../app/lib/videos';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface VideoSubmission {
  url: string;
  sex: 'm' | 'f';
}

async function submitVideo(video: VideoSubmission): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/videos/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(video),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Successfully submitted: ${video.url}`);
      return true;
    } else {
      console.error(`❌ Failed to submit ${video.url}: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Network error submitting ${video.url}:`, error);
    return false;
  }
}

async function migrateVideos() {
  console.log(`Starting migration of ${videos.length} videos...`);
  
  let successCount = 0;
  let failureCount = 0;

  for (const video of videos) {
    // Convert the video format to match API expectations
    const submission: VideoSubmission = {
      url: video.url,
      sex: video.type === 'M' ? 'm' : 'f',
    };

    const success = await submitVideo(submission);
    
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }

    // Add a small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📝 Total: ${videos.length}`);
}

// Run the migration
if (require.main === module) {
  migrateVideos().catch(console.error);
}

export { migrateVideos };
