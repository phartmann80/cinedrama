import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { dramasRouter } from "./dramas";
import { episodesRouter } from "./episodes";
import { userRouter } from "./user";
import { mediaRouter } from "./media";

const router: IRouter = Router();

router.use(healthRouter);

// CineDrama API v1
router.use("/v1/dramas", dramasRouter);
router.use("/v1/dramas/:id/episodes", episodesRouter);
router.use("/v1/user", userRouter);
// Media gateway — validates signed tokens before redirecting to private CDN paths
router.use("/v1/media", mediaRouter);

export default router;
