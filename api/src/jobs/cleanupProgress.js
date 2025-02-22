import Progress from '../schema/progress';
import User from '../schema/user';

export const cleanupOldProgressRecords = async () => {
  try {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // First, aggregate total stats per user before cleanup
    const userTotals = await Progress.aggregate([
      {
        $match: {
          updatedAt: { $lt: cutoffDate },
          left: { $gt: 0 },
          infoHash: { $ne: null },
          peerId: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalUploaded: { $sum: '$uploaded.total' },
          totalDownloaded: { $sum: '$downloaded.total' }
        }
      }
    ]);

    // Update user stats
    for (const userTotal of userTotals) {
      await User.findByIdAndUpdate(userTotal._id, {
        $inc: {
          uploaded: userTotal.totalUploaded,
          downloaded: userTotal.totalDownloaded
        }
      });
    }

    // Delete old progress records
    const result = await Progress.deleteMany({
      updatedAt: { $lt: cutoffDate },
      left: { $gt: 0 },
      infoHash: { $ne: null },
      peerId: { $ne: null }
    });

    console.log(`[nx] Cleaned up ${result.deletedCount} inactive peer records`);

    // Add to cleanup function
    const duplicates = await Progress.aggregate([
      {
        $group: {
          _id: { userId: "$userId", infoHash: "$infoHash", peerId: "$peerId" },
          count: { $sum: 1 },
          docs: { $push: "$_id" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    for (const dup of duplicates) {
      // Keep the newest record, delete others
      const [keep, ...remove] = dup.docs;
      await Progress.deleteMany({ _id: { $in: remove } });
    }
  } catch (error) {
    console.error('[nx] Error cleaning up peer progress records:', error);
  }
}; 
