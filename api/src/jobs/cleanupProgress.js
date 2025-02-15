import Progress from '../schema/progress';
import User from '../schema/user';

export const cleanupOldProgressRecords = async () => {
  try {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // First, get all progress records that will be cleaned up
    const oldRecords = await Progress.find({
      lastSeen: { $lt: cutoffDate },
      $or: [
        { 'uploaded.session': 0 },
        { 'downloaded.session': 0 }
      ]
    });

    // Group by user and update their total stats before deletion
    const userStats = {};
    oldRecords.forEach(record => {
      if (!userStats[record.userId]) {
        userStats[record.userId] = {
          uploaded: 0,
          downloaded: 0
        };
      }
      userStats[record.userId].uploaded += record.uploaded?.total || 0;
      userStats[record.userId].downloaded += record.downloaded?.total || 0;
    });

    // Update user stats if needed
    for (const [userId, stats] of Object.entries(userStats)) {
      await User.findByIdAndUpdate(userId, {
        $inc: {
          uploaded: stats.uploaded,
          downloaded: stats.downloaded
        }
      });
    }

    // Now safe to delete old records
    const result = await Progress.deleteMany({
      lastSeen: { $lt: cutoffDate },
      $or: [
        { 'uploaded.session': 0 },
        { 'downloaded.session': 0 }
      ]
    });

    console.log(`[sq] Cleaned up ${result.deletedCount} inactive peer records while preserving all user stats and ratios`);
  } catch (error) {
    console.error('[sq] Error cleaning up peer progress records:', error);
  }
}; 