import { catchAsync } from "../utils/helpers.js";
import AppSuccess from "../middlewares/appSuccess.js";
import { getAnalytics as getAnalyticsService } from "../services/analyticsService.js";

export const getAnalytics = catchAsync(async (req, res) => {
  const analytics = await getAnalyticsService();

  return new AppSuccess(res, {
    message: "Analytics fetched successfully",
    data: analytics,
  });
});