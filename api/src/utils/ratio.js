import Progress from "../schema/progress";

export const getUserRatio = async (_id) => {
  // Use aggregate instead of find for better performance
  const [totals] = await Progress.aggregate([
    {
      $match: {
        userId: _id,
        infoHash: { $ne: null },
        peerId: { $ne: null }
      }
    },
    {
      $group: {
        _id: null,
        totalUp: { $sum: "$uploaded.total" },
        totalDown: { $sum: "$downloaded.total" }
      }
    }
  ]);

  const totalUp = totals?.totalUp ?? 0;
  const totalDown = totals?.totalDown ?? 0;

  return {
    up: totalUp,
    down: totalDown,
    ratio: totalDown === 0 ? -1 : Number((totalUp / totalDown).toFixed(2)),
  };
};
